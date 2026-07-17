/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Task {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  duration: number; // in days
  progress: number; // 0 to 100 (percentage)
  dependencies: string[]; // Array of task IDs that must finish before this task starts
  resourceId?: string; // ID of the assigned resource
  color?: string; // Tailwind bg- color equivalent or full hex coding
  type: 'task' | 'milestone'; // Milestone is 1-day duration with specific visual symbol (diamond)
  parentId?: string; // ID of parent task if nested
  isFolder?: boolean; // If true, represents a parent task / dossier definition
  selected?: boolean; // Whether to display/print this task
}

export interface SavedProject {
  id: string;
  name: string;
  tasks: Task[];
  resources: Resource[];
  lastModified: string;
}

export interface Resource {
  id: string;
  name: string;
  avatarColor: string; // Tailwind background color code for avatars
  role: string;
}

export type TimelineScale = 'day' | 'week' | 'month';

export interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  criticalTasksCount: number;
  totalDurationDays: number;
  averageProgress: number;
}
