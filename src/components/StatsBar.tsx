/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlertTriangle, Calendar, Check, CheckSquare } from 'lucide-react';
import { ProjectStats } from '../types';

interface StatsBarProps {
  stats: ProjectStats;
}

export default function StatsBar({ stats }: StatsBarProps) {
  return (
    <section className="bg-slate-900 border-b border-slate-700 px-6 py-4 grid grid-cols-1 md:grid-cols-5 gap-4 shadow-sm" id="gantt-stats">
      <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-3 flex items-center space-x-4">
        <div className="bg-blue-500/10 p-2.5 rounded-lg text-blue-400 border border-blue-500/20">
          <CheckSquare className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold font-mono tracking-tight text-white">{stats.totalTasks}</div>
          <div className="text-xs text-slate-400">Tâches planifiées</div>
        </div>
      </div>

      <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-3 flex items-center space-x-4">
        <div className="bg-emerald-500/10 p-2.5 rounded-lg text-emerald-400 border border-emerald-500/20">
          <Check className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold font-mono tracking-tight text-white">
            {stats.completedTasks} <span className="text-sm font-normal text-slate-500">/ {stats.totalTasks}</span>
          </div>
          <div className="text-xs text-slate-400">Tâches achevées</div>
        </div>
      </div>

      <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-3 flex items-center space-x-4">
        <div className="bg-rose-500/10 p-2.5 rounded-lg text-rose-400 border border-rose-500/20">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold font-mono tracking-tight text-rose-400">{stats.criticalTasksCount}</div>
          <div className="text-xs text-slate-400">Chemin Critique</div>
        </div>
      </div>

      <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-3 flex items-center space-x-4">
        <div className="bg-sky-500/10 p-2.5 rounded-lg text-sky-400 border border-sky-500/20">
          <Calendar className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold font-mono tracking-tight text-white">{stats.totalDurationDays} j</div>
          <div className="text-xs text-slate-400">Durée totale projet</div>
        </div>
      </div>

      <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-3 flex items-center space-x-4">
        <div className="w-full">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">Avancement Global</span>
            <span className="text-xs font-bold font-mono text-amber-400">{stats.averageProgress}%</span>
          </div>
          <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden border border-slate-600">
            <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${stats.averageProgress}%` }}></div>
          </div>
        </div>
      </div>
    </section>
  );
}
