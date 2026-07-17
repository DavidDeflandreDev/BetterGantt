/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { MouseEvent } from 'react';
import { ArrowRight, BookOpen, CheckSquare, Sparkles, Trash, Upload } from 'lucide-react';
import { SavedProject } from '../types';

interface HomeScreenProps {
  importedProjectsList: SavedProject[];
  onGoToDiagram: () => void;
  onImportGanttFile: (text: string, filename: string) => void;
  onSelectRecentProject: (project: SavedProject) => void;
  onDeleteRecentProject: (e: MouseEvent, id: string) => void;
  onLoadDemoProject: () => void;
}

function readGanttFile(file: File, onLoaded: (text: string, filename: string) => void) {
  const reader = new FileReader();
  reader.onload = evt => onLoaded(evt.target?.result as string, file.name);
  reader.readAsText(file, 'UTF-8');
}

export default function HomeScreen({
  importedProjectsList,
  onGoToDiagram,
  onImportGanttFile,
  onSelectRecentProject,
  onDeleteRecentProject,
  onLoadDemoProject,
}: HomeScreenProps) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 font-sans text-slate-100 overflow-y-auto pb-12">
      {/* UPPER BANNER */}
      <header className="py-5 px-[10%] border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md transform rotate-2">
            <Sparkles className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
              BetterGantt <span className="text-[10px] bg-slate-800 border border-slate-700 text-blue-400 px-1.5 py-0.5 rounded font-mono font-bold tracking-normal uppercase">Premium</span>
            </h1>
            <p className="text-[10.5px] text-slate-400">Visualiseur et exporteur de planifications industrielles</p>
          </div>
        </div>

        <button
          onClick={onGoToDiagram}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all text-sm shadow-md hover:shadow-lg cursor-pointer"
        >
          <span>Accéder au diagramme actif</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </header>

      {/* HERO BANNER SECTION */}
      <main className="w-full px-[10%] mt-10 flex flex-col md:flex-row gap-10 items-start">
        <div className="md:w-[70%] w-full flex flex-col justify-center space-y-6">
          <div className="inline-flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-[11px] text-blue-400 font-medium max-w-fit">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span>Processeur d'importation native &amp; filtrage intelligent</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight text-left">
            Importez et visualisez vos plans <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">GanttProject</span>
          </h2>

          <p className="text-slate-400 text-sm leading-relaxed text-left">
            Glissez vos fichiers de sauvegarde <span className="font-mono text-blue-300">.gantt</span> standards dans l'application pour les transformer instantanément en superbes diagrammes interactifs épurés. Choisissez individuellement d'afficher uniquement les tâches stratégiques, filtrez par dossiers et générez de magnifiques rapports PDF corporatifs.
          </p>

          {/* DRAG AND DROP ZONE */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                readGanttFile(e.dataTransfer.files[0], onImportGanttFile);
              }
            }}
            className="border-2 border-dashed rounded-2xl p-8 hover:border-slate-700 bg-slate-900/30 hover:bg-slate-900/60 border-slate-800 text-center cursor-pointer transition-all duration-250 flex flex-col items-center justify-center min-h-[180px]"
          >
            <input
              type="file"
              id="file-gantt-input"
              accept=".gantt"
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  readGanttFile(e.target.files[0], onImportGanttFile);
                }
              }}
              className="hidden"
            />
            <label htmlFor="file-gantt-input" className="cursor-pointer flex flex-col items-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 shadow-sm">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Glissez-déposez un fichier .gantt ici</p>
                <p className="text-[11px] text-slate-500 mt-1">ou cliquez pour explorer vos fichiers locaux</p>
              </div>
              <div className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-400 px-2.5 py-1 rounded-md max-w-xs mx-auto border border-slate-700/30">
                XML natif issu de GanttProject
              </div>
            </label>
          </div>

          {/* Quick specifications info card */}
          <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800/80 text-xs text-slate-400 space-y-1.5 leading-relaxed text-left">
            <div className="font-bold text-slate-300">Quels éléments sont lus lors du décodage .gantt ?</div>
            <div>• <b>Hiérarchie complète</b> : structure de dossiers de tâches, jalons et chemins d'adjacence parents-enfants.</div>
            <div>• <b>Arbre temporel</b> : calcul des dates de début, durées de réalisation et progressions.</div>
            <div>• <b>Dépendances</b> : tous les liens d'antériorités du chemin critique.</div>
            <div>• <b>Équipe d'intervenants</b> : chargement automatique des ressources humaines.</div>
          </div>
        </div>

        {/* RIGHT COLUMN: PROJECT HISTORY & RECENT LIST — floating card, not a sidebar */}
        <div className="md:w-[30%] w-full flex flex-col space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase flex items-center space-x-1.5">
                <BookOpen className="h-4 w-4 text-blue-400" />
                <span>Historique des projets ({importedProjectsList.length})</span>
              </h3>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {importedProjectsList.length === 0 ? (
                <div className="text-center p-6 border border-dashed border-slate-800 rounded-xl bg-slate-950/30 flex flex-col items-center justify-center py-8">
                  <p className="text-xs text-slate-400 font-medium">Aucun projet importé localement.</p>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed max-w-[240px] mx-auto text-center">Importez un fichier GanttProject ci-contre pour l'ajouter à vos raccourcis d'historiques.</p>
                </div>
              ) : (
                importedProjectsList.map(proj => (
                  <div
                    key={proj.id}
                    onClick={() => onSelectRecentProject(proj)}
                    className="group p-3 border border-slate-800 hover:border-slate-700 rounded-xl bg-slate-950/40 hover:bg-slate-800/40 cursor-pointer transition-all flex items-center justify-between text-left"
                  >
                    <div className="flex items-center space-x-3 truncate min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-900/10 group-hover:bg-blue-900/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-900/20">
                        <CheckSquare className="h-4 w-4" />
                      </div>
                      <div className="truncate">
                        <h4 className="text-xs font-bold text-white truncate max-w-[170px]">{proj.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {proj.tasks?.length || 0} tâches • {proj.resources?.length || 0} ressources
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-[9px] text-slate-500 font-mono">
                        {new Date(proj.lastModified).toLocaleDateString('fr', { day: 'numeric', month: 'short' })}
                      </span>
                      <button
                        onClick={e => onDeleteRecentProject(e, proj.id)}
                        className="p-1 rounded bg-slate-900 hover:bg-rose-950 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer border border-slate-800"
                        title="Retirer de l'historique"
                      >
                        <Trash className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* DEMO PROJECT SHORTCUT BUTTON */}
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  onLoadDemoProject();
                  onGoToDiagram();
                }}
                className="w-full flex items-center justify-center space-x-2 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white transition-all text-xs font-bold border border-slate-700 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                <span>Charger le Projet Interactif Démo</span>
              </button>
            </div>
          </div>

          {/* Quick tips box */}
          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-900/30 shadow-lg flex space-x-3 text-left">
            <div className="text-indigo-400 text-base leading-none shrink-0">💡</div>
            <p className="text-slate-400 leading-normal text-[11px]">
              <span className="font-bold text-slate-300">Rapports d'impression ultra nets</span> : Utilisez la barre latérale "Visibilité" pour masquer momentanément les lignes secondaires, puis cliquez sur <b>Impression PDF</b> pour exporter une feuille au format vectoriel impeccable.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
