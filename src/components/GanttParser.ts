import { Task, Resource } from '../types';

/**
 * Parses safe UTC Date from "YYYY-MM-DD" template
 */
function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Converts date to YYYY-MM-DD string
 */
function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Maps GanttProject hex colors to our predefined Tailwind palettes
 */
function mapColor(hex: string | null): string {
  if (!hex) return 'indigo';
  const lower = hex.toLowerCase().trim();
  if (lower.includes('#ff') || lower.includes('red') || lower.includes('pink') || lower.includes('rose')) return 'pink';
  if (lower.includes('#00ff') || lower.includes('green') || lower.includes('emerald')) return 'emerald';
  if (lower.includes('blue') || lower.includes('cyan') || lower.includes('#8cb6ce')) return 'blue';
  if (lower.includes('yellow') || lower.includes('orange') || lower.includes('amber')) return 'amber';
  if (lower.includes('purple') || lower.includes('violet')) return 'violet';
  return 'indigo';
}

/**
 * Recursive parser for xml <task> nodes
 */
function parseTasksRecursively(
  nodes: Element[],
  parentId?: string,
  dependencyLinksList: { predecessor: string; successor: string }[] = []
): Task[] {
  let result: Task[] = [];

  for (const node of nodes) {
    if (node.tagName === 'task') {
      const id = node.getAttribute('id') || '';
      const name = node.getAttribute('name') || '';
      const meeting = node.getAttribute('meeting') === 'true';
      const start = node.getAttribute('start') || '';
      const durationAttr = node.getAttribute('duration') || '1';
      const duration = parseInt(durationAttr, 10) || 1;
      const progressAttr = node.getAttribute('complete') || '0';
      const progress = parseInt(progressAttr, 10) || 0;
      const color = node.getAttribute('color') || '';

      const subTaskNodes = Array.from(node.children).filter(child => child.tagName === 'task');
      const isFolder = subTaskNodes.length > 0;

      // Extract depend elements inside this task node
      const dependNodes = Array.from(node.children).filter(child => child.tagName === 'depend');
      dependNodes.forEach(dep => {
        const successorId = dep.getAttribute('id');
        if (id && successorId) {
          // Inside <task id="1"> <depend id="2"/> </task>, task 2 depends on task 1
          dependencyLinksList.push({ predecessor: id, successor: successorId });
        }
      });

      const currentTask: Task = {
        id,
        name,
        startDate: start || formatDate(new Date()),
        duration: meeting ? 1 : Math.max(1, duration),
        progress: isNaN(progress) ? 0 : progress,
        dependencies: [], // Filled during compilation pass
        resourceId: undefined, // Filled from allocations during compilation pass
        color: mapColor(color),
        type: meeting ? 'milestone' : 'task',
        parentId,
        isFolder,
        selected: true // Visible by default
      };

      result.push(currentTask);

      if (isFolder) {
        result = result.concat(parseTasksRecursively(subTaskNodes as Element[], id, dependencyLinksList));
      }
    }
  }

  return result;
}

/**
 * Parses GanttProject .gantt XML file text content
 */
export function parseGanttXml(xmlText: string): { name: string; tasks: Task[]; resources: Resource[] } {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  // Check parsing errors
  const parseError = xmlDoc.getElementsByTagName('parsererror');
  if (parseError.length > 0) {
    throw new Error('Fichier .gantt corrompu ou format XML invalide.');
  }

  // 1. Get Project Title
  const projectNode = xmlDoc.getElementsByTagName('project')[0];
  let projectName = 'Projet Gantt Importé';
  if (projectNode) {
    const rawName = projectNode.getAttribute('name');
    if (rawName && rawName.trim().length > 0) {
      projectName = rawName;
    }
  }

  // 2. Parse Resources
  const resources: Resource[] = [];
  const resourceNodes = xmlDoc.getElementsByTagName('resource');
  const palette = ['bg-indigo-500', 'bg-blue-500', 'bg-pink-500', 'bg-amber-500', 'bg-emerald-500', 'bg-violet-500', 'bg-teal-500', 'bg-rose-500'];

  for (let i = 0; i < resourceNodes.length; i++) {
    const node = resourceNodes[i];
    const rId = node.getAttribute('id') || `res_${i}`;
    const rName = node.getAttribute('name') || `Membre ${i + 1}`;
    const rRole = node.getAttribute('function') || 'Membre de l\'équipe';
    const avatarColor = palette[i % palette.length];

    resources.push({
      id: rId,
      name: rName,
      role: rRole.startsWith('Default:') ? 'Collaborateur' : rRole,
      avatarColor
    });
  }

  // 3. Map allocations (taskId -> resourceId)
  const allocationsMap = new Map<string, string>();
  const allocationNodes = xmlDoc.getElementsByTagName('allocation');
  for (let i = 0; i < allocationNodes.length; i++) {
    const node = allocationNodes[i];
    const taskId = node.getAttribute('task-id');
    const resourceId = node.getAttribute('resource-id');
    if (taskId && resourceId) {
      allocationsMap.set(taskId, resourceId);
    }
  }

  // 4. Parse Tasks Recursively
  const dependencyLinks: { predecessor: string; successor: string }[] = [];
  
  // Find only root <task> nodes inside <tasks> tag to prevent double parsing
  const tasksContainer = xmlDoc.getElementsByTagName('tasks')[0];
  let rootTaskElements: Element[] = [];
  if (tasksContainer) {
    rootTaskElements = Array.from(tasksContainer.children).filter(child => child.tagName === 'task');
  } else {
    // Fallback if structured differently
    rootTaskElements = Array.from(xmlDoc.getElementsByTagName('task')).filter(n => n.parentElement?.tagName === 'tasks');
  }

  const tasks = parseTasksRecursively(rootTaskElements, undefined, dependencyLinks);

  // 5. Final Pass: Map dependency connections and resources
  tasks.forEach(t => {
    // Affiliation dependencies
    const depsSet = new Set<string>();
    dependencyLinks.forEach(link => {
      if (link.successor === t.id) {
        depsSet.add(link.predecessor);
      }
    });
    t.dependencies = Array.from(depsSet);

    // Affiliation resource
    const matchedResId = allocationsMap.get(t.id);
    if (matchedResId) {
      t.resourceId = matchedResId;
    }
  });

  return {
    name: projectName,
    tasks,
    resources
  };
}
