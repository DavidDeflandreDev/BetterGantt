import { Task } from '../types';

/**
 * Parses safe UTC Date from "YYYY-MM-DD" template
 */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Converts date to YYYY-MM-DD string
 */
export function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Adds offset in days to a Date object
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Calculates absolute difference in days between two dates
 */
export function differenceInDays(dateLeft: Date, dateRight: Date): number {
  const msDiff = dateLeft.getTime() - dateRight.getTime();
  return Math.round(msDiff / (1000 * 60 * 60 * 24));
}

export interface CPMResult {
  taskId: string;
  earlyStart: number;  // offset in days from project anchor date
  earlyFinish: number; // earlyStart + duration
  lateStart: number;
  lateFinish: number;
  slack: number;
  isCritical: boolean;
}

/**
 * Executes cycle detection on project dependency graph
 */
export function detectCycles(tasks: Task[]): { hasCycle: boolean; cycleNodes: string[] } {
  const adj = new Map<string, string[]>();
  tasks.forEach((t) => adj.set(t.id, t.dependencies || []));

  const visited = new Map<string, number>(); // 0: unvisited, 1: visiting, 2: visited
  const cycleNodes: string[] = [];
  let foundCycle = false;

  const dfs = (nodeId: string) => {
    visited.set(nodeId, 1);
    const deps = adj.get(nodeId) || [];
    for (const dep of deps) {
      const state = visited.get(dep) || 0;
      if (state === 1) {
        foundCycle = true;
        if (!cycleNodes.includes(nodeId)) cycleNodes.push(nodeId);
        if (!cycleNodes.includes(dep)) cycleNodes.push(dep);
      } else if (state === 0) {
        dfs(dep);
      }
    }
    visited.set(nodeId, 2);
  };

  tasks.forEach((t) => {
    if ((visited.get(t.id) || 0) === 0) {
      dfs(t.id);
    }
  });

  return { hasCycle: foundCycle, cycleNodes };
}

/**
 * Performs topological sort on project tasks
 */
export function topologicalSort(tasks: Task[]): Task[] {
  const sorted: Task[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const taskMap = new Map<string, Task>();
  tasks.forEach((t) => taskMap.set(t.id, t));

  const visit = (task: Task) => {
    if (visiting.has(task.id)) return; // Avoid infinite loop in case of cycles
    if (visited.has(task.id)) return;

    visiting.add(task.id);
    (task.dependencies || []).forEach((depId) => {
      const depTask = taskMap.get(depId);
      if (depTask) {
        visit(depTask);
      }
    });

    visiting.delete(task.id);
    visited.add(task.id);
    sorted.push(task);
  };

  tasks.forEach((task) => {
    if (!visited.has(task.id)) {
      visit(task);
    }
  });

  return sorted;
}

/**
 * Computes early start/finish, late start/finish, and slack using CPM
 */
export function calculateCPM(tasks: Task[]): Map<string, CPMResult> {
  const result = new Map<string, CPMResult>();
  if (tasks.length === 0) return result;

  // 1. Detect if cycle exists
  const { hasCycle } = detectCycles(tasks);

  // Find project start date anchor (minimum of all task startDates)
  let projectStart = parseDate(tasks[0].startDate);
  tasks.forEach((t) => {
    const currentStart = parseDate(t.startDate);
    if (currentStart < projectStart) {
      projectStart = currentStart;
    }
  });

  // Safe fallback if cycle exists: fallback to simple sequential schedule to avoid crashes
  if (hasCycle) {
    tasks.forEach((t) => {
      const offset = differenceInDays(parseDate(t.startDate), projectStart);
      const dur = t.type === 'milestone' ? 1 : Math.max(1, t.duration);
      result.set(t.id, {
        taskId: t.id,
        earlyStart: offset,
        earlyFinish: offset + dur,
        lateStart: offset,
        lateFinish: offset + dur,
        slack: 0,
        isCritical: false,
      });
    });
    return result;
  }

  // 2. Topological order
  const orderedTasks = topologicalSort(tasks);

  // 3. Forward Pass
  const esValues = new Map<string, number>();
  const efValues = new Map<string, number>();

  orderedTasks.forEach((t) => {
    const offsetStart = differenceInDays(parseDate(t.startDate), projectStart);
    let earlyStart = offsetStart;

    // Find custom dependencies restraints
    if (t.dependencies && t.dependencies.length > 0) {
      let maxDepFinish = 0;
      t.dependencies.forEach((depId) => {
        const depFinish = efValues.get(depId);
        if (depFinish !== undefined && depFinish > maxDepFinish) {
          maxDepFinish = depFinish;
        }
      });
      // Start is at least the end of its dependencies
      earlyStart = Math.max(earlyStart, maxDepFinish);
    }

    const dur = t.type === 'milestone' ? 1 : Math.max(1, t.duration);
    esValues.set(t.id, earlyStart);
    efValues.set(t.id, earlyStart + dur);
  });

  // Calculate project-wide maximum early finish
  let maxProjectEF = 0;
  efValues.forEach((val) => {
    if (val > maxProjectEF) maxProjectEF = val;
  });

  // 4. Backward Pass
  const lfValues = new Map<string, number>();
  const lsValues = new Map<string, number>();

  // Map successors for reverse lookup
  const successorMap = new Map<string, string[]>();
  tasks.forEach((t) => {
    t.dependencies.forEach((depId) => {
      if (!successorMap.has(depId)) {
        successorMap.set(depId, []);
      }
      successorMap.get(depId)!.push(t.id);
    });
  });

  // Execute in reverse topological order
  for (let i = orderedTasks.length - 1; i >= 0; i--) {
    const t = orderedTasks[i];
    const dur = t.type === 'milestone' ? 1 : Math.max(1, t.duration);
    const successors = successorMap.get(t.id) || [];

    let lateFinish = maxProjectEF;
    if (successors.length > 0) {
      let minSuccLS = Infinity;
      successors.forEach((succId) => {
        const succLS = lsValues.get(succId);
        if (succLS !== undefined && succLS < minSuccLS) {
          minSuccLS = succLS;
        }
      });
      lateFinish = minSuccLS;
    }

    const lateStart = lateFinish - dur;
    lfValues.set(t.id, lateFinish);
    lsValues.set(t.id, lateStart);
  }

  // 5. Combine and calculate slacks
  orderedTasks.forEach((t) => {
    const es = esValues.get(t.id) ?? 0;
    const ef = efValues.get(t.id) ?? 0;
    const ls = lsValues.get(t.id) ?? es;
    const lf = lfValues.get(t.id) ?? ef;
    const slack = ls - es;

    result.set(t.id, {
      taskId: t.id,
      earlyStart: es,
      earlyFinish: ef,
      lateStart: ls,
      lateFinish: lf,
      slack,
      isCritical: slack <= 0,
    });
  });

  return result;
}

/**
 * Shifts task start dates to automatically resolve dependency timing conflicts.
 * Modifies tasks startDates such that no child starts before its parents finish.
 */
export function autoScheduleTasks(tasks: Task[]): Task[] {
  const { hasCycle } = detectCycles(tasks);
  if (hasCycle) return tasks; // Cannot auto-schedule cycles dynamically

  const ordered = topologicalSort(tasks);
  const updatedTasksMap = new Map<string, Task>();
  tasks.forEach((t) => updatedTasksMap.set(t.id, { ...t }));

  ordered.forEach((t) => {
    const currentTask = updatedTasksMap.get(t.id)!;
    if (currentTask.dependencies && currentTask.dependencies.length > 0) {
      let maxParentFinishDate = parseDate(currentTask.startDate);
      let hasParent = false;

      currentTask.dependencies.forEach((parentId) => {
        const parent = updatedTasksMap.get(parentId);
        if (parent) {
          hasParent = true;
          const parentStart = parseDate(parent.startDate);
          const parentDur = parent.type === 'milestone' ? 1 : Math.max(1, parent.duration);
          const parentFinish = addDays(parentStart, parentDur);
          
          if (parentFinish > maxParentFinishDate) {
            maxParentFinishDate = parentFinish;
          }
        }
      });

      if (hasParent) {
        currentTask.startDate = formatDate(maxParentFinishDate);
      }
    }
  });

  return Array.from(updatedTasksMap.values());
}
