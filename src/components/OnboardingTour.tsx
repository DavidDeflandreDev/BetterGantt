/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useLayoutEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Sparkles, X } from 'lucide-react';

interface TourStep {
  /** DOM id of the element to highlight/point at — omit for a centered intro/outro card. */
  targetId?: string;
  title: string;
  body: string;
  /** When true, entering this step selects a sample task so its editor drawer is actually open
   * on screen (rather than just described in the abstract) — the same panel that appears when
   * a user clicks any task row or bar. */
  selectTaskOnEnter?: boolean;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Bienvenue sur le projet démo !',
    body: "Quelques dialogues rapides pour repérer les principales fonctionnalités. Fermez-les un par un avec « Suivant », ou quittez la visite à tout moment.",
  },
  {
    targetId: 'gantt-header',
    title: "Barre d'en-tête",
    body: "Revenez à l'accueil, ouvrez l'aperçu PDF, lancez l'ordonnancement automatique, surlignez le chemin critique, importez/exportez vos données (JSON) ou réinitialisez le projet.",
  },
  {
    targetId: 'gantt-stats',
    title: 'Statistiques du projet',
    body: "Un coup d'œil sur le nombre de tâches, celles terminées, celles sur le chemin critique, la durée totale et l'avancement moyen.",
  },
  {
    targetId: 'gantt-secondary-control',
    title: 'Zoom & dossiers',
    body: "Changez le niveau de zoom de la frise (jour, semaine, mois, trimestre, année, ou auto), et repliez/dépliez tous les dossiers en un clic.",
  },
  {
    targetId: 'gantt-task-list-toolbar',
    title: 'Recherche & ajout',
    body: 'Recherchez une tâche par son nom, ou ajoutez-en une nouvelle directement depuis cette barre.',
  },
  {
    targetId: 'gantt-static-sheet-column',
    title: 'Liste des tâches, et créer un dossier',
    body: "Cliquez sur l'œil pour masquer une tâche (écran + PDF). Glissez-déposez une tâche sur une autre (au centre de sa ligne) pour la ranger dedans : la tâche cible devient automatiquement un dossier, avec un chevron pour le replier/déplier — comme « Développement » dans ce projet démo. Le bouton en haut à gauche réduit toute la liste, et son bord droit se tire pour l'élargir ou la rétrécir.",
  },
  {
    targetId: 'gantt-panel-scheduler-viewport',
    title: 'Le diagramme',
    body: "Cliquez sur une barre ou un jalon pour l'éditer. Chaque dossier et jalon reçoit automatiquement une couleur par famille, déclinée selon la profondeur.",
  },
  {
    targetId: 'gantt-task-editor-drawer',
    title: "Éditer une tâche (aperçu en direct)",
    body: "En cliquant sur une tâche, ce panneau s'ouvre : nom, dates/durée, avancement, couleur, dépendances, ressource assignée, et son dossier parent — vous pouvez y déplacer la tâche dans un autre dossier, ou ajouter une sous-tâche directement (elle deviendra un dossier automatiquement). Glissez le bord supérieur pour l'agrandir, ou fermez-le avec « ✕ ».",
    selectTaskOnEnter: true,
  },
  {
    targetId: 'gantt-sidebar',
    title: 'Panneau latéral',
    body: "Trois onglets : Diagramme (filtres et raccourcis d'affichage), Jalons (vue dédiée triée par date) et Ressources (équipe assignée aux tâches). Comme la liste des tâches, il se réduit d'un clic et se redimensionne en tirant son bord.",
  },
  {
    title: "C'est tout !",
    body: "Vous connaissez l'essentiel. Le bouton d'aide en bas à droite permet de relancer cette visite quand vous voulez.",
  },
];

const CARD_WIDTH = 340;
const CARD_HEIGHT = 210;
const MARGIN = 16;

interface Position {
  top: number;
  left: number;
}

function computeCardPosition(rect: DOMRect | null): Position {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (!rect) {
    return { top: vh / 2 - CARD_HEIGHT / 2, left: vw / 2 - CARD_WIDTH / 2 };
  }

  const clampLeft = (left: number) => Math.min(Math.max(MARGIN, left), Math.max(MARGIN, vw - CARD_WIDTH - MARGIN));
  const clampTop = (top: number) => Math.min(Math.max(MARGIN, top), Math.max(MARGIN, vh - CARD_HEIGHT - MARGIN));

  const spaceBelow = vh - rect.bottom;
  const spaceAbove = rect.top;
  const spaceRight = vw - rect.right;
  const spaceLeft = rect.left;
  const isTallPanel = rect.height > vh * 0.5;

  // Tall side panels (task list, sidebar, timeline) read better with the card beside them,
  // vertically centered on screen, rather than dangling off the bottom of a huge element.
  if (isTallPanel && spaceRight >= CARD_WIDTH + MARGIN) {
    return { top: clampTop(vh / 2 - CARD_HEIGHT / 2), left: rect.right + MARGIN };
  }
  if (isTallPanel && spaceLeft >= CARD_WIDTH + MARGIN) {
    return { top: clampTop(vh / 2 - CARD_HEIGHT / 2), left: rect.left - CARD_WIDTH - MARGIN };
  }
  if (spaceBelow >= CARD_HEIGHT + MARGIN) {
    return { top: rect.bottom + MARGIN, left: clampLeft(rect.left) };
  }
  if (spaceAbove >= CARD_HEIGHT + MARGIN) {
    return { top: rect.top - CARD_HEIGHT - MARGIN, left: clampLeft(rect.left) };
  }
  if (spaceRight >= CARD_WIDTH + MARGIN) {
    return { top: clampTop(rect.top), left: rect.right + MARGIN };
  }
  if (spaceLeft >= CARD_WIDTH + MARGIN) {
    return { top: clampTop(rect.top), left: rect.left - CARD_WIDTH - MARGIN };
  }
  return { top: vh / 2 - CARD_HEIGHT / 2, left: vw / 2 - CARD_WIDTH / 2 };
}

interface OnboardingTourProps {
  onFinish: () => void;
  /** Id of a sample task to select when a step flagged `selectTaskOnEnter` is reached, so its
   * editor drawer is genuinely open on screen rather than just described. */
  demoTaskId?: string;
  onSelectTask?: (id: string) => void;
}

export default function OnboardingTour({ onFinish, demoTaskId, onSelectTask }: OnboardingTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = TOUR_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  // Some steps point at UI that only exists once a task is selected (the editor drawer) — open
  // it for them automatically instead of just describing it in the abstract.
  useEffect(() => {
    if (step.selectTaskOnEnter && demoTaskId && onSelectTask) {
      onSelectTask(demoTaskId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  useLayoutEffect(() => {
    function updateRect() {
      const el = step.targetId ? document.getElementById(step.targetId) : null;
      setRect(el ? el.getBoundingClientRect() : null);
    }
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    // Layout can still be settling (e.g. right after a screen change, or a drawer sliding in
    // via its own enter animation) — re-measure a few times shortly after instead of just once.
    const timers = [60, 220, 450].map(delay => setTimeout(updateRect, delay));
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
      timers.forEach(clearTimeout);
    };
  }, [stepIndex, step.targetId]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onFinish();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  function goNext() {
    if (stepIndex < TOUR_STEPS.length - 1) setStepIndex(i => i + 1);
    else onFinish();
  }

  function goPrev() {
    if (stepIndex > 0) setStepIndex(i => i - 1);
  }

  const { top, left } = computeCardPosition(rect);

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Soft dim so the highlighted element pops, without blocking interaction with the app
          underneath — this is a guided tour, not a hard modal. */}
      <div className="absolute inset-0 bg-slate-950/30 pointer-events-none transition-opacity" />

      {/* Highlight ring around the current target, if any */}
      {rect && (
        <div
          className="absolute rounded-xl ring-4 ring-blue-500 shadow-[0_0_0_9999px_rgba(2,6,23,0.35)] pointer-events-none transition-all duration-200"
          style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8 }}
        />
      )}

      {/* Floating dialog */}
      <div
        className="absolute bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 pointer-events-auto transition-all duration-200 text-slate-200"
        style={{ top, left, width: CARD_WIDTH }}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-blue-600/20 border border-blue-600/30 text-blue-400 flex items-center justify-center shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-sm font-bold text-white truncate">{step.title}</h3>
          </div>
          <button
            onClick={onFinish}
            className="text-slate-500 hover:text-white rounded p-1 hover:bg-slate-800 cursor-pointer shrink-0"
            title="Fermer la visite guidée"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed mb-4">{step.body}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {TOUR_STEPS.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === stepIndex ? 'w-4 bg-blue-500' : 'w-1.5 bg-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={goPrev}
                className="flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" /> Précédent
              </button>
            )}
            <button
              onClick={goNext}
              className="flex items-center gap-1 text-xs font-bold text-white px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 cursor-pointer"
            >
              {isLast ? 'Terminer' : 'Suivant'} {!isLast && <ArrowRight className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
