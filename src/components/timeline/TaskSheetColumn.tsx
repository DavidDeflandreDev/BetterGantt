/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, type DragEvent } from 'react';
import { Folder, ChevronRight, ChevronDown, ArrowUpToLine, ArrowDownToLine, Eye, EyeOff } from 'lucide-react';
import { Task, Resource } from '../../types';
import { CPMResult } from '../../utils/cpm';
import { resolveTaskColor } from '../../utils/colors';
import { ReorderTarget } from '../../utils/taskHierarchy';
import { ROW_HEIGHT } from './constants';

interface TaskSheetColumnProps {
  slicedTasks: Task[];
  resources: Resource[];
  cpmResults: Map<string, CPMResult>;
  highlightCriticalPath: boolean;
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  visibleTasksCount: number;
  displayLimit: number;
  onShowMore: () => void;
  collapsedFolderIds: Set<string>;
  onToggleFolderCollapse: (id: string) => void;
  taskDepthById: Map<string, number>;
  onReorderTask: (draggedId: string, target: ReorderTarget) => void;
  onToggleTaskSelection: (id: string) => void;
}

export default function TaskSheetColumn({
  slicedTasks,
  resources,
  cpmResults,
  highlightCriticalPath,
  selectedTaskId,
  onSelectTask,
  visibleTasksCount,
  displayLimit,
  onShowMore,
  collapsedFolderIds,
  onToggleFolderCollapse,
  taskDepthById,
  onReorderTask,
  onToggleTaskSelection,
}: TaskSheetColumnProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<ReorderTarget | null>(null);

  function endDrag() {
    setDraggedId(null);
    setDropIndicator(null);
  }

  function handleRowDragOver(e: DragEvent<HTMLDivElement>, t: Task) {
    if (!draggedId || draggedId === t.id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;

    let placement: 'before' | 'after' | 'inside';
    if (t.isFolder) {
      placement = ratio < 0.25 ? 'before' : ratio > 0.75 ? 'after' : 'inside';
    } else {
      placement = ratio < 0.5 ? 'before' : 'after';
    }

    setDropIndicator({ id: t.id, placement });
  }

  function handleRowDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (draggedId && dropIndicator) onReorderTask(draggedId, dropIndicator);
    endDrag();
  }

  function handleEdgeDragOver(e: DragEvent<HTMLDivElement>, edge: 'start' | 'end') {
    if (!draggedId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropIndicator({ edge });
  }

  function handleEdgeDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (draggedId && dropIndicator) onReorderTask(draggedId, dropIndicator);
    endDrag();
  }

  const isDraggingSomething = draggedId !== null;
  const isDropStart = dropIndicator && 'edge' in dropIndicator && dropIndicator.edge === 'start';
  const isDropEnd = dropIndicator && 'edge' in dropIndicator && dropIndicator.edge === 'end';

  return (
    <div className="w-80 md:w-96 border-r border-slate-700 bg-slate-900 flex flex-col select-none shrink-0" id="gantt-static-sheet-column">
      <div className="h-20 bg-slate-800/60 border-b border-slate-700 flex items-end px-3 pb-2 text-[11px] font-bold text-slate-400 tracking-wider gap-2">
        <span className="w-5 shrink-0" />
        <div className="flex-1 flex items-center gap-1 min-w-0">🎯 TITRE DE LA TÂCHE</div>
        <div className="w-14 shrink-0 text-center">⏱️ DURÉE</div>
        <div className="w-11 shrink-0 text-center">👤 RESP.</div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80" id="gantt-static-sheet-rows-container">
        {slicedTasks.length === 0 ? (
          <div className="p-8 text-center text-slate-500 italic text-xs">
            Aucune tâche n'a été sélectionnée ou créée pour cette frise.
          </div>
        ) : (
          <>
            {/* Drop zone: very top of the list */}
            {isDraggingSomething && (
              <div
                onDragOver={e => handleEdgeDragOver(e, 'start')}
                onDrop={handleEdgeDrop}
                className={`flex items-center justify-center gap-1.5 text-[10px] font-bold transition-all ${
                  isDropStart ? 'h-9 bg-blue-600/30 text-blue-300 border-y-2 border-blue-500' : 'h-3 text-transparent'
                }`}
              >
                {isDropStart && (
                  <>
                    <ArrowUpToLine className="h-3 w-3" /> Déposer ici (tout en haut)
                  </>
                )}
              </div>
            )}

            {slicedTasks.map(t => {
              const assignedRes = resources.find(r => r.id === t.resourceId);
              const cpm = cpmResults.get(t.id);
              const isCritical = highlightCriticalPath && cpm?.isCritical;
              const isCollapsed = t.isFolder && collapsedFolderIds.has(t.id);
              const depth = taskDepthById.get(t.id) ?? 0;
              const isHidden = t.selected === false;

              const isDropBefore = dropIndicator && 'id' in dropIndicator && dropIndicator.id === t.id && dropIndicator.placement === 'before';
              const isDropAfter = dropIndicator && 'id' in dropIndicator && dropIndicator.id === t.id && dropIndicator.placement === 'after';
              const isDropInside = dropIndicator && 'id' in dropIndicator && dropIndicator.id === t.id && dropIndicator.placement === 'inside';
              const isBeingDragged = draggedId === t.id;

              return (
                <div
                  key={t.id}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', t.id);
                    setDraggedId(t.id);
                  }}
                  onDragEnd={endDrag}
                  onDragOver={e => handleRowDragOver(e, t)}
                  onDrop={handleRowDrop}
                  onClick={() => onSelectTask(t.id)}
                  className={`h-14 flex items-center px-3 gap-2 hover:bg-slate-800/40 cursor-grab active:cursor-grabbing transition-colors relative ${
                    selectedTaskId === t.id ? 'bg-slate-800' : ''
                  } ${isBeingDragged ? 'opacity-40' : ''} ${isDropInside ? 'bg-blue-600/20 ring-2 ring-inset ring-blue-500' : ''}`}
                  style={{ height: `${ROW_HEIGHT}px` }}
                >
                  {isDropBefore && <div className="absolute left-0 right-0 top-0 h-0.5 bg-blue-500 z-10" />}
                  {isDropAfter && <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-blue-500 z-10" />}

                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onToggleTaskSelection(t.id);
                    }}
                    title={isHidden ? 'Afficher cette tâche' : 'Masquer cette tâche (écran + PDF)'}
                    className={`w-5 shrink-0 flex items-center justify-center rounded hover:bg-slate-700/60 cursor-pointer ${
                      isHidden ? 'text-slate-600 hover:text-slate-400' : 'text-blue-400 hover:text-blue-300'
                    }`}
                  >
                    {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>

                  <div className={`flex-1 flex items-center pr-2 min-w-0 ${isHidden ? 'opacity-40' : ''}`} style={{ paddingLeft: `${depth * 14}px` }}>
                    {t.isFolder ? (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onToggleFolderCollapse(t.id);
                        }}
                        title={isCollapsed ? 'Déplier' : 'Replier'}
                        className="mr-1 shrink-0 text-slate-400 hover:text-white rounded hover:bg-slate-700/60 cursor-pointer"
                      >
                        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    ) : (
                      <span className="w-3.5 mr-1 shrink-0" />
                    )}
                    {t.isFolder ? (
                      <Folder className="h-3.5 w-3.5 text-amber-500 mr-1.5 shrink-0" />
                    ) : (
                      <span
                        className={`h-2.5 w-2.5 rounded-full mr-2 shrink-0 ${isCritical ? 'ring-4 ring-rose-950/40 animate-pulse' : ''}`}
                        style={{ backgroundColor: isCritical ? '#f43f5e' : resolveTaskColor(t.color) }}
                      ></span>
                    )}
                    <span
                      className={`text-xs font-semibold truncate ${isHidden ? 'italic text-slate-500' : t.isFolder ? 'font-bold text-slate-200' : isCritical ? 'text-rose-450 font-bold' : 'text-slate-300'}`}
                    >
                      {t.name}
                    </span>
                    {isCollapsed && <span className="ml-1.5 text-[9px] text-slate-500 font-mono shrink-0">(replié)</span>}
                    {isDropInside && <span className="ml-1.5 text-[9px] text-blue-400 font-bold shrink-0">→ déposer dedans</span>}
                  </div>

                  <div className={`w-14 shrink-0 text-center text-xs font-mono text-slate-400 ${isHidden ? 'opacity-40' : ''}`}>
                    {t.type === 'milestone' ? 'Jalon' : `${t.duration} j`}
                  </div>

                  <div className={`w-11 shrink-0 flex justify-center ${isHidden ? 'opacity-40' : ''}`}>
                    {assignedRes ? (
                      <div
                        className={`h-6 w-6 rounded-full text-white font-bold text-[10px] flex items-center justify-center shadow-sm ${assignedRes.avatarColor}`}
                        title={`${assignedRes.name} (${assignedRes.role})`}
                      >
                        {assignedRes.name.charAt(0)}
                      </div>
                    ) : (
                      <div className="h-6 w-6 rounded-full border border-dashed border-slate-700 text-slate-500 flex items-center justify-center text-[10px]" title="Non assigné">
                        -
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {visibleTasksCount > displayLimit && (
              <div
                onClick={onShowMore}
                className="h-14 flex items-center justify-center bg-slate-900/80 hover:bg-slate-800 text-blue-400 hover:text-blue-350 font-bold text-xs select-none cursor-pointer border-t border-slate-800 transition-colors py-4 px-3 sticky bottom-0"
                style={{ height: `${ROW_HEIGHT}px` }}
              >
                <span>⚡ Afficher la suite ({visibleTasksCount - displayLimit} restantes)</span>
              </div>
            )}

            {/* Drop zone: very bottom of the list */}
            {isDraggingSomething && (
              <div
                onDragOver={e => handleEdgeDragOver(e, 'end')}
                onDrop={handleEdgeDrop}
                className={`flex items-center justify-center gap-1.5 text-[10px] font-bold transition-all ${
                  isDropEnd ? 'h-9 bg-blue-600/30 text-blue-300 border-y-2 border-blue-500' : 'h-3 text-transparent'
                }`}
              >
                {isDropEnd && (
                  <>
                    <ArrowDownToLine className="h-3 w-3" /> Déposer ici (tout en bas)
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
