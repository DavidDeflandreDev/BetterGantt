/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Task } from '../../types';
import { CPMResult, parseDate, differenceInDays } from '../../utils/cpm';
import { resolveTaskColor, hexToRgba } from '../../utils/colors';
import { ROW_HEIGHT } from './constants';

interface GanttBarsProps {
  slicedTasks: Task[];
  cpmResults: Map<string, CPMResult>;
  highlightCriticalPath: boolean;
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  timelineDates: Date[];
  visibleTasksCount: number;
  displayLimit: number;
  onShowMore: () => void;
  dayWidth: number;
}

export default function GanttBars({
  slicedTasks,
  cpmResults,
  highlightCriticalPath,
  selectedTaskId,
  onSelectTask,
  timelineDates,
  visibleTasksCount,
  displayLimit,
  onShowMore,
  dayWidth,
}: GanttBarsProps) {
  if (slicedTasks.length === 0) {
    return <div className="absolute top-20 left-0 right-0 py-0 z-20" />;
  }

  // Below this width, inline/external text labels would overlap too much to be useful —
  // rely on the diamond/bar shape plus click-to-select or the Milestones panel instead.
  const showLabels = dayWidth >= 6;

  return (
    <div className="absolute top-20 left-0 right-0 py-0 z-20">
      {slicedTasks.map(t => {
        const cpm = cpmResults.get(t.id);

        const startOffsetOfDays = cpm ? cpm.earlyStart : differenceInDays(parseDate(t.startDate), timelineDates[0]);
        const durationOfDays = t.type === 'milestone' ? 1 : Math.max(1, t.duration);

        const leftPx = startOffsetOfDays * dayWidth;
        const widthPx = durationOfDays * dayWidth;

        const isCritical = highlightCriticalPath && cpm?.isCritical;
        // The task's own chosen color always shows as the fill — critical path is indicated
        // via the border/ring/text styling below, never by replacing the color outright
        // (that used to make color changes look like they "did nothing" on critical items).
        const barColor = resolveTaskColor(t.color);

        return (
          <div
            key={t.id}
            id={`gantt-bar-row-${t.id}`}
            className="h-14 flex items-center relative select-none"
            style={{ height: `${ROW_HEIGHT}px` }}
          >
            {selectedTaskId === t.id && (
              <div className="absolute left-0 right-0 h-full bg-slate-800/50 pointer-events-none border-y border-slate-700/60" />
            )}

            {t.selected === false ? (
              /* Hidden via the eye toggle — no bar/diamond on the plan, just a faint marker
                 so an empty timeline row doesn't look like a rendering glitch. */
              <div
                className="absolute h-0.5 border-t border-dashed border-slate-700"
                style={{ left: `${leftPx}px`, width: `${Math.max(widthPx, 6)}px` }}
              />
            ) : t.isFolder ? (
              /* FOLDER GROUP PARENT BRACKET RENDERING */
              <div
                onClick={e => {
                  e.stopPropagation();
                  onSelectTask(t.id);
                }}
                title={t.name}
                className="absolute h-6 flex items-center cursor-pointer group px-1 select-none"
                style={{ left: `${leftPx}px`, width: `${widthPx}px`, minWidth: '10px' }}
              >
                <div
                  className="absolute left-1 right-1 h-1.5 rounded"
                  style={{ backgroundColor: barColor, border: `1px solid ${hexToRgba(barColor, 0.6)}` }}
                />
                <div
                  className="absolute left-0 top-1 bottom-1 w-1.5 rounded-bl-sm"
                  style={{ backgroundColor: hexToRgba(barColor, 0.85), border: `1px solid ${hexToRgba(barColor, 0.6)}` }}
                />
                <div
                  className="absolute right-0 top-1 bottom-1 w-1.5 rounded-br-sm"
                  style={{ backgroundColor: hexToRgba(barColor, 0.85), border: `1px solid ${hexToRgba(barColor, 0.6)}` }}
                />
                {showLabels && (
                  <span className="absolute left-3 top-[-14px] text-[10px] font-bold text-amber-500 tracking-tight whitespace-nowrap opacity-90 group-hover:opacity-100 transition-opacity">
                    📂 {t.name}
                  </span>
                )}
              </div>
            ) : t.type === 'milestone' ? (
              /* MILESTONE RENDERING (DIAMOND SYMBOL) */
              <div
                onClick={e => {
                  e.stopPropagation();
                  onSelectTask(t.id);
                }}
                title={t.name}
                className="absolute cursor-pointer transition-transform hover:scale-125 flex items-center z-10"
                style={{ left: `${leftPx + dayWidth / 2 - 10}px` }}
              >
                <div
                  className={`h-5 w-5 rotate-45 border-2 shadow-md ${isCritical ? 'ring-2 ring-rose-950' : 'ring-2 ring-slate-800'}`}
                  style={{ backgroundColor: barColor, borderColor: isCritical ? '#be123c' : hexToRgba(barColor, 0.6) }}
                />
                {showLabels && (
                  <span className="ml-4 font-bold text-[10px] text-slate-200 tracking-tight whitespace-nowrap bg-slate-900/90 text-slate-200 backdrop-blur-xs px-1.5 py-0.5 rounded border border-slate-700">
                    {t.name}
                  </span>
                )}
              </div>
            ) : (
              /* STANDARD TASK GRAPHIC BAR */
              <div
                onClick={e => {
                  e.stopPropagation();
                  onSelectTask(t.id);
                }}
                title={t.name}
                className={`absolute h-7 rounded-lg shadow-sm border flex items-center justify-between cursor-pointer group px-2 text-[11px] select-none hover:shadow ${
                  isCritical ? 'ring-2 ring-rose-450/40' : ''
                }`}
                style={{
                  left: `${leftPx}px`,
                  width: `${widthPx}px`,
                  minWidth: '6px',
                  backgroundColor: hexToRgba(barColor, 0.22),
                  borderColor: hexToRgba(barColor, 0.55),
                  color: isCritical ? '#fda4af' : '#e2e8f0',
                }}
              >
                <div
                  className="absolute left-0 top-0 bottom-0 pointer-events-none transition-all"
                  style={{
                    width: `${t.progress}%`,
                    borderRadius: t.progress === 100 ? '7px' : '7px 0 0 7px',
                    backgroundColor: hexToRgba(barColor, 0.4),
                  }}
                />

                {showLabels && (
                  <>
                    <span className="font-semibold truncate z-10 pointer-events-none pl-0.5">{widthPx > 70 ? t.name : ''}</span>
                    <span className="font-mono text-[9px] opacity-75 shrink-0 z-10 pointer-events-none">{t.progress}%</span>

                    {widthPx <= 70 && (
                      <span className="absolute left-full ml-2 font-semibold text-[10px] text-slate-200 tracking-tight whitespace-nowrap bg-slate-900/90 backdrop-blur-xs px-1.5 py-0.5 rounded border border-slate-700/60 pointer-events-none z-30 shadow-md">
                        {t.name}
                      </span>
                    )}
                  </>
                )}

                {t.progress > 0 && t.progress < 100 && (
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-amber-500 animate-pulse rounded-r-md" />
                )}
              </div>
            )}
          </div>
        );
      })}
      {visibleTasksCount > displayLimit && (
        <div
          onClick={onShowMore}
          className="h-14 flex items-center bg-slate-900/20 hover:bg-slate-850/45 border-t border-slate-800/60 cursor-pointer select-none"
          style={{ height: `${ROW_HEIGHT}px`, width: `${timelineDates.length * dayWidth}px` }}
        >
          <span className="text-[10px] text-slate-500 italic pl-6 font-semibold flex items-center gap-1.5 animate-pulse">
            ⚡ Cliquez ici pour charger les {visibleTasksCount - displayLimit} jalons ou tâches restantes...
          </span>
        </div>
      )}
    </div>
  );
}
