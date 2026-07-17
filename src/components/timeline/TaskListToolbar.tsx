/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Plus, Search, X } from 'lucide-react';
import { Resource } from '../../types';
import { NewTaskInput } from '../../hooks/useGanttData';
import AddTaskForm from '../sidebar/AddTaskForm';

interface TaskListToolbarProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  resources: Resource[];
  onAddTask: (input: NewTaskInput) => void;
}

export default function TaskListToolbar({ searchQuery, onSearchQueryChange, resources, onAddTask }: TaskListToolbarProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="bg-slate-800 border-b border-slate-700 px-6 py-2.5 flex flex-col gap-2.5 shrink-0" id="gantt-task-list-toolbar">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex items-center w-full max-w-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchQueryChange(e.target.value)}
            placeholder="Rechercher une tâche..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-200 focus:outline-blue-500 placeholder-slate-500"
          />
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchQueryChange('')}
              className="absolute right-2 text-slate-500 hover:text-white cursor-pointer"
              title="Effacer la recherche"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center space-x-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 bg-slate-850 hover:bg-slate-800 px-3 py-1.5 rounded-md border border-slate-700 transition-colors cursor-pointer shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Nouvelle tâche</span>
        </button>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <AddTaskForm
            resources={resources}
            onCancel={() => setShowAddForm(false)}
            onSubmit={input => {
              onAddTask(input);
              setShowAddForm(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
