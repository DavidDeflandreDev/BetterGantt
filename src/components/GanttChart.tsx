/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { HelpCircle } from 'lucide-react';
import { SavedProject } from '../types';
import { useGanttData } from '../hooks/useGanttData';
import HomeScreen from './HomeScreen';
import AppHeader from './AppHeader';
import StatsBar from './StatsBar';
import GanttSidebar from './sidebar/GanttSidebar';
import TimelineLegend from './timeline/TimelineLegend';
import TaskListToolbar from './timeline/TaskListToolbar';
import GanttTimeline from './timeline/GanttTimeline';
import TaskEditorDrawer from './TaskEditorDrawer';
import ExportModal from './ExportModal';
import ImportPresetModal from './ImportPresetModal';
import OnboardingTour from './OnboardingTour';

export default function GanttChart() {
  const [currentScreen, setCurrentScreen] = useState<'accueil' | 'diagramme'>('accueil');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const gantt = useGanttData();

  function goToDiagram() {
    setCurrentScreen('diagramme');
  }

  function handleLoadDemoProject() {
    gantt.loadDemoProject();
    setShowOnboarding(true);
  }

  function handleSearchQueryChange(query: string) {
    gantt.setSearchQuery(query);
    gantt.setDisplayLimit(30); // reset progressive loading to avoid confusion
  }

  function handleImportGanttFile(text: string, filename: string) {
    const result = gantt.handleImportGanttFile(text, filename);
    if (result === 'committed') {
      goToDiagram();
    }
    // 'pending': a preset modal will appear (rendered below, regardless of current screen) —
    // navigation to the diagram happens once the user confirms.
  }

  function handleConfirmPendingImport(zoom: Parameters<typeof gantt.confirmPendingImport>[0], collapseDepth: number) {
    gantt.confirmPendingImport(zoom, collapseDepth);
    goToDiagram();
  }

  function handleSelectRecentProject(project: SavedProject) {
    gantt.handleSelectRecentProject(project);
    goToDiagram();
  }

  const importPresetModal = gantt.pendingImport && (
    <ImportPresetModal
      projectName={gantt.pendingImport.name}
      stats={gantt.pendingImport.stats}
      onConfirm={handleConfirmPendingImport}
      onCancel={gantt.cancelPendingImport}
    />
  );

  if (currentScreen === 'accueil') {
    return (
      <>
        <HomeScreen
          importedProjectsList={gantt.importedProjectsList}
          onGoToDiagram={goToDiagram}
          onImportGanttFile={handleImportGanttFile}
          onSelectRecentProject={handleSelectRecentProject}
          onDeleteRecentProject={gantt.handleDeleteRecentProject}
          onLoadDemoProject={handleLoadDemoProject}
        />
        {importPresetModal}
      </>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-slate-900 text-slate-100 overflow-hidden font-sans" id="gantt-root">
      <AppHeader
        activeProjectName={gantt.activeProjectName}
        onGoHome={() => setCurrentScreen('accueil')}
        onOpenPrintPreview={() => setShowPrintPreview(true)}
        onAutoSchedule={gantt.handleAutoSchedule}
        highlightCriticalPath={gantt.highlightCriticalPath}
        onToggleCriticalPath={() => gantt.setHighlightCriticalPath(!gantt.highlightCriticalPath)}
        onExportJSON={gantt.handleExportJSON}
        onImportJSON={gantt.handleImportJSON}
        onReset={gantt.handleReset}
      />

      <StatsBar stats={gantt.stats} />

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden" id="gantt-main">
        <GanttSidebar
          tasks={gantt.tasks}
          resources={gantt.resources}
          filterResourceId={gantt.filterResourceId}
          onFilterResourceChange={gantt.setFilterResourceId}
          onSetAllTasksSelected={gantt.handleSetAllTasksSelected}
          onAddResource={gantt.handleAddResource}
          milestones={gantt.milestones}
          selectedTaskId={gantt.selectedTaskId}
          onSelectMilestone={gantt.handleSelectMilestone}
          displayLimit={gantt.displayLimit}
          totalCount={gantt.filteredTasks.length}
          onSetDisplayLimit={gantt.setDisplayLimit}
          hasFolders={gantt.hasFolders}
          maxFolderDepth={gantt.maxFolderDepth}
          onSetCollapseDepth={gantt.setCollapseDepth}
        />

        <section className="flex-1 flex flex-col min-w-0" id="gantt-diagram-viewport">
          <TimelineLegend
            timelineDates={gantt.timelineDates}
            zoom={gantt.zoom}
            onZoomChange={gantt.setZoom}
            hasFolders={gantt.hasFolders}
            onCollapseAll={gantt.collapseAllFolders}
            onExpandAll={gantt.expandAllFolders}
          />

          <TaskListToolbar
            searchQuery={gantt.searchQuery}
            onSearchQueryChange={handleSearchQueryChange}
            resources={gantt.resources}
            onAddTask={gantt.handleAddTask}
          />

          <GanttTimeline
            slicedTasks={gantt.slicedTasks}
            resources={gantt.resources}
            cpmResults={gantt.cpmResults}
            highlightCriticalPath={gantt.highlightCriticalPath}
            selectedTaskId={gantt.selectedTaskId}
            onSelectTask={gantt.setSelectedTaskId}
            timelineDates={gantt.timelineDates}
            monthLabels={gantt.monthLabels}
            isYearGrouped={gantt.effectiveZoom === 'year'}
            todayIndex={gantt.todayIndex}
            visibleTasksCount={gantt.filteredTasks.length}
            displayLimit={gantt.displayLimit}
            onShowMore={() => gantt.setDisplayLimit(prev => Math.min(prev + 50, gantt.filteredTasks.length))}
            dayWidth={gantt.dayWidth}
            collapsedFolderIds={gantt.collapsedFolderIds}
            onToggleFolderCollapse={gantt.toggleFolderCollapse}
            taskDepthById={gantt.taskDepthById}
            onReorderTask={gantt.handleReorderTask}
            onToggleTaskSelection={gantt.handleToggleTaskSelection}
          />

          <AnimatePresence>
            {gantt.selectedTaskId && gantt.selectedTask && (
              <TaskEditorDrawer
                task={gantt.selectedTask}
                allTasks={gantt.tasks}
                resources={gantt.resources}
                onUpdate={gantt.handleUpdateTask}
                onDelete={gantt.handleDeleteTask}
                onClose={() => gantt.setSelectedTaskId(null)}
                onAutoSchedule={gantt.handleAutoSchedule}
                onSetParent={gantt.handleSetTaskParent}
                onAddSubtask={gantt.handleAddSubtask}
              />
            )}
          </AnimatePresence>
        </section>
      </main>

      <ExportModal
        open={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        activeProjectName={gantt.activeProjectName}
        displayTasks={gantt.filteredTasks}
        taskDepthById={gantt.taskDepthById}
        visibleTasks={gantt.visibleTasks}
        zoomTier={gantt.effectiveZoom}
        resources={gantt.resources}
        cpmResults={gantt.cpmResults}
        highlightCriticalPath={gantt.highlightCriticalPath}
        onToggleCriticalPath={() => gantt.setHighlightCriticalPath(!gantt.highlightCriticalPath)}
        onToggleTaskSelection={gantt.handleToggleTaskSelection}
      />

      {importPresetModal}

      {showOnboarding && (
        <OnboardingTour
          onFinish={() => setShowOnboarding(false)}
          demoTaskId={(gantt.tasks.find(t => t.parentId) || gantt.tasks[0])?.id}
          onSelectTask={gantt.setSelectedTaskId}
        />
      )}

      {!showOnboarding && (
        <button
          onClick={() => setShowOnboarding(true)}
          className="fixed bottom-5 right-5 z-40 h-11 w-11 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg flex items-center justify-center cursor-pointer transition-colors"
          title="Revoir la visite guidée"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
