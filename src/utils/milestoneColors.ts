/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Task } from '../types';
import { computeDepthMap } from './taskHierarchy';

/** How many evenly-spaced hues make up the family color palette before it loops. */
const PALETTE_SIZE = 18;
const PALETTE_SATURATION = 68;
const PALETTE_LIGHTNESS = 48;

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

// A palette of evenly-spaced hues around the color wheel — consecutive entries are as visually
// distinct as possible. Once every family has had a turn through all of them, we loop back to
// the start (the PALETTE_SIZE + 1'th family gets the same base hue as the 1st).
const FAMILY_PALETTE_HUES: number[] = Array.from({ length: PALETTE_SIZE }, (_, i) => (i * 360) / PALETTE_SIZE);

/**
 * Returns a new task array with automatic colors for every folder and milestone, grouped into
 * "families": each top-level (root) folder gets its own distinct base color, picked in outline
 * order and looping back through the palette once exhausted. Every folder or milestone nested
 * inside that top-level folder inherits the SAME hue but progressively lighter/paler the deeper
 * it's nested (e.g. blue → sky blue → pale blue), so the whole branch reads as one color family
 * at a glance instead of everything defaulting to the same blue.
 *
 * A root-level folder is its own family root (base color at depth 0). A root-level milestone
 * with no folder above it at all gets treated as a one-member family of its own, so it still
 * stands out instead of falling back to the default color.
 *
 * Only affects tasks that are folders or milestones — regular standalone tasks keep whatever
 * color they already had. This only runs once, at import/load time; any color a user edits by
 * hand afterwards via the color picker always takes precedence.
 */
export function assignMilestoneColors(tasks: Task[]): Task[] {
  if (tasks.length === 0) return tasks;

  const byId = new Map<string, Task>(tasks.map(t => [t.id, t]));
  const depthById = computeDepthMap(tasks);

  // The topmost ancestor of any task is always a folder (parentId only ever points to a folder,
  // by construction), so walking all the way up gives us the family root directly — or the task
  // itself, if it has no parent at all.
  const familyRootCache = new Map<string, string>();
  function familyRootOf(task: Task): string {
    const cached = familyRootCache.get(task.id);
    if (cached !== undefined) return cached;

    let current: Task = task;
    const guard = new Set<string>();
    while (current.parentId && !guard.has(current.id)) {
      guard.add(current.id);
      const parent = byId.get(current.parentId);
      if (!parent) break;
      current = parent;
    }
    familyRootCache.set(task.id, current.id);
    return current.id;
  }

  // Assign each distinct family a stable hue, in the order those families first appear.
  const hueByRoot = new Map<string, number>();
  tasks.forEach(t => {
    if (!t.isFolder && t.type !== 'milestone') return;
    const root = familyRootOf(t);
    if (!hueByRoot.has(root)) {
      hueByRoot.set(root, FAMILY_PALETTE_HUES[hueByRoot.size % FAMILY_PALETTE_HUES.length]);
    }
  });

  return tasks.map(t => {
    if (!t.isFolder && t.type !== 'milestone') return t;

    const hue = hueByRoot.get(familyRootOf(t)) ?? FAMILY_PALETTE_HUES[0];
    const depth = depthById.get(t.id) ?? 0;
    const lightness = Math.min(80, PALETTE_LIGHTNESS + depth * 9);
    const saturation = Math.max(38, PALETTE_SATURATION - depth * 4);
    return { ...t, color: hslToHex(hue, saturation, lightness) };
  });
}
