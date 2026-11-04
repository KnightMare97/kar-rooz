/**
 * Type definitions for KarRooz (کار روز) Task & Note Manager
 */

export type ItemType = 'task' | 'note';

export type KanbanStatus = 'todo' | 'in_progress' | 'done';

export const KANBAN_COLUMNS: { id: KanbanStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'انجام‌نشده', color: '#94A3B8' }, // calm slate
  { id: 'in_progress', label: 'در حال انجام', color: '#FBBF24' }, // warm amber
  { id: 'done', label: 'انجام‌شده', color: '#34D399' }, // calm emerald
];

export interface Project {
  id: string; // stable ID (e.g. 'proj-...')
  name: string; // required
  description?: string; // optional
  color: string; // hex color
  createdAt: string; // ISO string
  archived: boolean;
  archivedAt?: string;
}

export interface Item {
  id: string;
  type: ItemType;
  title: string;
  description?: string;
  completed: boolean; // only active for 'task'
  status?: KanbanStatus; // 'todo' | 'in_progress' | 'done' (only for tasks)
  projectId?: string; // stable reference to Project.id
  legacyProjectLabel?: string; // preserved legacy label if not matched
  project?: string; // display name or legacy fallback
  tags: string[];
  createdAt: string; // ISO string
  completedAt?: string;
  inToday?: boolean; // legacy support, derived from plannedDate === today in v3
  destination?: 'today'; // legacy support

  // Date-Based Planning fields (Stored as Gregorian YYYY-MM-DD calendar date strings)
  plannedDate?: string; // "روز انجام" (tasks and notes)
  dueDate?: string; // "مهلت تحویل" (tasks only)
}

export type FilterType = 'all' | 'tasks' | 'notes';

export type CalendarSystem = 'jalali' | 'gregorian';

export type ActiveView = 'today' | 'calendar' | 'projects' | 'project-detail';

export const PRESET_PROJECT_COLORS = [
  '#818CF8', // muted indigo
  '#FBBF24', // muted amber
  '#34D399', // muted emerald
  '#A78BFA', // muted violet
  '#60A5FA', // muted blue
  '#F472B6', // muted rose
  '#94A3B8', // muted slate
];
