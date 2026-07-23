/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

interface UseResizablePanelOptions {
  /** localStorage key prefix — also gets a `_collapsed` suffix for the collapsed flag. */
  storageKey: string;
  defaultSize: number;
  min: number;
  max: number;
  /** 'horizontal' resizes width by dragging left/right, 'vertical' resizes height by dragging up/down. */
  direction: 'horizontal' | 'vertical';
  /** Set true when the drag handle sits on the edge where dragging TOWARD the panel's own
   * origin (up, or left) should GROW it instead of shrink it — e.g. a bottom drawer whose
   * handle is on its top edge: dragging up (a decreasing clientY) should increase its height. */
  invert?: boolean;
  /** Whether the panel starts collapsed the very first time (no saved preference yet). */
  defaultCollapsed?: boolean;
}

/** Hand-rolled drag-to-resize + collapse, persisted to localStorage — this project has no
 * resize-panel dependency installed (and the sandbox can't add new npm packages), so this is a
 * small, self-contained pointer-events implementation instead. */
export function useResizablePanel({
  storageKey,
  defaultSize,
  min,
  max,
  direction,
  invert = false,
  defaultCollapsed = false,
}: UseResizablePanelOptions) {
  const [size, setSize] = useState<number>(() => {
    const saved = localStorage.getItem(storageKey);
    const parsed = saved ? Number(saved) : NaN;
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : defaultSize;
  });
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem(`${storageKey}_collapsed`);
    return saved === null ? defaultCollapsed : saved === '1';
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ pos: number; size: number } | null>(null);

  useEffect(() => {
    localStorage.setItem(storageKey, String(size));
  }, [storageKey, size]);

  useEffect(() => {
    localStorage.setItem(`${storageKey}_collapsed`, collapsed ? '1' : '0');
  }, [storageKey, collapsed]);

  const onDragStart = useCallback(
    (e: ReactPointerEvent) => {
      e.preventDefault();
      dragStart.current = { pos: direction === 'horizontal' ? e.clientX : e.clientY, size };
      setIsDragging(true);

      function handleMove(ev: PointerEvent) {
        if (!dragStart.current) return;
        const pos = direction === 'horizontal' ? ev.clientX : ev.clientY;
        const rawDelta = pos - dragStart.current.pos;
        const delta = invert ? -rawDelta : rawDelta;
        setSize(Math.min(max, Math.max(min, dragStart.current.size + delta)));
      }
      function handleUp() {
        dragStart.current = null;
        setIsDragging(false);
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
      }
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    },
    [direction, invert, min, max, size]
  );

  return { size, collapsed, setCollapsed, isDragging, onDragStart };
}
