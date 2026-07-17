/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Task } from '../../types';
import { CPMResult, parseDate, differenceInDays } from '../../utils/cpm';
import { ROW_HEIGHT } from './constants';

interface DependencyArrowsProps {
  slicedTasks: Task[];
  cpmResults: Map<string, CPMResult>;
  timelineDates: Date[];
  highlightCriticalPath: boolean;
  dayWidth: number;
}

export default function DependencyArrows({ slicedTasks, cpmResults, timelineDates, highlightCriticalPath, dayWidth }: DependencyArrowsProps) {
  return (
    <svg
      className="absolute pointer-events-none top-20 bottom-0 left-0 right-0 z-10"
      style={{ width: '100%', height: `${slicedTasks.length * ROW_HEIGHT}px` }}
    >
      <defs>
        <marker id="arrow-normal" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 6 5 L 0 8.5 z" fill="#3b82f6" />
        </marker>
        <marker id="arrow-conflict" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 6 5 L 0 8.5 z" fill="#f87171" />
        </marker>
      </defs>

      {slicedTasks.map((t, blockIdx) => {
        if (!t.dependencies || t.dependencies.length === 0) return null;
        if (t.selected === false) return null; // hidden via the eye toggle — no bar to point at

        const cpm = cpmResults.get(t.id);
        const tStartIdx = cpm ? cpm.earlyStart : differenceInDays(parseDate(t.startDate), timelineDates[0]);
        const startX = tStartIdx * dayWidth;
        const yCurrent = blockIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

        return t.dependencies.map(parentId => {
          const parentIdx = slicedTasks.findIndex(pt => pt.id === parentId);
          if (parentIdx === -1) return null; // Parent filtered out or non-existent

          const parentTask = slicedTasks[parentIdx];
          if (parentTask.selected === false) return null; // hidden via the eye toggle — no bar to point from
          const parentCPM = cpmResults.get(parentId);

          const pStartIdx = parentCPM ? parentCPM.earlyStart : differenceInDays(parseDate(parentTask.startDate), timelineDates[0]);
          const pDur = parentTask.type === 'milestone' ? 1 : Math.max(1, parentTask.duration);
          const pEndIdx = pStartIdx + pDur;
          const endX = pEndIdx * dayWidth;
          const yParent = parentIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

          const hasConflict = pEndIdx > tStartIdx;

          let d = '';
          if (startX >= endX + 10) {
            const midX = endX + (startX - endX) / 2;
            d = `M ${endX} ${yParent} L ${midX} ${yParent} L ${midX} ${yCurrent} L ${startX} ${yCurrent}`;
          } else {
            const midY = yParent + (yCurrent - yParent) / 2;
            d = `M ${endX} ${yParent} L ${endX + 12} ${yParent} L ${endX + 12} ${midY} L ${startX - 12} ${midY} L ${startX - 12} ${yCurrent} L ${startX} ${yCurrent}`;
          }

          const strokeColor = hasConflict ? '#ef4444' : (highlightCriticalPath && cpm?.isCritical && parentCPM?.isCritical ? '#f43f5e' : '#475569');

          return (
            <path
              key={`${parentId}-${t.id}`}
              d={d}
              fill="none"
              stroke={strokeColor}
              strokeWidth={highlightCriticalPath && cpm?.isCritical && parentCPM?.isCritical ? 2.5 : 1.5}
              strokeDasharray={hasConflict ? '4,3' : undefined}
              markerEnd={hasConflict ? 'url(#arrow-conflict)' : 'url(#arrow-normal)'}
              className="opacity-75"
            />
          );
        });
      })}
    </svg>
  );
}
