/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { Resource } from '../../types';
import { NewTaskInput } from '../../hooks/useGanttData';
import { DEFAULT_TASK_COLOR } from '../../utils/colors';
import ColorPicker from '../ColorPicker';

interface AddTaskFormProps {
  resources: Resource[];
  onSubmit: (input: NewTaskInput) => void;
  onCancel: () => void;
}

export default function AddTaskForm({ resources, onSubmit, onCancel }: AddTaskFormProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('2026-06-18');
  const [duration, setDuration] = useState(4);
  const [resourceId, setResourceId] = useState('');
  const [color, setColor] = useState(DEFAULT_TASK_COLOR);
  const [type, setType] = useState<'task' | 'milestone'>('task');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name, startDate, duration, resourceId: resourceId || undefined, color, type });
  }

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-slate-850 rounded-xl p-3 border border-slate-700 space-y-3 overflow-hidden text-xs shadow-inner"
      onSubmit={handleSubmit}
    >
      <div>
        <label className="block text-slate-400 font-medium mb-1">Nom de la tâche *</label>
        <input
          type="text"
          required
          placeholder="Ex: Validation de l'UI"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 text-white rounded px-2.5 py-1.5 focus:outline-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-slate-400 font-medium mb-1">Type</label>
          <select
            value={type}
            onChange={e => setType(e.target.value as 'task' | 'milestone')}
            className="w-full bg-slate-900 border border-slate-700 text-white rounded px-2 py-1 focus:outline-blue-500"
          >
            <option value="task">Tâche Standard</option>
            <option value="milestone">Jalon (Milestone)</option>
          </select>
        </div>
        <div>
          <label className="block text-slate-400 font-medium mb-1">Date début</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-white rounded px-2 py-1 focus:outline-blue-500"
          />
        </div>
      </div>

      {type === 'task' && (
        <div>
          <label className="block text-slate-400 font-medium mb-1">Durée ({duration} jours)</label>
          <input
            type="range"
            min="1"
            max="21"
            value={duration}
            onChange={e => setDuration(Number(e.target.value))}
            className="w-full text-blue-500 cursor-pointer"
          />
        </div>
      )}

      <div>
        <label className="block text-slate-400 font-medium mb-1">Responsable</label>
        <select
          value={resourceId}
          onChange={e => setResourceId(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 text-white rounded px-2 py-1 focus:outline-blue-500"
        >
          <option value="">Non assigné</option>
          {resources.map(res => (
            <option key={res.id} value={res.id}>{res.name}</option>
          ))}
        </select>
      </div>

      <ColorPicker label="Couleur" value={color} onChange={setColor} />

      <div className="flex justify-end space-x-2 pt-1.5 border-t border-slate-750">
        <button
          type="button"
          onClick={onCancel}
          className="px-2.5 py-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-650 border border-slate-600 transition-colors cursor-pointer"
        >
          Annuler
        </button>
        <button
          type="submit"
          className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors font-semibold cursor-pointer"
        >
          Valider
        </button>
      </div>
    </motion.form>
  );
}
