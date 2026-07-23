/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Printer, RefreshCw, X } from 'lucide-react';
import { Task, Resource } from '../types';
import { CPMResult } from '../utils/cpm';
import { FixedTimelineZoom } from './timeline/constants';
import { exportGanttPdf, PdfLayout, PdfOrientation } from '../utils/pdfExport';
import GanttPrintView, { PRINT_LABEL_COL_WIDTH, PRINT_TOP_BAND_HEIGHT } from './GanttPrintView';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  activeProjectName: string;
  displayTasks: Task[];
  taskDepthById: Map<string, number>;
  visibleTasks: Task[];
  resources: Resource[];
  cpmResults: Map<string, CPMResult>;
  highlightCriticalPath: boolean;
  onToggleCriticalPath: () => void;
  onToggleTaskSelection: (id: string) => void;
  /** The zoom tier currently selected on the main diagram ('auto' already resolved to a fixed
   * tier) — the export mirrors that granularity (day detail, month bands, or year bands)
   * instead of deciding it independently from the export's own pixel width. */
  zoomTier: FixedTimelineZoom;
}

export default function ExportModal({
  open,
  onClose,
  activeProjectName,
  displayTasks,
  taskDepthById,
  visibleTasks,
  resources,
  cpmResults,
  highlightCriticalPath,
  onToggleCriticalPath,
  onToggleTaskSelection,
  zoomTier,
}: ExportModalProps) {
  const [pdfLayout, setPdfLayout] = useState<PdfLayout>('a4-single');
  const [pdfOrientation, setPdfOrientation] = useState<PdfOrientation>('landscape');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  async function handleDownloadPDF() {
    setIsGeneratingPdf(true);
    try {
      const safeProjectName = activeProjectName.replace(/[^a-z0-9_ -]/gi, '_').trim();
      const layoutLabel = pdfLayout === 'a4-single' ? 'A4' : 'Multipages';
      const orientationLabel = pdfOrientation === 'landscape' ? 'Paysage' : 'Portrait';
      await exportGanttPdf({
        elementId: 'gantt-print-view-document',
        layout: pdfLayout,
        orientation: pdfOrientation,
        filename: `Gantt_${safeProjectName || 'BetterGantt'}_${layoutLabel}_${orientationLabel}.pdf`,
        labelColWidthPx: PRINT_LABEL_COL_WIDTH,
        headerHeightPx: PRINT_TOP_BAND_HEIGHT,
      });
    } catch (error) {
      console.error('Erreur exportation PDF:', error);
      alert('Une erreur est survenue lors du téléchargement du PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8"
        >
          <motion.div
            initial={{ scale: 0.95, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 15 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl text-slate-200"
          >
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Printer className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Options d'Exportation PDF &amp; Impression Épurée</h3>
                  <p className="text-[10.5px] text-slate-400">Configurez le rapport vectoriel avant de générer le document</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-705/85 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Core Layout */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Print parameters left col */}
              <div className="md:col-span-4 space-y-4 text-xs">
                <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/80 space-y-3.5">
                  <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider">Mise en page</h4>

                  <div className="space-y-1.5">
                    <span className="text-slate-400 block font-semibold">Format</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPdfLayout('a4-single')}
                        className={`py-2 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                          pdfLayout === 'a4-single'
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        A4 (une page)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPdfLayout('a4-multi')}
                        className={`py-2 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                          pdfLayout === 'a4-multi'
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        Multi-pages (libre)
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      {pdfLayout === 'a4-single'
                        ? 'Tout le diagramme tient sur une seule page A4 (réduit si nécessaire).'
                        : 'Le diagramme est réparti sur autant de pages A4 que nécessaire, à une taille toujours lisible. Les noms de tâches et les dates sont répétés sur chaque page.'}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <span className="text-slate-400 block font-semibold">Orientation</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPdfOrientation('portrait')}
                        className={`py-2 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                          pdfOrientation === 'portrait'
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        Portrait
                      </button>
                      <button
                        type="button"
                        onClick={() => setPdfOrientation('landscape')}
                        className={`py-2 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                          pdfOrientation === 'landscape'
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        Paysage
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-850">
                    <label className="text-slate-350 cursor-pointer font-medium select-none" htmlFor="print-cpm-opt">
                      Surligner le Chemin Critique
                    </label>
                    <input
                      type="checkbox"
                      id="print-cpm-opt"
                      checked={highlightCriticalPath}
                      onChange={onToggleCriticalPath}
                      className="rounded text-rose-500 h-4 w-4 cursor-pointer accent-rose-500 bg-slate-800 border-slate-700"
                    />
                  </div>
                </div>

                <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/80 space-y-2">
                  <span className="text-slate-400 block font-semibold">Tâches retenues :</span>
                  <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-2 max-h-36 overflow-y-auto space-y-1 text-[11px]">
                    {displayTasks.map(t => {
                      const depth = taskDepthById.get(t.id) ?? 0;
                      return (
                        <div key={t.id} className="flex items-center space-x-2 py-0.5" style={{ paddingLeft: `${depth * 12}px` }}>
                          <input
                            type="checkbox"
                            checked={t.selected !== false}
                            onChange={() => onToggleTaskSelection(t.id)}
                            className="rounded text-blue-500 h-3.5 w-3.5 cursor-pointer accent-blue-500 bg-slate-800 border-slate-700 shrink-0"
                          />
                          <span className={`truncate ${t.isFolder ? 'font-bold text-slate-200' : 'text-slate-400'}`}>{t.name}</span>
                        </div>
                      );
                    })}
                    {displayTasks.length === 0 && (
                      <span className="text-slate-500 italic block p-2 text-center">Aucune tâche visible (dossiers repliés ou filtres actifs)</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 italic block">
                    Cette liste = l'aperçu ci-contre. Seules les lignes cochées et non masquées (dossiers repliés) apparaîtront dans le PDF.
                  </span>
                </div>
              </div>

              {/* Print Preview Canvas on Right side */}
              <div className="md:col-span-8 flex flex-col space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block text-left">Aperçu de l'export (défilable)</span>

                <div className="border border-slate-850 rounded-xl bg-slate-950/80 p-4 overflow-auto max-h-[55vh] shadow-inner select-none">
                  <GanttPrintView
                    elementId="gantt-print-view-document"
                    projectName={activeProjectName}
                    tasks={visibleTasks}
                    resources={resources}
                    cpmResults={cpmResults}
                    highlightCriticalPath={highlightCriticalPath}
                    taskDepthById={taskDepthById}
                    orientation={pdfOrientation}
                    zoomTier={zoomTier}
                  />
                </div>
              </div>
            </div>

            {/* Modal actions footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/40 shrink-0 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">Diagramme réel, couleurs et dates complètes — jamais de texte tronqué</span>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer border border-slate-700 hover:text-white transition-colors"
                >
                  Fermer
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={visibleTasks.length === 0 || isGeneratingPdf}
                  className="px-5 py-2 text-xs font-bold rounded bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white shadow hover:shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  {isGeneratingPdf ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Génération en cours...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>Télécharger le PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
