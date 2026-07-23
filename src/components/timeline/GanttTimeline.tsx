/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { Task, Resource } from '../../types';
import { CPMResult, parseDate, differenceInDays } from '../../utils/cpm';
import { MonthLabel } from '../../utils/timeline';
import { ReorderTarget } from '../../utils/taskHierarchy';
import { ROW_HEIGHT } from './constants';
import TaskSheetColumn from './TaskSheetColumn';
import TimelineHeader from './TimelineHeader';
import DependencyArrows from './DependencyArrows';
import GanttBars from './GanttBars';

interface GanttTimelineProps {
  slicedTasks: Task[];
  resources: Resource[];
  cpmResults: Map<string, CPMResult>;
  highlightCriticalPath: boolean;
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  timelineDates: Date[];
  monthLabels: MonthLabel[];
  isYearGrouped: boolean;
  todayIndex: number;
  visibleTasksCount: number;
  displayLimit: number;
  onShowMore: () => void;
  dayWidth: number;
  collapsedFolderIds: Set<string>;
  onToggleFolderCollapse: (id: string) => void;
  taskDepthById: Map<string, number>;
  onReorderTask: (draggedId: string, target: ReorderTarget) => void;
  onToggleTaskSelection: (id: string) => void;
}

export default function GanttTimeline({
  slicedTasks,
  resources,
  cpmResults,
  highlightCriticalPath,
  selectedTaskId,
  onSelectTask,
  timelineDates,
  monthLabels,
  isYearGrouped,
  todayIndex,
  visibleTasksCount,
  displayLimit,
  onShowMore,
  dayWidth,
  collapsedFolderIds,
  onToggleFolderCollapse,
  taskDepthById,
  onReorderTask,
  onToggleTaskSelection,
}: GanttTimelineProps) {
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  // Kept in a ref so the scroll listeners below never need to be torn down/rebuilt just
  // because the parent re-created the callback on every render.
  const onShowMoreRef = useRef(onShowMore);
  onShowMoreRef.current = onShowMore;

  // Synchronise vertical scroll between the static sheet pane and the timeline pane, and
  // progressively raise the display limit as either pane nears its bottom — with hundreds of
  // milestones/tasks, rendering everything up front is what causes the lag, so we only ever
  // render `displayLimit` rows and grow it just-in-time instead of forcing a manual click.
  useEffect(() => {
    const rightPane = scrollViewportRef.current;
    const leftPane = document.getElementById('gantt-static-sheet-rows-container');
    if (!rightPane || !leftPane) return;

    const LOAD_MORE_THRESHOLD_PX = 400;
    const maybeLoadMore = (el: HTMLElement) => {
      if (el.scrollHeight - el.scrollTop - el.clientHeight < LOAD_MORE_THRESHOLD_PX) {
        onShowMoreRef.current();
      }
    };

    const handleRightScroll = () => {
      leftPane.scrollTop = rightPane.scrollTop;
      maybeLoadMore(rightPane);
    };
    rightPane.addEventListener('scroll', handleRightScroll, { passive: true });

    // The task-name column has its own scrollbar too — watch it directly so progressive
    // loading still kicks in if the user scrolls with the cursor over that side.
    const handleLeftScroll = () => maybeLoadMore(leftPane);
    leftPane.addEventListener('scroll', handleLeftScroll, { passive: true });

    return () => {
      rightPane.removeEventListener('scroll', handleRightScroll);
      leftPane.removeEventListener('scroll', handleLeftScroll);
    };
  }, [slicedTasks]);

  // When a task is selected (click, or from the Milestones panel), scroll so its bar's
  // START is brought into view — not just "the row somewhere on screen".
  useEffect(() => {
    if (!selectedTaskId) return;
    const el = scrollViewportRef.current;
    if (!el) return;

    const rowIndex = slicedTasks.findIndex(t => t.id === selectedTaskId);
    if (rowIndex === -1) return;
    const target = slicedTasks[rowIndex];

    const cpm = cpmResults.get(selectedTaskId);
    const startOffsetDays = cpm ? cpm.earlyStart : differenceInDays(parseDate(target.startDate), timelineDates[0]);
    const targetLeft = startOffsetDays * dayWidth;
    const targetTop = 80 + rowIndex * ROW_HEIGHT; // 80 = header band height (month row + day row)

    el.scrollTo({
      left: Math.max(0, targetLeft - 60),
      top: Math.max(0, targetTop - el.clientHeight / 2 + ROW_HEIGHT / 2),
      behavior: 'smooth',
    });
  }, [selectedTaskId, slicedTasks, dayWidth, cpmResults, timelineDates]);

  return (
    <div className="flex-1 flex overflow-hidden">
      <TaskSheetColumn
        slicedTasks={slicedTasks}
        resources={resources}
        cpmResults={cpmResults}
        highlightCriticalPath={highlightCriticalPath}
        selectedTaskId={selectedTaskId}
        onSelectTask={onSelectTask}
        visibleTasksCount={visibleTasksCount}
        displayLimit={displayLimit}
        onShowMore={onShowMore}
        collapsedFolderIds={collapsedFolderIds}
        onToggleFolderCollapse={onToggleFolderCollapse}
        taskDepthById={taskDepthById}
        onReorderTask={onReorderTask}
        onToggleTaskSelection={onToggleTaskSelection}
      />

      <div className="flex-1 overflow-auto relative bg-slate-900/40" id="gantt-panel-scheduler-viewport" ref={scrollViewportRef}>
        <div className="relative" style={{ width: `${timelineDates.length * dayWidth}px`, minHeight: '100%' }}>
          <TimelineHeader
            monthLabels={monthLabels}
            timelineDates={timelineDates}
            todayIndex={todayIndex}
            dayWidth={dayWidth}
            isYearGrouped={isYearGrouped}
          />

          {/* WEEKEND COLUMNS OVERLAY BACKGROUND HIGHLIGHTS */}
          <div className="pointer-events-none absolute top-20 bottom-0 left-0 right-0 flex">
            {timelineDates.map((date, idx) => {
              const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
              return (
                <div
                  key={`overlay-day-${idx}`}
                  className={`h-full border-r border-slate-800/40 shrink-0 ${isWeekend ? 'bg-slate-950/20' : ''}`}
                  style={{ width: `${dayWidth}px` }}
                />
              );
            })}
          </div>

          {/* TODAY marker blue vertical line */}
          {todayIndex >= 0 && (
            <div
              className="absolute top-10 bottom-0 pointer-events-none border-l-2 border-blue-500 z-10 flex flex-col animate-pulse"
              style={{ left: `${todayIndex * dayWidth}px` }}
            >
              <div className="bg-blue-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-r shadow-md select-none">
                AUJOURD'HUI ({timelineDates[todayIndex]?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })})
              </div>
            </div>
          )}

          <DependencyArrows
            slicedTasks={slicedTasks}
            cpmResults={cpmResults}
            timelineDates={timelineDates}
            highlightCriticalPath={highlightCriticalPath}
            dayWidth={dayWidth}
          />

          <GanttBars
            slicedTasks={slicedTasks}
            cpmResults={cpmResults}
            highlightCriticalPath={highlightCriticalPath}
            selectedTaskId={selectedTaskId}
            onSelectTask={onSelectTask}
            timelineDates={timelineDates}
            visibleTasksCount={visibleTasksCount}
            displayLimit={displayLimit}
            onShowMore={onShowMore}
            dayWidth={dayWidth}
          />
        </div>
      </div>
    </div>
  );
}
