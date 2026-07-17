/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Eye, EyeOff, FolderTree, HelpCircle, Info, Layers } from 'lucide-react';
import { Resource } from '../../types';

/** Quick-pick row counts for the progressive display limit — kept small on purpose so a
 * heavy 500+ milestone import never has to render everything just to show the first screenful. */
const DISPLAY_LIMIT_PRESETS = [50, 100, 200];

/** How many "Niveau N" buttons to offer at most — beyond this, individual folder chevrons
 * still work fine, we just don't want a wall of buttons on very deeply nested imports. */
const MAX_DEPTH_SHORTCUT_BUTTONS = 4;

interface TaskControlsPanelProps {
  resources: Resource[];
  filterResourceId: string;
  onFilterResourceChange: (resourceId: string) => void;
  onSetAllTasksSelected: (selected: boolean) => void;
  displayLimit: number;
  totalCount: number;
  onSetDisplayLimit: (limit: number) => void;
  hasFolders: boolean;
  maxFolderDepth: number;
  onSetCollapseDepth: (depth: number) => void;
}

export default function TaskControlsPanel({
  resources,
  filterResourceId,
  onFilterResourceChange,
  onSetAllTasksSelected,
  displayLimit,
  totalCount,
  onSetDisplayLimit,
  hasFolders,
  maxFolderDepth,
  onSetCollapseDepth,
}: TaskControlsPanelProps) {
  return (
    <div className="space-y-4">
      {/* RESOURCE SELECTION FILTER */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1">Filtrer par responsable</label>
        <select
          value={filterResourceId}
          onChange={e => onFilterResourceChange(e.target.value)}
          className="w-full bg-slate-900 border border-slate-705 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-blue-500"
        >
          <option value="all">Tout le projet (Toutes les ressources)</option>
          {resources.map(res => (
            <option key={res.id} value={res.id}>{res.name}</option>
          ))}
        </select>
      </div>

      <div className="h-px bg-slate-800"></div>

      {/* BULK VISIBILITY SHORTCUT — per-row visibility is controlled via the eye icon
          directly on each task in the list; these two just cover "everything at once". */}
      <div className="bg-slate-850 rounded-xl p-3 border border-slate-700 space-y-2 text-xs">
        <h4 className="font-semibold text-slate-300 flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5 text-blue-400" />
          Visibilité (écran + PDF)
        </h4>
        <p className="text-[10px] text-slate-500">
          Utilisez l'œil 👁️ sur chaque tâche pour la masquer individuellement, ou basculez tout d'un coup ici :
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSetAllTasksSelected(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer font-semibold"
          >
            <Eye className="h-3 w-3" /> Tout afficher
          </button>
          <button
            type="button"
            onClick={() => onSetAllTasksSelected(false)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer font-semibold"
          >
            <EyeOff className="h-3 w-3" /> Tout masquer
          </button>
        </div>
      </div>

      <div className="h-px bg-slate-800"></div>

      {/* PROGRESSIVE DISPLAY LIMIT SHORTCUTS — heavy imports (500+ jalons) would lag if every
          row/bar rendered at once, so only `displayLimit` rows render up front; the rest loads
          automatically as you scroll near the bottom, or jump straight to a preset here. */}
      <div className="bg-slate-850 rounded-xl p-3 border border-slate-700 space-y-2 text-xs">
        <h4 className="font-semibold text-slate-300 flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-blue-400" />
          Nombre de jalons/tâches affichés
        </h4>
        <p className="text-[10px] text-slate-500">
          Limite l'affichage pour rester fluide sur les gros plannings — le reste se charge automatiquement quand vous scrollez vers le bas.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DISPLAY_LIMIT_PRESETS.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => onSetDisplayLimit(n)}
              disabled={n >= totalCount}
              className={`px-2.5 py-1 rounded-lg border font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                displayLimit === n
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onSetDisplayLimit(totalCount)}
            className={`px-2.5 py-1 rounded-lg border font-semibold transition-colors cursor-pointer ${
              displayLimit >= totalCount
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Tout
          </button>
        </div>
        <p className="text-[10px] text-slate-500 font-mono">
          {Math.min(displayLimit, totalCount)} / {totalCount} affichés
        </p>
      </div>

      {hasFolders && (
        <>
          <div className="h-px bg-slate-800"></div>

          {/* FOLDER DEPTH SHORTCUT — one click to unfold down to a given nesting level instead
              of clicking every chevron by hand on a deeply-nested import. */}
          <div className="bg-slate-850 rounded-xl p-3 border border-slate-700 space-y-2 text-xs">
            <h4 className="font-semibold text-slate-300 flex items-center gap-1.5">
              <FolderTree className="h-3.5 w-3.5 text-blue-400" />
              Profondeur d'affichage des dossiers
            </h4>
            <p className="text-[10px] text-slate-500">
              Replie automatiquement tous les dossiers au-delà du niveau choisi.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onSetCollapseDepth(0)}
                className="px-2.5 py-1 rounded-lg border font-semibold transition-colors cursor-pointer bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Racine
              </button>
              {Array.from({ length: Math.min(maxFolderDepth, MAX_DEPTH_SHORTCUT_BUTTONS) }, (_, i) => i + 1).map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => onSetCollapseDepth(lvl)}
                  className="px-2.5 py-1 rounded-lg border font-semibold transition-colors cursor-pointer bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  Niveau {lvl}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onSetCollapseDepth(maxFolderDepth + 1)}
                className="px-2.5 py-1 rounded-lg border font-semibold transition-colors cursor-pointer bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Tout déplier
              </button>
            </div>
          </div>
        </>
      )}

      <div className="h-px bg-slate-800"></div>

      {/* HELP BOX / TIPS */}
      <div className="p-3 bg-blue-950/20 rounded-xl border border-blue-900/30 text-xs relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-5 blur-[1px] transform translate-y-3 translate-x-3">
          <HelpCircle className="h-20 w-20 text-blue-900" />
        </div>
        <h4 className="font-semibold text-blue-300 mb-1 flex items-center gap-1">
          <Info className="h-3 w-3 text-blue-400" /> Comment synchroniser ?
        </h4>
        <ul className="list-disc list-inside text-slate-300 space-y-1.5 pl-0.5 leading-relaxed opacity-90">
          <li>Glissez-déposez une tâche dans la liste pour la réordonner ou changer son dossier parent.</li>
          <li>Cliquez sur <b>Ordonnancer (Auto)</b> pour rétablir une planification optimale respectant chaque dépendance.</li>
          <li>Saisissez l'avancement d'une tâche pour rafraîchir en temps réel le diagramme.</li>
        </ul>
      </div>
    </div>
  );
}
