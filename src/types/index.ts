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

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';

export type MonthlyPolicy = 'skip' | 'last_day';

export type RecurrenceCalendarBasis = 'jalali' | 'gregorian';

export type RecurrenceEndType = 'never' | 'until';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number; // >= 1 (e.g. every 1 day, every 2 weeks, every 1 month)
  weekdays?: number[]; // For weekly: Saturday=0, Sunday=1, Monday=2, Tuesday=3, Wednesday=4, Thursday=5, Friday=6
  calendarBasis: RecurrenceCalendarBasis; // 'jalali' by default
  monthDay?: number; // 1..31 (anchor day of the month)
  monthlyPolicy?: MonthlyPolicy; // 'skip' | 'last_day' (default 'last_day')
  endType: RecurrenceEndType; // 'never' | 'until'
  endDate?: string; // YYYY-MM-DD inclusive
  stoppedAt?: string; // YYYY-MM-DD cutoff date (inclusive: stopped on or after this date)
}

export interface OccurrenceOverride {
  seriesId?: string;
  originalDate?: string; // Original scheduled YYYY-MM-DD date of this occurrence
  skipped?: boolean;
  skippedAt?: string;
  completed?: boolean;
  completedAt?: string;
  status?: KanbanStatus;
  title?: string;
  description?: string;
  plannedDate?: string; // Rescheduled date (YYYY-MM-DD)
  dueDate?: string;     // Overridden deadline (YYYY-MM-DD)
  projectId?: string;
  tags?: string[];
  updatedAt?: string;
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

  // Recurrence Series & Overrides (Tasks only)
  recurrence?: RecurrenceRule;
  occurrenceOverrides?: Record<string, OccurrenceOverride>;

  // In-Memory Expanded Occurrence Metadata (Computed during view expansion)
  isRecurringOccurrence?: boolean;
  recurringSeriesId?: string;
  originalScheduledDate?: string;
  isOccurrenceSkipped?: boolean;
}

export type FilterType = 'all' | 'tasks' | 'notes';

export type ActiveView = 'today' | 'all-work' | 'projects' | 'project-detail' | 'notes' | 'settings';

export type WorkViewTab = 'list' | 'kanban' | 'calendar';

export type ThemeMode = 'dark' | 'light' | 'system';

export type AccentColor = 'violet' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'blue';

export type CardDensity = 'comfortable' | 'compact';

export type CalendarSystem = 'jalali' | 'gregorian';

export type SyncStatus = 'local' | 'loading' | 'syncing' | 'synced' | 'offline' | 'error';

export interface TelegramLinkState {
  linked: boolean;
  workerUrl?: string;
  telegramChatId?: string;
  telegramUsername?: string;
  linkedAt?: string;
  pendingPairingCode?: string;
  pairingCodeExpiresAt?: string;
}

export interface AppSettings {
  themeMode: ThemeMode;
  accentColor: AccentColor;
  cardDensity: CardDensity;
  calendarSystem: CalendarSystem;
  firstDayOfWeek: number; // 0 = Saturday (Shanbeh)
  telegram: TelegramLinkState;
}

export const UNASSIGNED_PROJECT_ID = '__unassigned__';

export const PRESET_PROJECT_COLORS = [
  '#818CF8', // muted indigo
  '#FBBF24', // muted amber
  '#34D399', // muted emerald
  '#A78BFA', // muted violet
  '#60A5FA', // muted blue
  '#F472B6', // muted rose
  '#94A3B8', // muted slate
];
