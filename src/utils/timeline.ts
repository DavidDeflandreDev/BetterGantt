/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Task } from '../types';
import { parseDate, addDays, differenceInDays } from './cpm';

export interface MonthLabel {
  monthText: string;
  span: number;
  startIndex: number;
}

export function generateDatesRange(start: Date, totalDays: number): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < totalDays; i++) {
    dates.push(addDays(start, i));
  }
  return dates;
}

/** Groups consecutive dates by month/year, for a header band above the day columns. */
export function computeMonthLabels(dates: Date[]): MonthLabel[] {
  const headers: MonthLabel[] = [];
  if (dates.length === 0) return headers;

  let currentMonthStr = '';
  let currentSpan = 0;
  let startIndex = 0;

  dates.forEach((date, idx) => {
    const formatted = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const monthText = formatted.charAt(0).toUpperCase() + formatted.slice(1);

    if (idx === 0) {
      currentMonthStr = monthText;
      currentSpan = 1;
      startIndex = 0;
    } else if (monthText === currentMonthStr) {
      currentSpan++;
    } else {
      headers.push({ monthText: currentMonthStr, span: currentSpan, startIndex });
      currentMonthStr = monthText;
      currentSpan = 1;
      startIndex = idx;
    }
  });

  headers.push({ monthText: currentMonthStr, span: currentSpan, startIndex });
  return headers;
}

/** Groups consecutive dates by calendar year — used as the export header band once a project
 * spans so many years that per-month segments would be too thin to read (multi-year/decade
 * exports), where a monthly breakdown would just be visual noise. */
export function computeYearLabels(dates: Date[]): MonthLabel[] {
  const headers: MonthLabel[] = [];
  if (dates.length === 0) return headers;

  let currentYear = '';
  let currentSpan = 0;
  let startIndex = 0;

  dates.forEach((date, idx) => {
    const yearText = String(date.getUTCFullYear());
    if (idx === 0) {
      currentYear = yearText;
      currentSpan = 1;
      startIndex = 0;
    } else if (yearText === currentYear) {
      currentSpan++;
    } else {
      headers.push({ monthText: currentYear, span: currentSpan, startIndex });
      currentYear = yearText;
      currentSpan = 1;
      startIndex = idx;
    }
  });

  headers.push({ monthText: currentYear, span: currentSpan, startIndex });
  return headers;
}

/**
 * Tight date range covering just the given tasks (small padding on each side).
 * Used for export/print so the PDF isn't full of empty blank days.
 */
export function computeTightDateRange(tasks: Task[], padStart = 2, padEnd = 3, minDays = 7): Date[] {
  if (tasks.length === 0) {
    return generateDatesRange(new Date(), minDays);
  }

  let minStart = parseDate(tasks[0].startDate);
  let maxEnd = addDays(parseDate(tasks[0].startDate), Math.max(1, tasks[0].duration));

  tasks.forEach(t => {
    const start = parseDate(t.startDate);
    const dur = t.type === 'milestone' ? 1 : Math.max(1, t.duration);
    const end = addDays(start, dur);
    if (start < minStart) minStart = start;
    if (end > maxEnd) maxEnd = end;
  });

  const startDate = addDays(minStart, -padStart);
  const totalDays = Math.max(minDays, differenceInDays(maxEnd, startDate) + padEnd);
  return generateDatesRange(startDate, totalDays);
}

/**
 * Wider date range used for the interactive on-screen timeline: pads a few days
 * before the earliest task and leaves comfortable room to scroll after the last one.
 */
export function computeScreenDateRange(tasks: Task[]): Date[] {
  if (tasks.length === 0) {
    return generateDatesRange(new Date(), 30);
  }

  let minStart = parseDate(tasks[0].startDate);
  let maxEnd = addDays(parseDate(tasks[0].startDate), tasks[0].duration);

  tasks.forEach(t => {
    const start = parseDate(t.startDate);
    const end = addDays(start, t.duration);
    if (start < minStart) minStart = start;
    if (end > maxEnd) maxEnd = end;
  });

  const startDate = addDays(minStart, -3);
  const totalDays = Math.max(30, differenceInDays(maxEnd, startDate) + 10);
  return generateDatesRange(startDate, totalDays);
}

/** Full readable date, e.g. "15 juin 2026". */
export function formatFullDate(dateStr: string): string {
  const d = parseDate(dateStr);
  const formatted = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  return formatted;
}

/** Formats a task's start → end range as one readable, non-truncated string. */
export function formatTaskDateRange(startDateStr: string, durationDays: number): string {
  const start = parseDate(startDateStr);
  const end = addDays(start, Math.max(1, durationDays) - 1);
  const sameMonth = start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear();
  const startFmt = start.toLocaleDateString('fr-FR', { day: 'numeric', month: sameMonth ? undefined : 'long' });
  const endFmt = end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  return durationDays <= 1 ? endFmt : `${startFmt} → ${endFmt}`;
}
