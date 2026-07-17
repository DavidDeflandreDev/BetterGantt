/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { UserPlus } from 'lucide-react';
import { Task, Resource } from '../../types';
import { NewResourceInput } from '../../hooks/useGanttData';
import AddResourceForm from './AddResourceForm';

interface ResourcesPanelProps {
  tasks: Task[];
  resources: Resource[];
  onAddResource: (input: NewResourceInput) => void;
}

export default function ResourcesPanel({ tasks, resources, onAddResource }: ResourcesPanelProps) {
  const [showResourceForm, setShowResourceForm] = useState(false);

  return (
    <div className="space-y-4 text-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Membres de l'équipe</h3>
        <button
          onClick={() => setShowResourceForm(!showResourceForm)}
          className="flex items-center space-x-1 text-xs font-semibold text-blue-400 hover:text-blue-300 bg-slate-850 hover:bg-slate-800 px-2.5 py-1.5 rounded-md border border-slate-700 transition-colors cursor-pointer"
        >
          <UserPlus className="h-3 w-3" />
          <span>Ajouter</span>
        </button>
      </div>

      <AnimatePresence>
        {showResourceForm && (
          <AddResourceForm
            onCancel={() => setShowResourceForm(false)}
            onSubmit={input => {
              onAddResource(input);
              setShowResourceForm(false);
            }}
          />
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {resources.map(res => {
          const assignedTasks = tasks.filter(t => t.resourceId === res.id);
          return (
            <div key={res.id} className="p-3 bg-slate-800/40 rounded-xl border border-slate-800/80 flex items-start space-x-3 hover:bg-slate-800/70 transition-all shadow-sm">
              <div className={`h-8 w-8 rounded-full ${res.avatarColor} text-white flex items-center justify-center font-bold shrink-0 text-sm`}>
                {res.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-white truncate">{res.name}</h4>
                <p className="text-slate-400 text-[11px] truncate mb-1">{res.role}</p>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded font-mono">
                    {assignedTasks.length} tâches assignées
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
