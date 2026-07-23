/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const ROW_HEIGHT = 56; // px height for each task row

export type FixedTimelineZoom = 'day' | 'week' | 'month' | 'quarter' | 'year';
export type TimelineZoom = 'auto' | FixedTimelineZoom;

/**
 * Pixels used per day of the project, for each fixed zoom level. 'auto' has no fixed value of
 * its own — it just automatically picks whichever of the fixed tiers below best fits the
 * current project's span (see suggestZoomForSpan), so there's never a need to fiddle with a
 * width slider or manual zoom to get an overview.
 */
export const ZOOM_DAY_WIDTH: Record<TimelineZoom, number> = {
  auto: 7,
  day: 48,
  week: 18,
  month: 7,
  quarter: 2.4,
  // Deliberately NOT "shrink everything to fit the screen" — that's what made multi-year
  // projects unreadable (dozens of months crammed into one view). 1.65px/day puts roughly two
  // calendar years in a typical viewport width, with the rest reachable by scrolling sideways,
  // same as every other tier.
  year: 1.65,
};

export const ZOOM_LABELS: Record<TimelineZoom, string> = {
  auto: 'Auto',
  day: 'Jour',
  week: 'Semaine',
  month: 'Mois',
  quarter: 'Trimestre',
  year: 'Année',
};

export const ZOOM_DESCRIPTIONS: Record<TimelineZoom, string> = {
  auto: 'Choisit automatiquement le meilleur niveau ci-dessous selon la durée du projet',
  day: 'Un jour par colonne',
  week: 'Vue par semaine',
  month: 'Vue par mois',
  quarter: 'Vue par trimestre',
  year: 'Vue par année, pour les projets pluriannuels',
};

/** Below this day-column width, per-day text no longer fits legibly. */
export const DAY_TEXT_MIN_WIDTH = 20;

/** Picks the best fixed zoom tier for a project spanning this many days. Used both as the
 * initial suggestion after import, and to resolve what 'auto' mode actually displays. A ~1-year
 * project should already read as "month" view, not "week" — weeks are too fine-grained to be
 * legible once a whole year (or more) is on screen at once. */
export function suggestZoomForSpan(totalDays: number): FixedTimelineZoom {
  if (totalDays <= 90) return 'day';
  if (totalDays <= 150) return 'week';
  if (totalDays <= 1000) return 'month';
  if (totalDays <= 2500) return 'quarter';
  return 'year';
}
