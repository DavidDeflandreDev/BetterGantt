/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Free, selectable color system for tasks. Colors are stored as hex strings on
// Task.color (e.g. "#6366f1"). Old projects created before this change stored
// a fixed named palette ('indigo', 'pink', ...) — LEGACY_HEX keeps those working.

export interface ColorSwatch {
  id: string;
  label: string;
  hex: string;
}

export const COLOR_SWATCHES: ColorSwatch[] = [
  { id: 'indigo', label: 'Indigo', hex: '#6366f1' },
  { id: 'blue', label: 'Bleu', hex: '#3b82f6' },
  { id: 'sky', label: 'Ciel', hex: '#0ea5e9' },
  { id: 'teal', label: 'Sarcelle', hex: '#14b8a6' },
  { id: 'emerald', label: 'Émeraude', hex: '#10b981' },
  { id: 'amber', label: 'Ambre', hex: '#f59e0b' },
  { id: 'orange', label: 'Orange', hex: '#f97316' },
  { id: 'rose', label: 'Rose', hex: '#f43f5e' },
  { id: 'pink', label: 'Fuchsia', hex: '#ec4899' },
  { id: 'violet', label: 'Violet', hex: '#8b5cf6' },
  { id: 'purple', label: 'Pourpre', hex: '#a855f7' },
  { id: 'slate', label: 'Ardoise', hex: '#64748b' },
];

const LEGACY_HEX: Record<string, string> = {
  indigo: '#6366f1',
  blue: '#3b82f6',
  pink: '#ec4899',
  amber: '#f59e0b',
  emerald: '#10b981',
  violet: '#8b5cf6',
  rose: '#f43f5e',
  cyan: '#06b6d4',
};

export const DEFAULT_TASK_COLOR = LEGACY_HEX.indigo;

/** Resolves any stored task color (hex or legacy named value) to a hex string. */
export function resolveTaskColor(color?: string): string {
  if (!color) return DEFAULT_TASK_COLOR;
  if (color.startsWith('#')) return color;
  return LEGACY_HEX[color] || DEFAULT_TASK_COLOR;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const int = parseInt(full, 16) || 0;
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Whether a hex color is light enough to need dark text on top of it. */
export function isLightColor(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 165;
}
