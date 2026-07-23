/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Task, Resource } from '../../types';
import { NewResourceInput } from '../../hooks/useGanttData';
import { useResizablePanel } from '../../hooks/useResizablePanel';
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
  const { size, collapsed, setCollapsed, isDragging, onDragStart } = useResizablePanel({
    storageKey: 'gantt_sidebar_width',
    defaultSize: 320,
    min: 220,
    max: 560,
    direction: 'horizontal',
  });

  if (collapsed) {
    return (
      <section className="w-8 bg-slate-900 border-r border-slate-700 flex flex-col shrink-0 items-center pt-2" id="gantt-sidebar">
        <button
          onClick={() => setCollapsed(false)}
          title="Afficher le panneau latéral"
          className="text-slate-400 hover:text-white hover:bg-slate-800 rounded p-1 cursor-pointer"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      </section>
    );
  }

  return (
    <section
      className="relative bg-slate-900 border-r border-slate-700 flex flex-col shrink-0 w-full"
      style={{ width: size, maxWidth: '100%' }}
      id="gantt-sidebar"
    >
      <div className="border-b border-slate-700 bg-slate-800/40 p-2 flex items-center gap-1 shrink-0">
        <div className="flex-1 flex space-x-1 min-w-0">
          <button
            onClick={() => setActiveTab('diagramme')}
            className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg cursor-pointer transition-colors truncate ${
              activeTab === 'diagramme' ? 'bg-slate-700 text-white shadow border border-slate-600' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Diagramme
          </button>
          <button
            onClick={() => setActiveTab('jalons')}
            className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg cursor-pointer transition-colors truncate ${
              activeTab === 'jalons' ? 'bg-slate-700 text-white shadow border border-slate-600' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Jalons {milestones.length > 0 ? `(${milestones.length})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('charges')}
            className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg cursor-pointer transition-colors truncate ${
              activeTab === 'charges' ? 'bg-slate-700 text-white shadow border border-slate-600' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Ressources
          </button>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          title="Masquer le panneau latéral"
          className="shrink-0 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded p-1.5 cursor-pointer"
        >
          <PanelLeftClose className="h-3.5 w-3.5" />
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

      {/* Drag handle: right edge */}
      <div
        onPointerDown={onDragStart}
        className="hidden md:block absolute top-0 right-0 -mr-1 w-2 h-full cursor-col-resize z-10 group"
        title="Glisser pour redimensionner"
      >
        <div className={`h-full w-px mx-auto transition-colors ${isDragging ? 'bg-blue-500 w-0.5' : 'bg-transparent group-hover:bg-blue-500/60'}`} />
      </div>
    </section>
  );
}
