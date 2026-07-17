/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { RefreshCw, Trash } from 'lucide-react';
import { Task, Resource } from '../types';
import ColorPicker from './ColorPicker';

interface TaskEditorDrawerProps {
  task: Task;
  allTasks: Task[];
  resources: Resource[];
  onUpdate: (updated: Task) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onAutoSchedule: () => void;
}

export default function TaskEditorDrawer({ task, allTasks, resources, onUpdate, onDelete, onClose, onAutoSchedule }: TaskEditorDrawerProps) {
  return (
    <motion.div
      initial={{ transform: 'translateY(100%)' }}
      animate={{ transform: 'translateY(0%)' }}
      exit={{ transform: 'translateY(100%)' }}
      className="bg-slate-850 border-t border-slate-700 shadow-2xl p-5 relative z-20 select-none text-slate-200"
      id="gantt-task-editor-drawer"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="h-6 w-2 bg-blue-500 rounded"></span>
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            Séquençage de la tâche : <span className="text-blue-400">"{task.name}"</span>
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onAutoSchedule}
            className="text-xs bg-slate-700 hover:bg-slate-650 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-650 font-semibold flex items-center gap-1 cursor-pointer"
            title="Résout toutes les collisions d'ordonnancement pour cette tâche"
          >
            <RefreshCw className="h-3 w-3 animate-spin-hover" /> Réordonner dépendances
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="text-xs bg-rose-950/40 hover:bg-rose-900/50 text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-lg border border-rose-900/50 font-semibold flex items-center gap-1 cursor-pointer"
            title="Supprimer cette tâche de la frise"
          >
            <Trash className="h-3 w-3" /> Supprimer
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold text-sm px-2.5 py-1.5 rounded bg-slate-700 hover:bg-slate-650 border border-slate-650 cursor-pointer"
          >
            Fermer ✕
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
        {/* Field group A: Name & category color tag */}
        <div className="space-y-3">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Intitulé de la tâche</label>
            <input
              type="text"
              value={task.name}
              onChange={e => onUpdate({ ...task, name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded px-3 py-2 focus:outline-blue-500 focus:bg-slate-950"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Format</label>
            <select
              value={task.type}
              onChange={e => {
                const val = e.target.value;
                if (val === 'milestone') {
                  onUpdate({ ...task, type: 'milestone', isFolder: false, duration: 1 });
                } else {
                  onUpdate({ ...task, type: 'task', isFolder: false, duration: task.duration <= 1 ? 4 : task.duration });
                }
              }}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded px-2.5 py-1.5 focus:outline-blue-500 focus:bg-slate-950"
            >
              <option value="task">Standard</option>
              <option value="milestone">Jalon</option>
            </select>
          </div>

          <ColorPicker label="Couleur" value={task.color} onChange={hex => onUpdate({ ...task, color: hex })} />
        </div>

        {/* Field group B: Dates scheduling & duration */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Date début</label>
              <input
                type="date"
                value={task.startDate}
                onChange={e => onUpdate({ ...task, startDate: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded px-2 py-1.5 focus:outline-blue-500 focus:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                {task.type === 'milestone' ? 'Durée (Figée)' : `Durée (${task.duration} jours)`}
              </label>
              <input
                type="number"
                min="1"
                max="30"
                disabled={task.type === 'milestone'}
                value={task.duration}
                onChange={e => onUpdate({ ...task, duration: Math.max(1, Number(e.target.value)) })}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded px-2.5 py-1.5 disabled:opacity-50 focus:outline-blue-500 focus:bg-slate-950"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-400 font-semibold mb-1">
              <span>Avancement réalisé</span>
              <span className="text-amber-400 font-bold">{task.progress}%</span>
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={task.progress}
                onChange={e => onUpdate({ ...task, progress: Number(e.target.value) })}
                className="w-full text-blue-500 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => onUpdate({ ...task, progress: 100 })}
                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded border border-emerald-500/20 cursor-pointer shrink-0"
              >
                Terminer
              </button>
            </div>
          </div>
        </div>

        {/* Field group C: Predecessors / Dependencies tree links */}
        <div className="space-y-2">
          <label className="block text-slate-400 font-semibold">Tâches antérieures requises (Liaisons)</label>

          <div className="bg-slate-900 rounded-lg border border-slate-700 p-2 max-h-24 overflow-y-auto space-y-1">
            {allTasks.filter(t => t.id !== task.id).map(t => {
              const isChecked = task.dependencies.includes(t.id);
              return (
                <label key={t.id} className="flex items-center space-x-2 text-[11px] text-slate-300 py-0.5 hover:bg-slate-800 px-1 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      const newDeps = isChecked ? task.dependencies.filter(id => id !== t.id) : [...task.dependencies, t.id];
                      onUpdate({ ...task, dependencies: newDeps });
                    }}
                    className="rounded text-blue-500 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer accent-blue-500 bg-slate-800 border-slate-700"
                  />
                  <span className="truncate">{t.name}</span>
                </label>
              );
            })}
            {allTasks.length <= 1 && <span className="text-slate-500 italic">Aucune autre tâche disponible.</span>}
          </div>
        </div>

        {/* Field group D: Resource allocation */}
        <div>
          <label className="block text-slate-400 font-semibold mb-1">Ressource assignée</label>
          <select
            value={task.resourceId || ''}
            onChange={e => onUpdate({ ...task, resourceId: e.target.value || undefined })}
            className="w-full bg-slate-900 border border-slate-700 text-white rounded px-2.5 py-1.5 focus:outline-blue-500 focus:bg-slate-950"
          >
            <option value="">Aucun membre (Non assigné)</option>
            {resources.map(res => (
              <option key={res.id} value={res.id}>{res.name}</option>
            ))}
          </select>
        </div>
      </div>
    </motion.div>
  );
}
