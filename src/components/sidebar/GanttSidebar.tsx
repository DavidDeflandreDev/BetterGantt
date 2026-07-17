/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Task, Resource } from '../../types';
import { NewResourceInput } from '../../hooks/useGanttData';
import TaskControlsPanel from './TaskControlsPanel';
import ResourcesPanel from './ResourcesPanel';
import MilestonesPanel from './MilestonesPanel';

interface GanttSidebarProps {
  tasks: Task[];
  resources: Resource[];
  filterResourceId: string;
  onFilterResourceChange: (resourceId: string) => void;
  onSetAllTasksSelected: (selected: boolean) => void;
  onAddResource: (input: NewResourceInput) => void;
  milestones: Task[];
  selectedTaskId: string | null;
  onSelectMilestone: (id: string) => void;
  displayLimit: number;
  totalCount: number;
  onSetDisplayLimit: (limit: number) => void;
  hasFolders: boolean;
  maxFolderDepth: number;
  onSetCollapseDepth: (depth: number) => void;
}

export default function GanttSidebar({
  tasks,
  resources,
  filterResourceId,
  onFilterResourceChange,
  onSetAllTasksSelected,
  onAddResource,
  milestones,
  selectedTaskId,
  onSelectMilestone,
  displayLimit,
  totalCount,
  onSetDisplayLimit,
  hasFolders,
  maxFolderDepth,
  onSetCollapseDepth,
}: GanttSidebarProps) {
  const [activeTab, setActiveTab] = useState<'diagramme' | 'jalons' | 'charges'>('diagramme');

  return (
    <section className="w-full md:w-80 bg-slate-900 border-r border-slate-700 flex flex-col shrink-0" id="gantt-sidebar">
      <div className="border-b border-slate-700 bg-slate-800/40 p-2 flex space-x-1 shrink-0">
        <button
          onClick={() => setActiveTab('diagramme')}
          className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
            activeTab === 'diagramme' ? 'bg-slate-700 text-white shadow border border-slate-600' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          Diagramme
        </button>
        <button
          onClick={() => setActiveTab('jalons')}
          className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
            activeTab === 'jalons' ? 'bg-slate-700 text-white shadow border border-slate-600' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          Jalons {milestones.length > 0 ? `(${milestones.length})` : ''}
        </button>
        <button
          onClick={() => setActiveTab('charges')}
          className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
            activeTab === 'charges' ? 'bg-slate-700 text-white shadow border border-slate-600' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          Ressources
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {activeTab === 'diagramme' && (
          <TaskControlsPanel
            resources={resources}
            filterResourceId={filterResourceId}
            onFilterResourceChange={onFilterResourceChange}
            onSetAllTasksSelected={onSetAllTasksSelected}
            displayLimit={displayLimit}
            totalCount={totalCount}
            onSetDisplayLimit={onSetDisplayLimit}
            hasFolders={hasFolders}
            maxFolderDepth={maxFolderDepth}
            onSetCollapseDepth={onSetCollapseDepth}
          />
        )}

        {activeTab === 'jalons' && (
          <MilestonesPanel
            milestones={milestones}
            resources={resources}
            selectedTaskId={selectedTaskId}
            onSelectMilestone={onSelectMilestone}
          />
        )}

        {activeTab === 'charges' && (
          <ResourcesPanel tasks={tasks} resources={resources} onAddResource={onAddResource} />
        )}
      </div>
    </section>
  );
}
