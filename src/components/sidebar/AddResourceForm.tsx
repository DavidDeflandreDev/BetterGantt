/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { NewResourceInput } from '../../hooks/useGanttData';

interface AddResourceFormProps {
  onSubmit: (input: NewResourceInput) => void;
  onCancel: () => void;
}

export default function AddResourceForm({ onSubmit, onCancel }: AddResourceFormProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name, role });
  }

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-slate-850 rounded-xl p-3 border border-slate-700 space-y-3 text-xs shadow-inner"
      onSubmit={handleSubmit}
    >
      <div>
        <label className="block text-slate-400 font-medium mb-1">Prénom &amp; Nom</label>
        <input
          type="text"
          required
          placeholder="Ex: Élise Martin"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 text-white rounded px-2.5 py-1.5 focus:outline-blue-500"
        />
      </div>
      <div>
        <label className="block text-slate-400 font-medium mb-1">Rôle technique</label>
        <input
          type="text"
          placeholder="Ex: Consultant QA"
          value={role}
          onChange={e => setRole(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 text-white rounded px-2.5 py-1.5 focus:outline-blue-500"
        />
      </div>
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-2.5 py-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-650 border border-slate-600 transition-colors cursor-pointer"
        >
          Annuler
        </button>
        <button type="submit" className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-500 font-semibold cursor-pointer">
          Créer
        </button>
      </div>
    </motion.form>
  );
}
