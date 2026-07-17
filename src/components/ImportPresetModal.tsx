/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gauge, Layers, Milestone, ListTree, X } from 'lucide-react';
import { PendingImportStats } from '../hooks/useGanttData';
import { TimelineZoom, ZOOM_LABELS, ZOOM_DESCRIPTIONS } from './timeline/constants';

interface ImportPresetModalProps {
  projectName: string;
  stats: PendingImportStats;
  onConfirm: (zoom: TimelineZoom, collapseDepth: number) => void;
  onCancel: () => void;
}

const ZOOM_ORDER: TimelineZoom[] = ['auto', 'day', 'week', 'month', 'quarter', 'year'];

const COLLAPSE_PRESETS: { label: string; depth: number; description: string }[] = [
  { label: 'Tout déplier', depth: Infinity, description: 'Voir toutes les tâches immédiatement' },
  { label: 'Replier niveau 2+', depth: 2, description: "N'afficher que les 2 premiers niveaux" },
  { label: 'Replier niveau 1+', depth: 1, description: "N'afficher que les groupes racine" },
  { label: 'Tout replier', depth: 0, description: 'Vue la plus compacte, à déplier au clic' },
];

export default function ImportPresetModal({ projectName, stats, onConfirm, onCancel }: ImportPresetModalProps) {
  // 'Auto' fits the whole project into the available width by default — the fastest way to
  // get an immediately readable overview of a large import, with no manual zoom fiddling.
  const [zoom, setZoom] = useState<TimelineZoom>('auto');
  const [collapseDepth, setCollapseDepth] = useState<number>(stats.folderCount > 0 ? 1 : Infinity);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 15 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl text-slate-200 overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Gauge className="h-4 w-4 text-blue-400" />
                Projet volumineux détecté
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-sm">{projectName}</p>
            </div>
            <button type="button" onClick={onCancel} className="text-slate-500 hover:text-white cursor-pointer p-1 rounded hover:bg-slate-800">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-850 border border-slate-700 rounded-xl py-2.5">
                <div className="text-lg font-bold text-white">{stats.totalTasks}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wide">Tâches</div>
              </div>
              <div className="bg-slate-850 border border-slate-700 rounded-xl py-2.5">
                <div className="text-lg font-bold text-rose-400">{stats.milestoneCount}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wide flex items-center justify-center gap-1">
                  <Milestone className="h-2.5 w-2.5" /> Jalons
                </div>
              </div>
              <div className="bg-slate-850 border border-slate-700 rounded-xl py-2.5">
                <div className="text-lg font-bold text-amber-400">{stats.folderCount}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wide flex items-center justify-center gap-1">
                  <Layers className="h-2.5 w-2.5" /> Groupes
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 text-center">
              Du <b className="text-slate-200">{stats.startLabel}</b> au <b className="text-slate-200">{stats.endLabel}</b> ({stats.spanDays} jours)
            </p>

            <p className="text-xs text-slate-400 leading-relaxed bg-blue-950/20 border border-blue-900/30 rounded-xl px-3 py-2.5">
              Ce projet est volumineux : choisissez un niveau de zoom et de repliement de départ pour garder l'interface lisible
              dès l'ouverture. Vous pourrez tout ajuster ensuite.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Niveau de zoom initial</label>
              <div className="flex items-center bg-slate-900/60 border border-slate-700 rounded-lg p-0.5 gap-0.5">
                {ZOOM_ORDER.map(z => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setZoom(z)}
                    title={ZOOM_DESCRIPTIONS[z]}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-md cursor-pointer transition-colors ${
                      zoom === z ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {ZOOM_LABELS[z]}
                  </button>
                ))}
              </div>
            </div>

            {stats.folderCount > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                  <ListTree className="h-3.5 w-3.5 text-slate-400" /> Repliement initial des groupes
                </label>
                <div className="space-y-1.5">
                  {COLLAPSE_PRESETS.map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setCollapseDepth(preset.depth)}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                        collapseDepth === preset.depth
                          ? 'bg-slate-800 border-blue-600/60 text-white'
                          : 'bg-slate-850 border-slate-700 text-slate-300 hover:bg-slate-800/70'
                      }`}
                    >
                      <span className="font-semibold">{preset.label}</span>
                      <span className="text-slate-500"> — {preset.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-800 bg-slate-900/60">
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer text-xs font-semibold"
            >
              Annuler l'import
            </button>
            <button
              type="button"
              onClick={() => onConfirm(zoom, collapseDepth)}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors cursor-pointer text-xs font-bold shadow"
            >
              Ouvrir le projet
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
