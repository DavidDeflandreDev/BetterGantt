/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState, type ChangeEvent, type MouseEvent } from 'react';
import { Task, Resource, ProjectStats, SavedProject } from '../types';
import { parseDate, addDays, calculateCPM, autoScheduleTasks, differenceInDays, formatDate } from '../utils/cpm';
import { parseGanttXml } from '../components/GanttParser';
import { computeMonthLabels, computeYearLabels, computeScreenDateRange } from '../utils/timeline';
import { computeDepthMap, buildHierarchicalOrder, countHiddenByCollapse, isSameOrDescendantOf, reorderTask, ReorderTarget } from '../utils/taskHierarchy';
import { assignMilestoneColors } from '../utils/milestoneColors';
import { TimelineZoom, ZOOM_DAY_WIDTH, suggestZoomForSpan } from '../components/timeline/constants';

export const DEFAULT_TASKS: Task[] = [
  { id: 't1', name: 'Études et spécifications', startDate: '2026-06-15', duration: 4, progress: 90, dependencies: [], resourceId: 'r1', color: 'indigo', type: 'task', isFolder: false, selected: true },
  { id: 't2', name: 'Maquettage & Design UI', startDate: '2026-06-18', duration: 3, progress: 60, dependencies: ['t1'], resourceId: 'r3', color: 'pink', type: 'task', isFolder: false, selected: true },
  { id: 't3', name: 'Modélisation base de données', startDate: '2026-06-19', duration: 3, progress: 20, dependencies: ['t1'], resourceId: 'r1', color: 'blue', type: 'task', isFolder: false, selected: true },
  { id: 't4', name: 'Développement API Backend', startDate: '2026-06-22', duration: 6, progress: 0, dependencies: ['t3'], resourceId: 'r2', color: 'amber', type: 'task', isFolder: false, selected: true },
  { id: 't5', name: 'Développement Frontend Web', startDate: '2026-06-23', duration: 6, progress: 0, dependencies: ['t2', 't3'], resourceId: 'r3', color: 'emerald', type: 'task', isFolder: false, selected: true },
  { id: 't6', name: 'Intégration & Tests QA', startDate: '2026-06-29', duration: 3, progress: 0, dependencies: ['t4', 't5'], resourceId: 'r2', color: 'violet', type: 'task', isFolder: false, selected: true },
  { id: 't7', name: 'Jalon : Livrable Version Bêta', startDate: '2026-07-02', duration: 1, progress: 0, dependencies: ['t6'], resourceId: 'r1', color: 'rose', type: 'milestone', isFolder: false, selected: true },
  { id: 't8', name: 'Campagne SEO & Marketing', startDate: '2026-07-03', duration: 4, progress: 0, dependencies: ['t7'], resourceId: 'r4', color: 'cyan', type: 'task', isFolder: false, selected: true },
];

export const DEFAULT_RESOURCES: Resource[] = [
  { id: 'r1', name: 'Alice (Architecte)', avatarColor: 'bg-indigo-500', role: 'Directrice Technique' },
  { id: 'r2', name: 'Bob (Développeur)', avatarColor: 'bg-blue-500', role: 'Dev Backend' },
  { id: 'r3', name: 'Charlie (Designer)', avatarColor: 'bg-pink-500', role: 'Designer UI/UX' },
  { id: 'r4', name: 'David (Marketing)', avatarColor: 'bg-amber-500', role: 'Responsable Croissance' },
];

/** Above this many tasks, importing a file pauses to ask the user for zoom/collapse presets first. */
const HEAVY_IMPORT_TASK_THRESHOLD = 150;

export interface NewTaskInput {
  name: string;
  startDate: string;
  duration: number;
  resourceId?: string;
  color: string;
  type: 'task' | 'milestone';
}

export interface NewResourceInput {
  name: string;
  role: string;
}

export interface PendingImportStats {
  totalTasks: number;
  milestoneCount: number;
  folderCount: number;
  startLabel: string;
  endLabel: string;
  spanDays: number;
}

export interface PendingImport {
  name: string;
  tasks: Task[];
  resources: Resource[];
  stats: PendingImportStats;
}

/** Builds the set of folder ids that should start collapsed for a given "collapse after depth N" preset. */
function computeCollapseIdsForDepth(tasks: Task[], depth: number): Set<string> {
  const depthById = computeDepthMap(tasks);
  const result = new Set<string>();
  tasks.forEach(t => {
    if (t.isFolder && (depthById.get(t.id) ?? 0) >= depth) result.add(t.id);
  });
  return result;
}

/**
 * Owns every piece of state that represents "the project": tasks, resources,
 * project metadata, derived scheduling data (CPM, stats, timeline dates), and
 * all the handlers that mutate them. UI-only state that is genuinely local to
 * a single component (form fields, modal open/close) is intentionally kept
 * out of this hook. Selection/zoom/collapse state lives here because it is
 * shared and kept in sync across several sibling components (sheet column,
 * timeline bars, dependency arrows, milestones panel).
 */
export function useGanttData() {
  const [importedProjectsList, setImportedProjectsList] = useState<SavedProject[]>(() => {
    const saved = localStorage.getItem('gantt_saved_projects');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeProjectName, setActiveProjectName] = useState<string>(() => {
    return localStorage.getItem('gantt_active_project_name') || 'Projet Démo BetterGantt';
  });
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('gantt_tasks');
    return saved ? JSON.parse(saved) : DEFAULT_TASKS;
  });
  const [resources, setResources] = useState<Resource[]>(() => {
    const saved = localStorage.getItem('gantt_resources');
    return saved ? JSON.parse(saved) : DEFAULT_RESOURCES;
  });

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [highlightCriticalPath, setHighlightCriticalPath] = useState<boolean>(false);
  const [filterResourceId, setFilterResourceId] = useState<string>('all');
  const [displayLimit, setDisplayLimit] = useState<number>(30);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Adaptive zoom: how many pixels represent one day of the project timeline.
  const [zoom, setZoom] = useState<TimelineZoom>(() => {
    const saved = localStorage.getItem('gantt_tasks');
    const initialTasks: Task[] = saved ? JSON.parse(saved) : DEFAULT_TASKS;
    return suggestZoomForSpan(computeScreenDateRange(initialTasks).length);
  });

  // Collapsed folders hide their descendant rows from the on-screen timeline only (exports are unaffected).
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<string>>(new Set());

  // When an import is too heavy to commit blindly, we stash it here and ask the user for presets first.
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('gantt_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('gantt_resources', JSON.stringify(resources));
  }, [resources]);

  useEffect(() => {
    localStorage.setItem('gantt_saved_projects', JSON.stringify(importedProjectsList));
  }, [importedProjectsList]);

  useEffect(() => {
    localStorage.setItem('gantt_active_project_name', activeProjectName);
  }, [activeProjectName]);

  const cpmResults = useMemo(() => calculateCPM(tasks), [tasks]);

  const stats = useMemo((): ProjectStats => {
    if (tasks.length === 0) {
      return { totalTasks: 0, completedTasks: 0, criticalTasksCount: 0, totalDurationDays: 0, averageProgress: 0 };
    }

    const completed = tasks.filter(t => t.progress === 100).length;
    let criticalCount = 0;
    cpmResults.forEach(res => {
      if (res.isCritical) criticalCount++;
    });

    let minStart = parseDate(tasks[0].startDate);
    let maxEnd = addDays(parseDate(tasks[0].startDate), tasks[0].duration);
    tasks.forEach(t => {
      const start = parseDate(t.startDate);
      const end = addDays(start, t.duration);
      if (start < minStart) minStart = start;
      if (end > maxEnd) maxEnd = end;
    });

    const totalDur = differenceInDays(maxEnd, minStart);
    const avgProg = Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length);

    return {
      totalTasks: tasks.length,
      completedTasks: completed,
      criticalTasksCount: criticalCount,
      totalDurationDays: totalDur,
      averageProgress: avgProg,
    };
  }, [tasks, cpmResults]);

  const timelineDates = useMemo(() => computeScreenDateRange(tasks), [tasks]);
  // 'Auto' just picks whichever fixed tier (jour/semaine/mois/trimestre/année) best fits the
  // project's actual span — no continuous per-pixel computation, which used to produce
  // unusable sub-pixel day widths on multi-year projects.
  const effectiveZoom = zoom === 'auto' ? suggestZoomForSpan(timelineDates.length) : zoom;
  const dayWidth = ZOOM_DAY_WIDTH[effectiveZoom];
  // The 'année' tier zooms out so far that a month-by-month header is just visual noise (dozens
  // of tiny slivers) — group by year instead once that tier is active, same idea as the 'jour'
  // tier grouping by month instead of by day.
  const monthLabels = useMemo(
    () => (effectiveZoom === 'year' ? computeYearLabels(timelineDates) : computeMonthLabels(timelineDates)),
    [timelineDates, effectiveZoom]
  );

  const todayIndex = useMemo(() => {
    return differenceInDays(parseDate(formatDate(new Date())), timelineDates[0]);
  }, [timelineDates]);

  const hasFolders = useMemo(() => tasks.some(t => t.isFolder), [tasks]);

  const milestones = useMemo(() => {
    return tasks
      .filter(t => t.type === 'milestone')
      .slice()
      .sort((a, b) => parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime());
  }, [tasks]);

  const hiddenByCollapseIds = useMemo(() => {
    if (collapsedFolderIds.size === 0) return new Set<string>();
    const byId = new Map<string, Task>(tasks.map(t => [t.id, t]));
    const hidden = new Set<string>();
    tasks.forEach(t => {
      let current: Task | undefined = t;
      while (current?.parentId) {
        const parent = byId.get(current.parentId);
        if (!parent) break;
        if (collapsedFolderIds.has(parent.id)) {
          hidden.add(t.id);
          break;
        }
        current = parent;
      }
    });
    return hidden;
  }, [tasks, collapsedFolderIds]);

  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    if (filterResourceId !== 'all') {
      result = result.filter(t => t.resourceId === filterResourceId);
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(q));
    }
    if (hiddenByCollapseIds.size > 0) {
      result = result.filter(t => !hiddenByCollapseIds.has(t.id));
    }
    // Tree order (parent immediately followed by its children, siblings by start date) —
    // a plain date sort would scatter a folder's children among unrelated tasks and make
    // large hierarchical imports look scrambled/disconnected.
    return buildHierarchicalOrder(result);
  }, [tasks, filterResourceId, searchQuery, hiddenByCollapseIds]);

  // True nesting depth of every task, computed on the full unfiltered tree so indentation
  // stays correct no matter what's currently filtered/collapsed.
  const taskDepthById = useMemo(() => computeDepthMap(tasks), [tasks]);

  // Deepest folder nesting level in the whole project — bounds the "collapse to depth N"
  // shortcut buttons so we never render more level buttons than the project actually has.
  const maxFolderDepth = useMemo(() => {
    let max = 0;
    tasks.forEach(t => {
      if (t.isFolder) max = Math.max(max, taskDepthById.get(t.id) ?? 0);
    });
    return max;
  }, [tasks, taskDepthById]);

  // Tasks hidden via the per-row eye toggle (selected === false) — used for the timeline bars
  // and PDF export, which should never show them. The row LIST itself (slicedTasks below) still
  // includes them, dimmed, so they stay reachable to toggle back on.
  const visibleTasks = useMemo(() => filteredTasks.filter(t => t.selected !== false), [filteredTasks]);
  const slicedTasks = useMemo(() => filteredTasks.slice(0, displayLimit), [filteredTasks, displayLimit]);
  const selectedTask = useMemo(() => tasks.find(t => t.id === selectedTaskId) || null, [selectedTaskId, tasks]);

  function handleAddTask(input: NewTaskInput) {
    const newTask: Task = {
      id: 'task_' + Date.now().toString(36),
      name: input.name,
      startDate: input.startDate,
      duration: input.type === 'milestone' ? 1 : Math.max(1, input.duration),
      progress: 0,
      dependencies: [],
      resourceId: input.resourceId || undefined,
      color: input.color,
      type: input.type,
      isFolder: false,
    };
    setTasks(prev => [...prev, newTask]);
  }

  function handleAddResource(input: NewResourceInput) {
    const palette = ['bg-indigo-500', 'bg-blue-500', 'bg-pink-500', 'bg-amber-500', 'bg-emerald-500', 'bg-violet-500', 'bg-teal-500', 'bg-rose-500'];
    const randomColor = palette[Math.floor(Math.random() * palette.length)];

    const newRes: Resource = {
      id: 'res_' + Date.now().toString(36),
      name: input.name,
      avatarColor: randomColor,
      role: input.role || "Membre de l'équipe",
    };
    setResources(prev => [...prev, newRes]);
  }

  function handleUpdateTask(updated: Task) {
    setTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)));
  }

  function handleDeleteTask(id: string) {
    setTasks(prev =>
      prev
        .filter(t => t.id !== id)
        .map(t => ({ ...t, dependencies: t.dependencies.filter(dep => dep !== id) }))
    );
    if (selectedTaskId === id) setSelectedTaskId(null);
  }

  function handleAutoSchedule() {
    setTasks(prev => autoScheduleTasks(prev));
  }

  function handleReset() {
    if (confirm('Voulez-vous réinitialiser le diagramme aux valeurs initiales ?')) {
      setTasks(DEFAULT_TASKS);
      setResources(DEFAULT_RESOURCES);
      setSelectedTaskId(null);
      setFilterResourceId('all');
      setActiveProjectName('Projet Démo BetterGantt');
      setCollapsedFolderIds(new Set());
      setZoom(suggestZoomForSpan(computeScreenDateRange(DEFAULT_TASKS).length));
    }
  }

  function handleReorderTask(draggedId: string, target: ReorderTarget) {
    setTasks(prev => reorderTask(prev, draggedId, target));
  }

  function handleToggleTaskSelection(id: string) {
    setTasks(prev => {
      const task = prev.find(t => t.id === id);
      if (!task) return prev;
      const nextSelected = !(task.selected !== false);

      // Folders cascade to their WHOLE subtree, not just direct children — otherwise a folder
      // toggled back to visible after "Tout masquer" still leaves deeply-nested grand-children
      // stuck hidden, and unfolding a nested sub-folder later would reveal rows that look
      // hidden even though their (now visible) parent says otherwise.
      return prev.map(t => {
        if (t.id === id) return { ...t, selected: nextSelected };
        if (task.isFolder && isSameOrDescendantOf(t.id, id, prev)) return { ...t, selected: nextSelected };
        return t;
      });
    });
  }

  function handleSetAllTasksSelected(selected: boolean) {
    setTasks(prev => prev.map(t => ({ ...t, selected })));
  }

  function commitProject(finalName: string, rawTasks: Task[], newResources: Resource[]) {
    // Give every folder and milestone a default color grouped by branch (each top-level folder
    // gets its own hue, descendants get progressively lighter shades of it — blue → sky blue,
    // etc.) — a manual edit via the color picker afterwards always takes precedence over this.
    const newTasks = assignMilestoneColors(rawTasks);

    const newProjId = 'proj_' + Date.now().toString(36);
    const newProjectSaved: SavedProject = {
      id: newProjId,
      name: finalName,
      tasks: newTasks,
      resources: newResources,
      lastModified: new Date().toISOString(),
    };

    setImportedProjectsList(prev => [newProjectSaved, ...prev.filter(p => p.name !== finalName)].slice(0, 15));
    setTasks(newTasks);
    setResources(newResources);
    setActiveProjectName(finalName);
    setSelectedTaskId(null);
    setFilterResourceId('all');
    setSearchQuery('');
    setDisplayLimit(30);
    setZoom(suggestZoomForSpan(computeScreenDateRange(newTasks).length));
  }

  /** Returns 'committed' if the project was loaded immediately, 'pending' if a preset modal must be shown first, or 'error'. */
  function handleImportGanttFile(text: string, filename: string): 'committed' | 'pending' | 'error' {
    try {
      const { name, tasks: parsedTasks, resources: parsedResources } = parseGanttXml(text);
      const finalName = name === 'Projet Gantt Importé' && filename ? filename.replace(/\.(gan|gantt)$/i, '') : name;

      if (parsedTasks.length > HEAVY_IMPORT_TASK_THRESHOLD) {
        const dates = computeScreenDateRange(parsedTasks);
        setPendingImport({
          name: finalName,
          tasks: parsedTasks,
          resources: parsedResources,
          stats: {
            totalTasks: parsedTasks.length,
            milestoneCount: parsedTasks.filter(t => t.type === 'milestone').length,
            folderCount: parsedTasks.filter(t => t.isFolder).length,
            startLabel: dates[0]?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) || '',
            endLabel: dates[dates.length - 1]?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) || '',
            spanDays: dates.length,
          },
        });
        return 'pending';
      }

      setCollapsedFolderIds(new Set());
      commitProject(finalName, parsedTasks, parsedResources);
      return 'committed';
    } catch (e: any) {
      alert(`Erreur d'importation GanttProject : ${e.message || e}`);
      return 'error';
    }
  }

  function confirmPendingImport(zoomOverride: TimelineZoom, collapseDepth: number) {
    if (!pendingImport) return;
    commitProject(pendingImport.name, pendingImport.tasks, pendingImport.resources);
    setZoom(zoomOverride);

    const collapseIds = computeCollapseIdsForDepth(pendingImport.tasks, collapseDepth);
    setCollapsedFolderIds(collapseIds);

    // Show the whole post-collapse tree right away instead of the flat 30-row default —
    // otherwise "afficher la suite" pagination cuts through the tree and the chosen
    // collapse preset looks like it did nothing.
    const hiddenCount = countHiddenByCollapse(pendingImport.tasks, collapseIds);
    const visibleAfterCollapse = pendingImport.tasks.length - hiddenCount;
    setDisplayLimit(Math.min(Math.max(visibleAfterCollapse, 30), 600));

    setPendingImport(null);
  }

  function cancelPendingImport() {
    setPendingImport(null);
  }

  function handleSelectRecentProject(project: SavedProject) {
    setCollapsedFolderIds(new Set());
    commitProject(project.name, project.tasks, project.resources);
  }

  function handleDeleteRecentProject(e: MouseEvent, id: string) {
    e.stopPropagation();
    setImportedProjectsList(prev => prev.filter(p => p.id !== id));
  }

  function handleExportJSON() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ tasks, resources }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'bettergantt_project.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  function handleImportJSON(e: ChangeEvent<HTMLInputElement>) {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = event => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.tasks && Array.isArray(parsed.tasks)) setTasks(parsed.tasks);
          if (parsed.resources && Array.isArray(parsed.resources)) setResources(parsed.resources);
          alert('Projet BetterGantt importé avec succès !');
        } catch (err) {
          alert('Erreur lors du décodage du fichier JSON de configuration.');
        }
      };
    }
  }

  function loadDemoProject() {
    setTasks(DEFAULT_TASKS);
    setResources(DEFAULT_RESOURCES);
    setActiveProjectName('Projet Démo BetterGantt');
    setCollapsedFolderIds(new Set());
    setZoom(suggestZoomForSpan(computeScreenDateRange(DEFAULT_TASKS).length));
  }

  function toggleFolderCollapse(id: string) {
    setCollapsedFolderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function collapseAllFolders() {
    setCollapsedFolderIds(new Set(tasks.filter(t => t.isFolder).map(t => t.id)));
  }

  function expandAllFolders() {
    setCollapsedFolderIds(new Set());
  }

  /** One-click "unfold down to level N" shortcut: folders shallower than `depth` stay open,
   * folders at or beyond `depth` collapse — e.g. depth 0 = only the root level shows, depth 1 =
   * root folders stay open but their sub-folders collapse, and so on. */
  function setCollapseDepth(depth: number) {
    setCollapsedFolderIds(computeCollapseIdsForDepth(tasks, depth));
  }

  function expandAncestorsOf(id: string) {
    setCollapsedFolderIds(prev => {
      if (prev.size === 0) return prev;
      const byId = new Map<string, Task>(tasks.map(t => [t.id, t]));
      const next = new Set(prev);
      let current = byId.get(id);
      while (current?.parentId) {
        next.delete(current.parentId);
        current = byId.get(current.parentId);
      }
      return next;
    });
  }

  function handleSelectMilestone(id: string) {
    setSearchQuery('');
    setFilterResourceId('all');
    expandAncestorsOf(id);
    setDisplayLimit(prev => Math.max(prev, tasks.length));
    setSelectedTaskId(id);
  }

  return {
    tasks,
    resources,
    activeProjectName,
    setActiveProjectName,
    importedProjectsList,

    cpmResults,
    stats,
    timelineDates,
    monthLabels,
    todayIndex,

    zoom,
    setZoom,
    effectiveZoom,
    dayWidth,

    hasFolders,
    maxFolderDepth,
    collapsedFolderIds,
    toggleFolderCollapse,
    collapseAllFolders,
    expandAllFolders,
    setCollapseDepth,

    milestones,
    handleSelectMilestone,

    pendingImport,
    confirmPendingImport,
    cancelPendingImport,

    filterResourceId,
    setFilterResourceId,
    searchQuery,
    setSearchQuery,
    displayLimit,
    setDisplayLimit,
    filteredTasks,
    taskDepthById,
    visibleTasks,
    slicedTasks,

    selectedTaskId,
    setSelectedTaskId,
    selectedTask,
    highlightCriticalPath,
    setHighlightCriticalPath,

    handleAddTask,
    handleAddResource,
    handleUpdateTask,
    handleDeleteTask,
    handleAutoSchedule,
    handleReset,
    handleToggleTaskSelection,
    handleSetAllTasksSelected,
    handleReorderTask,
    handleImportGanttFile,
    handleSelectRecentProject,
    handleDeleteRecentProject,
    handleExportJSON,
    handleImportJSON,
    loadDemoProject,
  };
}

export type GanttData = ReturnType<typeof useGanttData>;
