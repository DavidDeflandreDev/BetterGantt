/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Calendar, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { TimelineZoom, ZOOM_LABELS, ZOOM_DESCRIPTIONS } from './constants';

interface TimelineLegendProps {
  timelineDates: Date[];
  zoom: TimelineZoom;
  onZoomChange: (zoom: TimelineZoom) => void;
  hasFolders: boolean;
  onCollapseAll: () => void;
  onExpandAll: () => void;
}

const ZOOM_ORDER: TimelineZoom[] = ['auto', 'day', 'week', 'month', 'quarter', 'year'];

export default function TimelineLegend({ timelineDates, zoom, onZoomChange, hasFolders, onCollapseAll, onExpandAll }: TimelineLegendProps) {
  return (
    <div className="bg-slate-800 border-b border-slate-700 px-6 py-2.5 flex flex-wrap items-center justify-between gap-y-2 shrink-0" id="gantt-secondary-control">
      <div className="flex items-center space-x-4">
        <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-blue-400" />
          Planning du <b>{timelineDates[0]?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</b> au{' '}
          <b>{timelineDates[timelineDates.length - 1]?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</b>
        </span>
      </div>

      <div className="flex items-center gap-3 flex-wrap justify-end">
        <div className="flex items-center space-x-3.5 text-xs font-semibold">
          <div className="flex items-center space-x-1">
            <span className="h-2 w-4 bg-blue-500 rounded"></span>
            <span className="text-slate-400 text-xs font-normal">Tâche Standard</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="h-3 w-3 bg-rose-500 rotate-45 transform inline-block"></span>
            <span className="text-slate-400 text-xs font-normal">Jalon (Milestone)</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="h-1 w-4 border-t-2 border-dashed border-rose-500 inline-block"></span>
            <span className="text-slate-400 text-xs font-normal">Chemin Critique</span>
          </div>
        </div>

        {hasFolders && (
          <div className="flex items-center gap-1 border-l border-slate-700 pl-3">
            <button
              type="button"
              onClick={onExpandAll}
              title="Tout déplier"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 cursor-pointer transition-colors"
            >
              <ChevronsUpDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onCollapseAll}
              title="Tout replier"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 cursor-pointer transition-colors"
            >
              <ChevronsDownUp className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center bg-slate-900/60 border border-slate-700 rounded-lg p-0.5 gap-0.5">
          {ZOOM_ORDER.map(z => (
            <button
              key={z}
              type="button"
              onClick={() => onZoomChange(z)}
              title={ZOOM_DESCRIPTIONS[z]}
              className={`px-2 py-1 text-[10px] font-bold rounded-md cursor-pointer transition-colors ${
                zoom === z ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {ZOOM_LABELS[z]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
