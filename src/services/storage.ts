/**
 * Local storage persistence service for KarRooz
 * Safe migration with Schema Versioning (v1 -> v2 -> v3: Date-Based Planning)
 * Safe against disabled localStorage or private browsing restrictions
 */
import { Item, Project, WorkViewTab, UNASSIGNED_PROJECT_ID, AppSettings } from '../types';
import { getTehranTodayDateString, addDays } from '../utils/date';

const SCHEMA_VERSION_KEY = 'karrooz_schema_version';
export const CURRENT_SCHEMA_VERSION = 4;

const SETTINGS_KEY = 'karrooz_app_settings_v1';
export const DEFAULT_APP_SETTINGS: AppSettings = {
  themeMode: 'dark',
  accentColor: 'violet',
  cardDensity: 'comfortable',
  calendarSystem: 'jalali',
  firstDayOfWeek: 0,
  telegram: {
    linked: false,
  },
};
let memoryAppSettings: AppSettings = { ...DEFAULT_APP_SETTINGS };

const ITEMS_V1_KEY = 'karrooz_items_v1';
const ITEMS_V2_KEY = 'karrooz_items_v2';
const ITEMS_V3_KEY = 'karrooz_items_v3';
const ITEMS_V4_KEY = 'karrooz_items_v4';
const PROJECTS_V2_KEY = 'karrooz_projects_v2';
const INITIALIZED_FLAG_KEY = 'karrooz_initialized_v1';
const SIMPLE_MODE_KEY = 'karrooz_simple_mode_v1';
const PRE_V3_SNAPSHOT_KEY = 'karrooz_snapshot_pre_v3';
const PRE_V4_SNAPSHOT_KEY = 'karrooz_snapshot_pre_v4';

// Known legacy area labels that must NOT be converted to real projects
const OLD_AREA_LABELS = new Set(['کاری', 'شخصی', 'سلامت', 'یادگیری', 'مطالعه']);

// Default initial projects (created only when no saved projects exist)
const SEED_PROJECTS: Project[] = [
  {
    id: 'proj-client-site',
    name: 'طراحی سایت مشتری',
    description: 'طراحی مجدد رابط کاربری و پیاده‌سازی هویت بصری جدید',
    color: '#818CF8', // muted indigo
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    archived: false,
  },
  {
    id: 'proj-content-aban',
    name: 'تولید محتوای آبان',
    description: 'برنامه‌ریزی و انتشار مقالات تخصصی و آموزشی وبلاگ',
    color: '#FBBF24', // muted amber
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    archived: false,
  },
];

function getSeedItems(): Item[] {
  const today = getTehranTodayDateString();
  const tomorrow = addDays(today, 1);
  const yesterday = addDays(today, -1);

  return [
    {
      id: 'seed-task-1',
      type: 'task',
      title: 'بررسی نهایی طرح صفحه نخست',
      description: 'تطبیق تایپوگرافی و کنتراست رنگی با راهنمای برند قبل از جلسه ساعت ۱۴',
      completed: false,
      status: 'in_progress',
      projectId: 'proj-client-site',
      project: 'طراحی سایت مشتری',
      tags: ['طراحی', 'جلسه'],
      plannedDate: today,
      dueDate: tomorrow,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      inToday: true,
      destination: 'today',
    },
    {
      id: 'seed-note-1',
      type: 'note',
      title: 'سرفصل‌های پیشنهادی برای پست‌های وبلاگ',
      description: 'سه مقاله تخصصی پیرامون روش‌های تمرکز عمیق و کارایی در محیط‌های توسعه نرم‌افزار.',
      completed: false,
      projectId: 'proj-content-aban',
      project: 'تولید محتوای آبان',
      tags: ['ایده', 'وبلاگ'],
      plannedDate: today,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      inToday: true,
      destination: 'today',
    },
    {
      id: 'seed-task-2',
      type: 'task',
      title: 'بازبینی ساختار کامپوننت‌های نوار ناوبری',
      description: 'بهبود واکنش‌گرایی در نمایشگرهای موبایل و تبلت',
      completed: false,
      status: 'todo',
      projectId: 'proj-client-site',
      project: 'طراحی سایت مشتری',
      tags: ['فرانت‌اند', 'بهینه‌سازی'],
      plannedDate: today,
      createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      inToday: true,
      destination: 'today',
    },
    {
      id: 'seed-task-3',
      type: 'task',
      title: 'آماده‌سازی پیش‌نویس جدول هزینه‌ها',
      description: 'جمع‌بندی فاکتورهای سرور و زیرساخت ابری ماه گذشته',
      completed: true,
      status: 'done',
      legacyProjectLabel: 'گزارش مالی فصل',
      project: 'گزارش مالی فصل',
      tags: ['مالی'],
      plannedDate: yesterday,
      dueDate: yesterday,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      completedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      inToday: false,
      destination: 'today',
    },
  ];
}

// In-memory fallback
let memoryItems: Item[] = [];
let memoryProjects: Project[] = [];
let memoryInitialized = false;
let memorySimpleMode = false;

export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__karrooz_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Migrate legacy items and projects safely.
 * Idempotent: can be called repeatedly without data loss or corruption.
 * Version 1 -> Version 2 (Projects & Kanban)
 * Version 2 -> Version 3 (Date-Based Planning & Asia/Tehran Calendar)
 */
function runMigrationIfNeeded(): { items: Item[]; projects: Project[] } {
  if (!isLocalStorageAvailable()) {
    if (!memoryInitialized) {
      memoryProjects = [...SEED_PROJECTS];
      memoryItems = getSeedItems();
      memoryInitialized = true;
    }
    return { items: memoryItems, projects: memoryProjects };
  }

  try {
    const currentVersion = parseInt(window.localStorage.getItem(SCHEMA_VERSION_KEY) || '0', 10);
    const isInitialized = window.localStorage.getItem(INITIALIZED_FLAG_KEY);
    const v4ItemsRaw = window.localStorage.getItem(ITEMS_V4_KEY);
    const v3ItemsRaw = window.localStorage.getItem(ITEMS_V3_KEY);
    const v2ProjectsRaw = window.localStorage.getItem(PROJECTS_V2_KEY);
    const v2ItemsRaw = window.localStorage.getItem(ITEMS_V2_KEY);
    const v1ItemsRaw = window.localStorage.getItem(ITEMS_V1_KEY);

    // Case 1: First time run, no saved data at all
    if (!isInitialized && !v1ItemsRaw && !v2ItemsRaw && !v3ItemsRaw && !v4ItemsRaw) {
      const seedItems = getSeedItems();
      window.localStorage.setItem(PROJECTS_V2_KEY, JSON.stringify(SEED_PROJECTS));
      window.localStorage.setItem(ITEMS_V4_KEY, JSON.stringify(seedItems));
      window.localStorage.setItem(SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION));
      window.localStorage.setItem(INITIALIZED_FLAG_KEY, 'true');
      return { items: seedItems, projects: SEED_PROJECTS };
    }

    // Load or initialize projects
    let projects: Project[] = [];
    if (v2ProjectsRaw) {
      try {
        projects = JSON.parse(v2ProjectsRaw);
      } catch (err) {
        console.warn('Could not parse v2 projects, using seed', err);
        projects = [...SEED_PROJECTS];
      }
    } else {
      projects = [...SEED_PROJECTS];
      window.localStorage.setItem(PROJECTS_V2_KEY, JSON.stringify(projects));
    }

    // Case 2: Already on schema version 4
    if (currentVersion >= 4 && v4ItemsRaw) {
      try {
        const items = JSON.parse(v4ItemsRaw) as Item[];
        return { items, projects };
      } catch (err) {
        console.warn('Could not parse v4 items, falling back', err);
      }
    }

    // Case 3: Need migration to v4 (from v3, v2, or v1)
    // Create pre-migration safety snapshot first
    try {
      const snapshotPayload = {
        fromVersion: currentVersion,
        timestamp: new Date().toISOString(),
        v3Items: v3ItemsRaw,
        v2Items: v2ItemsRaw,
        v1Items: v1ItemsRaw,
        projects: v2ProjectsRaw,
      };
      window.localStorage.setItem(PRE_V4_SNAPSHOT_KEY, JSON.stringify(snapshotPayload));
    } catch (e) {
      console.warn('Could not save pre-v4 snapshot', e);
    }

    const tehranToday = getTehranTodayDateString();

    // If we have v3 items, migration to v4 is seamless and preserves all data & recurrence
    if (v3ItemsRaw) {
      try {
        const parsedV3 = JSON.parse(v3ItemsRaw) as any[];
        const migratedV4: Item[] = parsedV3.map((item) => ({
          ...item,
          // Recurrence preserved if present, never seeded over existing data
          recurrence: item.recurrence || undefined,
          occurrenceOverrides: item.occurrenceOverrides || undefined,
        }));

        window.localStorage.setItem(ITEMS_V4_KEY, JSON.stringify(migratedV4));
        window.localStorage.setItem(SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION));
        return { items: migratedV4, projects };
      } catch (err) {
        console.warn('Failed parsing v3 items, falling back to earlier migration', err);
      }
    }

    let baseItems: any[] = [];
    if (v2ItemsRaw) {
      try {
        baseItems = JSON.parse(v2ItemsRaw);
      } catch (e) {
        console.warn('Failed parsing v2 items', e);
      }
    } else if (v1ItemsRaw) {
      try {
        baseItems = JSON.parse(v1ItemsRaw);
      } catch (e) {
        console.warn('Failed parsing v1 items', e);
      }
    }

    const migratedItems: Item[] = baseItems.map((old: any) => {
      const isTask = old.type !== 'note';
      const completed = Boolean(old.completed);
      const rawProject = typeof old.project === 'string' ? old.project.trim() : '';

      let projectId: string | undefined = old.projectId;
      let legacyProjectLabel: string | undefined = old.legacyProjectLabel;

      if (!projectId && rawProject) {
        if (OLD_AREA_LABELS.has(rawProject)) {
          legacyProjectLabel = rawProject;
        } else {
          const matchedProj = projects.find((p) => p.name === rawProject);
          if (matchedProj) {
            projectId = matchedProj.id;
          } else {
            legacyProjectLabel = rawProject;
          }
        }
      }

      let status = old.status;
      if (isTask) {
        if (!status || (status !== 'todo' && status !== 'in_progress' && status !== 'done')) {
          status = completed ? 'done' : 'todo';
        }
      } else {
        status = undefined;
      }

      let plannedDate: string | undefined = old.plannedDate;
      const dueDate: string | undefined = isTask ? old.dueDate : undefined;

      if (!plannedDate && old.inToday) {
        plannedDate = tehranToday;
      }

      const inToday = plannedDate === tehranToday;

      return {
        id: String(old.id || `migrated-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
        type: isTask ? 'task' : 'note',
        title: String(old.title || ''),
        description: old.description ? String(old.description) : undefined,
        completed: isTask ? completed : false,
        status,
        projectId,
        legacyProjectLabel,
        project: rawProject || undefined,
        tags: Array.isArray(old.tags) ? old.tags.map(String) : [],
        createdAt: String(old.createdAt || new Date().toISOString()),
        completedAt: old.completedAt ? String(old.completedAt) : undefined,
        plannedDate,
        dueDate,
        inToday,
        destination: old.destination === 'today' ? 'today' : undefined,
        recurrence: old.recurrence || undefined,
        occurrenceOverrides: old.occurrenceOverrides || undefined,
      };
    });

    // Save v4 items and update version
    window.localStorage.setItem(ITEMS_V4_KEY, JSON.stringify(migratedItems));
    window.localStorage.setItem(SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION));
    window.localStorage.setItem(INITIALIZED_FLAG_KEY, 'true');

    return { items: migratedItems, projects };
  } catch (e) {
    console.error('Storage operation failed, falling back to memory store', e);
    return { items: memoryItems, projects: memoryProjects };
  }
}

export function loadProjects(): Project[] {
  if (isLocalStorageAvailable()) {
    try {
      const { projects } = runMigrationIfNeeded();
      return projects;
    } catch (e) {
      console.warn('Failed to load projects from localStorage', e);
      return memoryProjects;
    }
  }

  if (!memoryInitialized) {
    memoryProjects = [...SEED_PROJECTS];
    memoryItems = getSeedItems();
    memoryInitialized = true;
  }
  return memoryProjects;
}

export function saveProjects(projects: Project[]): boolean {
  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(PROJECTS_V2_KEY, JSON.stringify(projects));
      return true;
    } catch (e) {
      console.warn('Failed to save projects to localStorage', e);
      memoryProjects = projects;
      return false;
    }
  }
  memoryProjects = projects;
  return false;
}

export function loadItems(): Item[] {
  if (isLocalStorageAvailable()) {
    try {
      const { items } = runMigrationIfNeeded();
      return items;
    } catch (e) {
      console.warn('Failed to load items from localStorage', e);
      return memoryItems;
    }
  }

  if (!memoryInitialized) {
    memoryProjects = [...SEED_PROJECTS];
    memoryItems = getSeedItems();
    memoryInitialized = true;
  }
  return memoryItems;
}

export function saveItems(items: Item[]): boolean {
  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(ITEMS_V4_KEY, JSON.stringify(items));
      return true;
    } catch (e) {
      console.warn('Failed to save items to localStorage', e);
      memoryItems = items;
      return false;
    }
  }
  memoryItems = items;
  return false;
}

export function loadSimpleMode(): boolean {
  if (isLocalStorageAvailable()) {
    try {
      const val = window.localStorage.getItem(SIMPLE_MODE_KEY);
      return val === 'true';
    } catch {
      return memorySimpleMode;
    }
  }
  return memorySimpleMode;
}

export function saveSimpleMode(enabled: boolean): void {
  memorySimpleMode = enabled;
  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(SIMPLE_MODE_KEY, String(enabled));
    } catch {
      // ignore
    }
  }
}

// UI Preference Storage Keys (Kept strictly independent of domain data)
const ALLWORK_TAB_KEY = 'karrooz_allwork_tab_v1';
const PROJECT_TAB_KEY = 'karrooz_project_tab_v1';
const ALLWORK_PROJECT_FILTERS_KEY = 'karrooz_allwork_project_filters_v1';
const ALLWORK_SHOW_ARCHIVED_KEY = 'karrooz_allwork_show_archived_v1';

let memoryAllWorkTab: WorkViewTab = 'list';
let memoryProjectTab: WorkViewTab = 'kanban';
let memoryAllWorkProjectFilters: string[] | null = null;
let memoryAllWorkShowArchived = false;

export function loadAllWorkTab(): WorkViewTab {
  if (isLocalStorageAvailable()) {
    try {
      const val = window.localStorage.getItem(ALLWORK_TAB_KEY) as WorkViewTab;
      if (val === 'list' || val === 'kanban' || val === 'calendar') {
        return val;
      }
    } catch {
      // fallback
    }
  }
  return memoryAllWorkTab;
}

export function saveAllWorkTab(tab: WorkViewTab): void {
  memoryAllWorkTab = tab;
  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(ALLWORK_TAB_KEY, tab);
    } catch {
      // ignore
    }
  }
}

export function loadProjectTab(): WorkViewTab {
  if (isLocalStorageAvailable()) {
    try {
      const val = window.localStorage.getItem(PROJECT_TAB_KEY) as WorkViewTab;
      if (val === 'list' || val === 'kanban' || val === 'calendar') {
        return val;
      }
    } catch {
      // fallback
    }
  }
  return memoryProjectTab;
}

export function saveProjectTab(tab: WorkViewTab): void {
  memoryProjectTab = tab;
  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(PROJECT_TAB_KEY, tab);
    } catch {
      // ignore
    }
  }
}

/**
 * Loads project filters safely: handles missing or deleted project IDs gracefully.
 * Returns null if no custom filter was ever saved (indicating default: all active + unassigned).
 */
export function loadAllWorkProjectFilters(validProjectIds: string[]): string[] | null {
  if (isLocalStorageAvailable()) {
    try {
      const raw = window.localStorage.getItem(ALLWORK_PROJECT_FILTERS_KEY);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const validSet = new Set([...validProjectIds, UNASSIGNED_PROJECT_ID]);
          // Filter out any stale/deleted IDs
          return parsed.filter((id) => typeof id === 'string' && validSet.has(id));
        }
      }
    } catch {
      // fallback
    }
  }
  return memoryAllWorkProjectFilters;
}

export function saveAllWorkProjectFilters(filters: string[] | null): void {
  memoryAllWorkProjectFilters = filters;
  if (isLocalStorageAvailable()) {
    try {
      if (filters === null) {
        window.localStorage.removeItem(ALLWORK_PROJECT_FILTERS_KEY);
      } else {
        window.localStorage.setItem(ALLWORK_PROJECT_FILTERS_KEY, JSON.stringify(filters));
      }
    } catch {
      // ignore
    }
  }
}

export function loadAllWorkShowArchived(): boolean {
  if (isLocalStorageAvailable()) {
    try {
      const val = window.localStorage.getItem(ALLWORK_SHOW_ARCHIVED_KEY);
      return val === 'true';
    } catch {
      // fallback
    }
  }
  return memoryAllWorkShowArchived;
}

export function saveAllWorkShowArchived(show: boolean): void {
  memoryAllWorkShowArchived = show;
  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(ALLWORK_SHOW_ARCHIVED_KEY, String(show));
    } catch {
      // ignore
    }
  }
}

export function loadAppSettings(): AppSettings {
  if (isLocalStorageAvailable()) {
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            ...DEFAULT_APP_SETTINGS,
            ...parsed,
            telegram: {
              ...DEFAULT_APP_SETTINGS.telegram,
              ...(parsed.telegram || {}),
            },
          };
        }
      }
    } catch {
      // ignore
    }
  }
  return memoryAppSettings;
}

export function saveAppSettings(settings: AppSettings): void {
  memoryAppSettings = settings;
  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }
}

