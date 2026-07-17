/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { Flag, Search } from 'lucide-react';
import { Task, Resource } from '../../types';
import { resolveTaskColor } from '../../utils/colors';
import { formatFullDate } from '../../utils/timeline';

interface MilestonesPanelProps {
  milestones: Task[];
  resources: Resource[];
  selectedTaskId: string | null;
  onSelectMilestone: (id: string) => void;
}

export default function MilestonesPanel({ milestones, resources, selectedTaskId, onSelectMilestone }: MilestonesPanelProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (query.trim() === '') return milestones;
    const q = query.toLowerCase();
    return milestones.filter(m => m.name.toLowerCase().includes(q));
  }, [milestones, query]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Flag className="h-3.5 w-3.5 text-rose-400" />
          Jalons ({milestones.length})
        </h3>
      </div>

      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher un jalon..."
          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 focus:outline-blue-500 placeholder-slate-500"
        />
        <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 && (
          <div className="p-6 text-center text-slate-500 italic text-xs border border-dashed border-slate-800 rounded-xl">
            {milestones.length === 0 ? "Aucun jalon dans ce projet." : "Aucun jalon ne correspond à la recherche."}
          </div>
        )}

        {filtered.map(m => {
          const res = resources.find(r => r.id === m.resourceId);
          const isSelected = selectedTaskId === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelectMilestone(m.id)}
              className={`w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg border transition-colors cursor-pointer ${
                isSelected ? 'bg-slate-800 border-slate-600' : 'bg-slate-850 border-slate-700 hover:bg-slate-800/70 hover:border-slate-650'
              }`}
            >
              <span
                className="h-3 w-3 rotate-45 shrink-0 border"
                style={{ backgroundColor: resolveTaskColor(m.color), borderColor: 'rgba(255,255,255,0.25)' }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-200 truncate">{m.name}</div>
                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                  <span>{formatFullDate(m.startDate)}</span>
                  {res && <span className="truncate">· {res.name}</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
