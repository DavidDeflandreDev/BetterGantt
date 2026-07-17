/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ChangeEvent } from 'react';
import { Clock, Download, Home, Printer, RefreshCw, Trash, Upload } from 'lucide-react';

interface AppHeaderProps {
  activeProjectName: string;
  onGoHome: () => void;
  onOpenPrintPreview: () => void;
  onAutoSchedule: () => void;
  highlightCriticalPath: boolean;
  onToggleCriticalPath: () => void;
  onExportJSON: () => void;
  onImportJSON: (e: ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
}

export default function AppHeader({
  activeProjectName,
  onGoHome,
  onOpenPrintPreview,
  onAutoSchedule,
  highlightCriticalPath,
  onToggleCriticalPath,
  onExportJSON,
  onImportJSON,
  onReset,
}: AppHeaderProps) {
  return (
    <header className="h-14 sticky top-0 z-30 border-b border-slate-700 bg-slate-800 flex items-center justify-between px-6 shrink-0 text-white" id="gantt-header">
      <div className="flex items-center space-x-3 min-w-0">
        <button
          onClick={onGoHome}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-slate-300 hover:text-white transition-all text-xs border border-slate-600 font-bold shrink-0 cursor-pointer shadow-sm"
          title="Retour au menu d'accueil"
        >
          <Home className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Accueil</span>
        </button>
        <div className="h-5 w-px bg-slate-700 shrink-0"></div>
        <div className="flex items-baseline min-w-0">
          <h1
            className="text-xs md:text-sm font-black tracking-tight text-white flex items-center gap-1.5 truncate max-w-[160px] md:max-w-xs lg:max-w-md"
            title={activeProjectName}
          >
            {activeProjectName}
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        <button
          type="button"
          onClick={onOpenPrintPreview}
          className="flex items-center space-x-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-md transition-all shadow-sm cursor-pointer hover:shadow"
          title="Lancer l'aperçu avant impression PDF épuré"
        >
          <Printer className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Impression PDF</span>
        </button>

        <button
          onClick={onAutoSchedule}
          className="flex items-center space-x-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-md transition-all shadow-sm cursor-pointer hover:shadow"
          title="Résout automatiquement tous les chevauchements et décale les tâches enfants pour respecter les dépendances"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Ordonnancer (Auto)</span>
        </button>

        <button
          onClick={onToggleCriticalPath}
          className={`flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all shadow-sm cursor-pointer border ${
            highlightCriticalPath
              ? 'bg-rose-600 text-white border-rose-700 shadow-rose-950/20'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600'
          }`}
          title="Met en évidence les tâches pour lesquelles aucun délai n'est possible sans retarder le projet"
        >
          <Clock className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Chemin Critique</span>
        </button>

        <div className="h-6 w-px bg-slate-700 mx-0.5"></div>

        <button
          onClick={onExportJSON}
          className="p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors border border-slate-600 cursor-pointer"
          title="Exporter vers JSON"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
        <label className="p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors border border-slate-600 cursor-pointer" title="Importer depuis JSON">
          <Upload className="h-3.5 w-3.5" />
          <input type="file" accept=".json" onChange={onImportJSON} className="hidden" />
        </label>
        <button
          onClick={onReset}
          className="p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-amber-400 hover:text-amber-300 transition-colors border border-slate-600 cursor-pointer"
          title="Réinitialiser le projet"
        >
          <Trash className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}
