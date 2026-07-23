/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MonthLabel } from '../../utils/timeline';
import { DAY_TEXT_MIN_WIDTH } from './constants';

interface TimelineHeaderProps {
  monthLabels: MonthLabel[];
  timelineDates: Date[];
  todayIndex: number;
  dayWidth: number;
  /** True when the top band groups by year (the 'année' zoom tier) rather than by month —
   * the day row's tick marks should then fall on year boundaries instead of every month start,
   * otherwise a decade-long view gets a tick every month for no reason. */
  isYearGrouped: boolean;
}

export default function TimelineHeader({ monthLabels, timelineDates, todayIndex, dayWidth, isYearGrouped }: TimelineHeaderProps) {
  const showDayText = dayWidth >= DAY_TEXT_MIN_WIDTH;

  return (
    <div className="sticky top-0 z-10 bg-slate-800/95 backdrop-blur-md shadow select-none">
      {/* Top: Months row */}
      <div className="h-10 flex border-b border-slate-700">
        {monthLabels.map((lbl, idx) => (
          <div
            key={`${lbl.monthText}-${idx}`}
            className="border-r border-slate-700 text-[11px] font-bold text-slate-300 flex items-center justify-center tracking-tight shrink-0 overflow-hidden px-0.5"
            style={{ width: `${lbl.span * dayWidth}px` }}
          >
            <span className="truncate">{lbl.monthText}</span>
          </div>
        ))}
      </div>

      {/* Bottom: Days columns indicators */}
      <div className="h-10 flex border-b border-slate-700 bg-slate-800/50">
        {timelineDates.map((date, idx) => {
          const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
          const isToday = idx === todayIndex;
          const isMonthStart = isYearGrouped
            ? date.getUTCMonth() === 0 && date.getUTCDate() === 1
            : date.getUTCDate() === 1;

          return (
            <div
              key={idx}
              className={`text-[9px] font-mono font-medium flex flex-col items-center justify-center shrink-0 ${
                showDayText ? 'border-r border-slate-700' : isMonthStart ? 'border-r border-slate-600' : ''
              } ${isWeekend ? 'bg-slate-900/60 text-slate-500' : 'text-slate-300'} ${
                isToday ? 'bg-blue-500/10 text-blue-400 font-bold border-r-blue-500/30' : ''
              }`}
              style={{ width: `${dayWidth}px` }}
            >
              {showDayText && (
                <>
                  <span>{['D', 'L', 'M', 'M', 'J', 'V', 'S'][date.getUTCDay()]}</span>
                  <span className="text-[11px] font-bold">{date.getUTCDate()}</span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
