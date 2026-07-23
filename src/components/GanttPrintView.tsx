/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Task, Resource } from '../types';
import { CPMResult, parseDate, differenceInDays } from '../utils/cpm';
import { resolveTaskColor, isLightColor } from '../utils/colors';
import { computeMonthLabels, computeYearLabels, computeTightDateRange, formatTaskDateRange } from '../utils/timeline';
import { FixedTimelineZoom } from './timeline/constants';

// Tall enough to comfortably fit two stacked lines (title + resource/duration) at their
// explicit line-heights below — was tight enough before that on some renderers the two lines
// together slightly exceeded the row's box, and the overflow got visually painted over by the
// next row's own background instead of just showing (a "cut in half" look).
export const PRINT_ROW_HEIGHT = 38;
export const PRINT_LABEL_COL_WIDTH = 300;
/** Indentation per nesting level in the label column — kept modest so deeply-nested tasks
 * (folders 5-6 levels deep) still leave enough horizontal room for the name/resource text
 * instead of squeezing it down to a sliver. */
const PRINT_LABEL_INDENT_PER_DEPTH = 10;
// html2canvas (used to rasterize the export) does not reliably reproduce flexbox vertical
// centering (`display:flex; justifyContent:center`) — it can render correctly on screen while
// the captured PDF shows the two label lines overlapping or shifted. Plain block layout with an
// explicit padding-top is captured identically to what's on screen, so the row uses that instead
// of flex centering for its two text lines.
const PRINT_TITLE_LINE_HEIGHT = 14;
const PRINT_SUBTITLE_LINE_HEIGHT = 12;
const PRINT_ROW_TEXT_PADDING_TOP = Math.max(0, Math.round((PRINT_ROW_HEIGHT - PRINT_TITLE_LINE_HEIGHT - PRINT_SUBTITLE_LINE_HEIGHT) / 2));
export const PRINT_TITLE_BAR_HEIGHT = 74;
export const PRINT_MONTH_BAND_HEIGHT = 22;
export const PRINT_DAY_BAND_HEIGHT = 32;
export const PRINT_GRID_HEADER_HEIGHT = PRINT_MONTH_BAND_HEIGHT + PRINT_DAY_BAND_HEIGHT;
/** Total non-scrolling top strip (title bar + date header) — repeated on every export tile. */
export const PRINT_TOP_BAND_HEIGHT = PRINT_TITLE_BAR_HEIGHT + PRINT_GRID_HEADER_HEIGHT;
/** Extra blank runway to the right so trailing "name · date range" labels never get cut off. */
const TRAILING_LABEL_SPACE = 260;

// A project spanning a handful of weeks should still render at full day-level detail, exactly
// as before. But nothing scales the physical page count in "multi-pages" export like the raw
// number of days in the timeline — a plan spanning several years at a fixed 30px/day used to
// blow up into dozens of horizontal PDF tiles even with a tiny handful of tasks selected. So the
// day width now adapts to the actual span: short plans stay pin-sharp, long ones automatically
// zoom out (month → quarter → year/decade look) so the export stays a sane number of pages.
const PRINT_DAY_WIDTH_DETAILED = 30;
/** Hard ceiling on the CSS-px width the timeline body can reach once it needs to zoom out —
 * bounds how many horizontal tiles a multi-page export can ever produce. */
const PRINT_MAX_TIMELINE_WIDTH = 1000;
/** A4 usable area ratio (width/height, after an 8mm margin on every side) for each orientation —
 * used so a project with only a handful of rows doesn't get stretched to a needlessly wide
 * timeline just because the flat cap above allows it: matching the page's own proportions keeps
 * "a4-single" from having to shrink the whole diagram (and its text) far more than necessary. */
const PAGE_ASPECT_LANDSCAPE = (297 - 16) / (210 - 16);
const PAGE_ASPECT_PORTRAIT = (210 - 16) / (297 - 16);

/** The narrowest timeline width that still keeps the overall diagram close to the target page's
 * aspect ratio, given how many rows (and therefore how tall the label column) there are. */
function computeAspectMatchedTimelineWidth(rowCount: number, pageAspect: number): number {
  const bodyHeight = PRINT_TITLE_BAR_HEIGHT + PRINT_GRID_HEADER_HEIGHT + Math.max(1, rowCount) * PRINT_ROW_HEIGHT;
  const idealTotalWidth = bodyHeight * pageAspect;
  return Math.max(150, idealTotalWidth - PRINT_LABEL_COL_WIDTH - TRAILING_LABEL_SPACE);
}

function computePrintDayWidth(totalDays: number, rowCount: number, pageAspect: number): number {
  if (totalDays <= 0) return PRINT_DAY_WIDTH_DETAILED;
  const naturalWidth = totalDays * PRINT_DAY_WIDTH_DETAILED;
  // Short spans never need to shrink at all, no matter the row count — the "trop compressé"
  // complaint only applies once the raw day-by-day width would already have exceeded the cap.
  if (naturalWidth <= PRINT_MAX_TIMELINE_WIDTH) return PRINT_DAY_WIDTH_DETAILED;
  const target = Math.min(PRINT_MAX_TIMELINE_WIDTH, computeAspectMatchedTimelineWidth(rowCount, pageAspect));
  return Math.max(0.05, target / totalDays);
}

interface GanttPrintViewProps {
  elementId: string;
  projectName: string;
  tasks: Task[];
  resources: Resource[];
  cpmResults: Map<string, CPMResult>;
  highlightCriticalPath: boolean;
  taskDepthById: Map<string, number>;
  orientation: 'portrait' | 'landscape';
  /** The zoom tier currently selected on the main diagram screen — the export mirrors that same
   * granularity choice (day-level detail, month bands, or year bands) instead of deciding it
   * independently from whatever pixel width the export happens to end up with. */
  zoomTier: FixedTimelineZoom;
}

export default function GanttPrintView({
  elementId,
  projectName,
  tasks,
  resources,
  cpmResults,
  highlightCriticalPath,
  taskDepthById,
  orientation,
  zoomTier,
}: GanttPrintViewProps) {
  const dates = computeTightDateRange(tasks);
  const pageAspect = orientation === 'landscape' ? PAGE_ASPECT_LANDSCAPE : PAGE_ASPECT_PORTRAIT;
  const dayWidth = computePrintDayWidth(dates.length, tasks.length, pageAspect);
  // Granularity mirrors the chosen zoom tier: 'jour'/'semaine' still show the day-by-day band,
  // 'année' groups the top band by year instead of by month — the pixel width above is only
  // about fitting the page, this is about what level of date detail actually gets labeled.
  const showDayLabels = zoomTier === 'day' || zoomTier === 'week';
  const useYearLabels = zoomTier === 'year';
  const monthLabels = useYearLabels ? computeYearLabels(dates) : computeMonthLabels(dates);
  const gridWidth = dates.length * dayWidth;
  const timelineWidth = gridWidth + TRAILING_LABEL_SPACE;
  const totalWidth = PRINT_LABEL_COL_WIDTH + timelineWidth;
  const rangeStart = dates[0];
  const todayStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div
      id={elementId}
      style={{
        width: totalWidth,
        background: '#ffffff',
        color: '#0f172a',
        // html2canvas rasterizes text itself (its own canvas-based text renderer, not the
        // browser's real text engine) and does not reliably resolve CSS-level generic keywords
        // like `ui-sans-serif` / `system-ui` / `-apple-system` the same way the live page does —
        // on screen the browser picks a real OS font and shapes it correctly, but html2canvas can
        // measure/draw those keyword font names incorrectly, which is exactly the kind of bug
        // that shows glyphs overlapping ONLY in the exported raster, never in the live preview.
        // A single, always-available, concrete font name avoids that class of bug entirely.
        fontFamily: 'Helvetica, Arial, sans-serif',
      }}
    >
      {/* Title bar spans full width, repeats on every exported tile */}
      <div
        style={{
          height: PRINT_TITLE_BAR_HEIGHT,
          borderBottom: '2px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          boxSizing: 'border-box',
        }}
      >
        <div>
          <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.01em' }}>
            {projectName || 'Diagramme de Gantt'}
          </div>
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
            Généré avec BetterGantt · {todayStr}
          </div>
        </div>
        <div style={{ fontSize: 10, color: '#64748b', textAlign: 'right' }}>
          <div>{tasks.length} tâche{tasks.length > 1 ? 's' : ''} affichée{tasks.length > 1 ? 's' : ''}</div>
          {highlightCriticalPath && (
            <div style={{ color: '#e11d48', fontWeight: 700 }}>Chemin critique surligné</div>
          )}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: 12 }}>
          Aucune tâche sélectionnée pour l'export. Cochez au moins une tâche dans le panneau de gauche.
        </div>
      ) : (
        <div style={{ display: 'flex' }}>
          {/* Label column */}
          <div style={{ width: PRINT_LABEL_COL_WIDTH, flexShrink: 0, borderRight: '2px solid #e2e8f0' }}>
            <div
              style={{
                height: PRINT_GRID_HEADER_HEIGHT,
                display: 'flex',
                alignItems: 'center',
                padding: '0 14px',
                fontSize: 11,
                fontWeight: 800,
                color: '#475569',
                letterSpacing: '0.03em',
                borderBottom: '1px solid #e2e8f0',
                textTransform: 'uppercase',
                boxSizing: 'border-box',
              }}
            >
              Tâche / Ressource
            </div>
            {tasks.map(t => {
              const cpm = cpmResults.get(t.id);
              const isCritical = highlightCriticalPath && cpm?.isCritical;
              const res = resources.find(r => r.id === t.resourceId);
              const depth = taskDepthById.get(t.id) ?? 0;
              return (
                <div
                  key={t.id}
                  style={{
                    height: PRINT_ROW_HEIGHT,
                    paddingTop: PRINT_ROW_TEXT_PADDING_TOP,
                    paddingRight: 14,
                    paddingLeft: 14 + depth * PRINT_LABEL_INDENT_PER_DEPTH,
                    borderBottom: '1px solid #f1f5f9',
                    boxSizing: 'border-box',
                    // Defensive: even if the two lines below ever run slightly tall for a given
                    // font, clip them to this row's own box instead of letting them spill into —
                    // and get visually painted over by — the next row underneath.
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      lineHeight: `${PRINT_TITLE_LINE_HEIGHT}px`,
                      height: PRINT_TITLE_LINE_HEIGHT,
                      fontWeight: t.isFolder ? 800 : 600,
                      color: isCritical ? '#e11d48' : '#0f172a',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {t.isFolder ? '📁 ' : ''}
                    {t.name}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      lineHeight: `${PRINT_SUBTITLE_LINE_HEIGHT}px`,
                      height: PRINT_SUBTITLE_LINE_HEIGHT,
                      color: '#64748b',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {res ? `${res.name} · ` : ''}
                    {t.type === 'milestone' ? 'Jalon' : `${t.duration} j`}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Timeline column */}
          <div style={{ width: timelineWidth, position: 'relative' }}>
            {/* Month band */}
            <div style={{ height: PRINT_MONTH_BAND_HEIGHT, display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              {monthLabels.map((lbl, idx) => (
                <div
                  key={`${lbl.monthText}-${idx}`}
                  style={{
                    width: lbl.span * dayWidth,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 800,
                    color: '#334155',
                    borderRight: '1px solid #e2e8f0',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {lbl.monthText}
                </div>
              ))}
            </div>

            {/* Day band — only broken down day-by-day (weekday initial + shading) once the
                zoomed-out width would still keep each day legible; beyond that the month/year
                band above is the only date reference, which keeps a decade-long export from
                rendering thousands of sliver-thin day cells for nothing. */}
            <div style={{ height: PRINT_DAY_BAND_HEIGHT, display: 'flex', borderBottom: '2px solid #cbd5e1', background: '#ffffff' }}>
              {showDayLabels &&
                dates.map((date, idx) => {
                  const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
                  return (
                    <div
                      key={idx}
                      style={{
                        width: dayWidth,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRight: '1px solid #f1f5f9',
                        background: isWeekend ? '#f1f5f9' : '#ffffff',
                        boxSizing: 'border-box',
                      }}
                    >
                      <span style={{ fontSize: 8, color: '#94a3b8', fontWeight: 700 }}>
                        {['D', 'L', 'M', 'M', 'J', 'V', 'S'][date.getUTCDay()]}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#1e293b' }}>{date.getUTCDate()}</span>
                    </div>
                  );
                })}
            </div>

            {/* Rows + bars */}
            {tasks.map(t => {
              const cpm = cpmResults.get(t.id);
              const isCritical = highlightCriticalPath && cpm?.isCritical;
              const startOffsetDays = cpm ? cpm.earlyStart : differenceInDays(parseDate(t.startDate), rangeStart);
              const durationDays = t.type === 'milestone' ? 1 : Math.max(1, t.duration);
              const leftPx = startOffsetDays * dayWidth;
              const widthPx = Math.max(4, durationDays * dayWidth);
              // Always show the task's own chosen color — critical path is indicated via the
              // border/ring styling only, so a custom color is never silently hidden.
              const barColor = resolveTaskColor(t.color);
              const textColor = isLightColor(barColor) ? '#0f172a' : '#ffffff';
              const dateRangeLabel = formatTaskDateRange(t.startDate, durationDays);
              const labelLeft = t.type === 'milestone' ? leftPx + dayWidth / 2 + 12 : leftPx + widthPx + 8;

              return (
                <div key={t.id} style={{ height: PRINT_ROW_HEIGHT, position: 'relative', borderBottom: '1px solid #f1f5f9' }}>
                  {t.isFolder ? (
                    <div
                      style={{
                        position: 'absolute',
                        top: PRINT_ROW_HEIGHT / 2 - 5,
                        left: leftPx,
                        width: widthPx,
                        height: 10,
                        background: barColor,
                        borderRadius: 3,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                      }}
                    />
                  ) : t.type === 'milestone' ? (
                    <div
                      style={{
                        position: 'absolute',
                        top: PRINT_ROW_HEIGHT / 2 - 8,
                        left: leftPx + dayWidth / 2 - 8,
                        width: 16,
                        height: 16,
                        transform: 'rotate(45deg)',
                        background: barColor,
                        border: `2px solid ${isCritical ? '#be123c' : '#334155'}`,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        position: 'absolute',
                        top: PRINT_ROW_HEIGHT / 2 - 11,
                        left: leftPx,
                        width: widthPx,
                        height: 22,
                        borderRadius: 5,
                        background: barColor,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${t.progress}%`,
                          background: 'rgba(0,0,0,0.22)',
                        }}
                      />
                      {widthPx > 34 && (
                        <span
                          style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            paddingRight: 5,
                            fontSize: 9,
                            fontWeight: 700,
                            color: textColor,
                          }}
                        >
                          {t.progress}%
                        </span>
                      )}
                    </div>
                  )}

                  {/* Name + full, non-truncated date range — always shown regardless of bar width */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: labelLeft,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ fontSize: 10, fontWeight: t.isFolder ? 800 : 600, color: isCritical ? '#e11d48' : '#1e293b' }}>
                      {t.name}
                    </span>
                    <span style={{ fontSize: 9, color: '#94a3b8' }}>· {dateRangeLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
