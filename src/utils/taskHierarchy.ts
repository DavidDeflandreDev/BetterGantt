/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Task } from '../types';

/**
 * Depth of every task within its true parent chain (0 for root-level tasks), computed over
 * the FULL task list so indentation always reflects real nesting, independent of whatever
 * subset is currently visible on screen (search/resource filters, collapsed folders, etc.).
 */
export function computeDepthMap(tasks: Task[]): Map<string, number> {
  const byId = new Map<string, Task>(tasks.map(t => [t.id, t]));
  const depthCache = new Map<string, number>();

  function depthOf(task: Task): number {
    const cached = depthCache.get(task.id);
    if (cached !== undefined) return cached;

    let depth = 0;
    let current: Task = task;
    const guard = new Set<string>(); // guards against malformed/circular parentId chains
    while (current.parentId && !guard.has(current.id)) {
      guard.add(current.id);
      const parent = byId.get(current.parentId);
      if (!parent) break;
      depth++;
      current = parent;
    }
    depthCache.set(task.id, depth);
    return depth;
  }

  tasks.forEach(t => depthOf(t));
  return depthCache;
}

/**
 * Orders a (possibly already filtered) list of tasks in tree pre-order: every folder is
 * immediately followed by its own children. Siblings keep the relative order they already
 * have in the input array — that array order is the authored outline order (1, 2, 3…, matching
 * GanttProject's own numbering), which is what "correctly sorted" means for a project plan.
 * Sorting siblings by start date instead would scatter e.g. task "2" above task "1" whenever
 * work on branch 2 happens to start earlier, which is exactly the bug this avoids.
 * A task whose parent isn't present in this exact list (filtered out elsewhere, or a genuine
 * root task) is treated as a root for ordering purposes, so nothing silently disappears.
 */
export function buildHierarchicalOrder(tasks: Task[]): Task[] {
  const idsInSet = new Set(tasks.map(t => t.id));
  const byParent = new Map<string, Task[]>();
  const roots: Task[] = [];

  tasks.forEach(t => {
    if (t.parentId && idsInSet.has(t.parentId)) {
      const siblings = byParent.get(t.parentId) || [];
      siblings.push(t);
      byParent.set(t.parentId, siblings);
    } else {
      roots.push(t);
    }
  });

  const ordered: Task[] = [];

  function visit(list: Task[]) {
    list.forEach(t => {
      ordered.push(t);
      const children = byParent.get(t.id);
      if (children && children.length > 0) visit(children);
    });
  }

  visit(roots);
  return ordered;
}

/** Counts how many tasks would be hidden on screen by the given set of collapsed folder ids. */
export function countHiddenByCollapse(tasks: Task[], collapsedFolderIds: Set<string>): number {
  if (collapsedFolderIds.size === 0) return 0;
  const byId = new Map<string, Task>(tasks.map(t => [t.id, t]));
  let hidden = 0;
  tasks.forEach(t => {
    let current: Task | undefined = t;
    while (current?.parentId) {
      const parent = byId.get(current.parentId);
      if (!parent) break;
      if (collapsedFolderIds.has(parent.id)) {
        hidden++;
        break;
      }
      current = parent;
    }
  });
  return hidden;
}

/** True if `candidateId` is `ancestorId` itself, or anywhere in its descendant chain. */
export function isSameOrDescendantOf(candidateId: string, ancestorId: string, tasks: Task[]): boolean {
  if (candidateId === ancestorId) return true;
  const byId = new Map<string, Task>(tasks.map(t => [t.id, t]));
  let current = byId.get(candidateId);
  const guard = new Set<string>();
  while (current?.parentId && !guard.has(current.id)) {
    guard.add(current.id);
    if (current.parentId === ancestorId) return true;
    current = byId.get(current.parentId);
  }
  return false;
}

/** Recomputes isFolder for every task from the actual parentId relationships in the array, so
 * a task that gains or loses children (e.g. via drag-and-drop reordering) always renders
 * correctly, regardless of what isFolder said before the change. */
export function withRecomputedFolders(tasks: Task[]): Task[] {
  const parentIds = new Set<string>();
  tasks.forEach(t => {
    if (t.parentId) parentIds.add(t.parentId);
  });
  return tasks.map(t => (Boolean(t.isFolder) !== parentIds.has(t.id) ? { ...t, isFolder: parentIds.has(t.id) } : t));
}

/** Where a dragged task should land relative to a drop target, or at the very top/bottom of the whole list. */
export type ReorderTarget = { id: string; placement: 'before' | 'after' | 'inside' } | { edge: 'start' | 'end' };

/**
 * Moves `draggedId` to its new place among the tasks, updating its parentId as needed.
 * Only the dragged task itself moves — its descendants (if it's a folder) keep their existing
 * parentId and simply follow wherever it goes, since sibling order is derived from relative
 * array position rather than requiring subtrees to be physically contiguous.
 */
export function reorderTask(tasks: Task[], draggedId: string, target: ReorderTarget): Task[] {
  const dragged = tasks.find(t => t.id === draggedId);
  if (!dragged) return tasks;

  let newParentId: string | undefined;
  let anchorId: string | null = null;
  let placeBefore = false;

  if ('edge' in target) {
    newParentId = undefined;
    placeBefore = target.edge === 'start';
  } else {
    if (target.id === draggedId) return tasks; // dropped on itself, no-op
    if (isSameOrDescendantOf(target.id, draggedId, tasks)) return tasks; // would create a cycle

    const targetTask = tasks.find(t => t.id === target.id);
    if (!targetTask) return tasks;

    newParentId = target.placement === 'inside' ? targetTask.id : targetTask.parentId;
    anchorId = target.id;
    placeBefore = target.placement === 'before';
  }

  const withoutDragged = tasks.filter(t => t.id !== draggedId);
  const updatedDragged: Task = { ...dragged, parentId: newParentId };

  let insertIndex: number;
  if (anchorId === null) {
    insertIndex = placeBefore ? 0 : withoutDragged.length;
  } else {
    const anchorIndex = withoutDragged.findIndex(t => t.id === anchorId);
    insertIndex = anchorIndex === -1 ? withoutDragged.length : placeBefore ? anchorIndex : anchorIndex + 1;
  }

  const next = [...withoutDragged.slice(0, insertIndex), updatedDragged, ...withoutDragged.slice(insertIndex)];
  return withRecomputedFolders(next);
}
