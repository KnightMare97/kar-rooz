/**
 * KarRooz (کار روز) - Personal Task, Note & Project Manager
 * Calm, focused, device-local, RTL Persian productivity tool.
 * Iteration: Unified Work Views (All Work & Project scopes: List, Kanban, Calendar).
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Item,
  Project,
  FilterType,
  ActiveView,
  KanbanStatus,
  WorkViewTab,
  UNASSIGNED_PROJECT_ID,
} from './types';
import {
  loadItems,
  saveItems,
  loadProjects,
  saveProjects,
  loadSimpleMode,
  saveSimpleMode,
  loadAllWorkTab,
  saveAllWorkTab,
  loadProjectTab,
  saveProjectTab,
  loadAllWorkProjectFilters,
  saveAllWorkProjectFilters,
  loadAllWorkShowArchived,
  saveAllWorkShowArchived,
} from './services/storage';
import { getTehranTodayDateString, formatJalaliDate } from './utils/date';
import { expandAllItems } from './utils/recurrence';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { QuickCapture } from './components/QuickCapture';
import { TodaySections } from './components/TodaySections';
import { AllWorkView } from './components/AllWorkView';
import { NotesView } from './components/NotesView';
import { ItemEditorModal } from './components/ItemEditorModal';
import { SeriesModal } from './components/SeriesModal';
import { MobileNav } from './components/MobileNav';
import { ProjectList } from './components/ProjectList';
import { ProjectDetail } from './components/ProjectDetail';
import { ProjectModal } from './components/ProjectModal';
import { BackupModal } from './components/BackupModal';
import { AuthModal } from './components/AuthModal';
import { AuthProvider } from './contexts/AuthContext';
import { Info, X, AlertCircle } from 'lucide-react';

export default function App() {
  const [items, setItems] = useState<Item[]>(() => loadItems());
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());
  const [activeView, setActiveView] = useState<ActiveView>('today');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Timezone-aware date tracking (Asia/Tehran)
  const [todayDate, setTodayDate] = useState<string>(() => getTehranTodayDateString());

  const [isSimpleMode, setIsSimpleMode] = useState<boolean>(() => loadSimpleMode());
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Unified Work Views Tab State
  const [allWorkTab, setAllWorkTab] = useState<WorkViewTab>(() => loadAllWorkTab());
  const [projectTab, setProjectTab] = useState<WorkViewTab>(() => loadProjectTab());

  // All Work Scope & Filters
  const [allWorkProjectFilters, setAllWorkProjectFilters] = useState<string[] | null>(() =>
    loadAllWorkProjectFilters(projects.map((p) => p.id))
  );
  const [allWorkShowArchived, setAllWorkShowArchived] = useState<boolean>(() =>
    loadAllWorkShowArchived()
  );
  const [allWorkSearchQuery, setAllWorkSearchQuery] = useState('');

  // Toast notification for items saved outside active filter
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  // Modals
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedSeriesModalId, setSelectedSeriesModalId] = useState<string | null>(null);
  const [skipConfirmOccurrence, setSkipConfirmOccurrence] = useState<Item | null>(null);
  const [undoSkipInfo, setUndoSkipInfo] = useState<{ seriesId: string; originalDate: string; title: string } | null>(null);

  const captureSectionRef = useRef<HTMLDivElement>(null);

  // Recalculate today on app focus and day rollover
  useEffect(() => {
    const handleCheckDate = () => {
      const currentTehranDate = getTehranTodayDateString();
      setTodayDate((prev) => (prev !== currentTehranDate ? currentTehranDate : prev));
    };

    window.addEventListener('focus', handleCheckDate);
    const interval = setInterval(handleCheckDate, 30000); // Check every 30s

    return () => {
      window.removeEventListener('focus', handleCheckDate);
      clearInterval(interval);
    };
  }, []);

  // Sync state to local storage
  useEffect(() => {
    saveItems(items);
  }, [items]);

  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  const handleToggleSimpleMode = () => {
    const next = !isSimpleMode;
    setIsSimpleMode(next);
    saveSimpleMode(next);
  };

  const handleAllWorkTabChange = (tab: WorkViewTab) => {
    setAllWorkTab(tab);
    saveAllWorkTab(tab);
  };

  const handleProjectTabChange = (tab: WorkViewTab) => {
    setProjectTab(tab);
    saveProjectTab(tab);
  };

  const handleAllWorkProjectFiltersChange = (filters: string[] | null) => {
    setAllWorkProjectFilters(filters);
    saveAllWorkProjectFilters(filters);
  };

  const handleAllWorkShowArchivedChange = (show: boolean) => {
    setAllWorkShowArchived(show);
    saveAllWorkShowArchived(show);
  };

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(message);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, 5000);
  };

  const handleNavigate = (view: ActiveView, newFilter?: FilterType) => {
    setActiveView(view);
    if (newFilter) {
      setFilter(newFilter);
    }
    if (view !== 'project-detail') {
      setSelectedProjectId(null);
    }
  };

  const generateId = (prefix = 'item'): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  };

  // Item Handlers
  const handleAddItem = (newItemData: Omit<Item, 'id' | 'createdAt'>) => {
    const isTask = newItemData.type === 'task';
    const newItem: Item = {
      ...newItemData,
      id: generateId('item'),
      status: isTask ? (newItemData.status || (newItemData.completed ? 'done' : 'todo')) : undefined,
      createdAt: new Date().toISOString(),
    };
    setItems((prev) => [newItem, ...prev]);

    // Check if new item leaves active All Work filter
    if (activeView === 'all-work' && allWorkProjectFilters !== null) {
      const itemKey = newItem.projectId || UNASSIGNED_PROJECT_ID;
      if (!allWorkProjectFilters.includes(itemKey)) {
        showToast('مورد جدید ذخیره شد، اما با توجه به فیلتر پروژه‌های انتخابی در این نما پنهان است.');
      }
    }
  };

  const handleToggleComplete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Check if this is an occurrence ID (seriesId__originalDate)
    if (id.includes('__')) {
      const [seriesId, origDate] = id.split('__');
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === seriesId) {
            const currentOverride = item.occurrenceOverrides?.[origDate];
            const nextCompleted = !(currentOverride?.completed ?? item.completed);
            const nextStatus: KanbanStatus = nextCompleted ? 'done' : 'todo';
            return {
              ...item,
              occurrenceOverrides: {
                ...(item.occurrenceOverrides || {}),
                [origDate]: {
                  ...(currentOverride || {}),
                  completed: nextCompleted,
                  status: nextStatus,
                  completedAt: nextCompleted ? new Date().toISOString() : undefined,
                },
              },
            };
          }
          return item;
        })
      );
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id && item.type === 'task') {
          const nextCompleted = !item.completed;
          const nextStatus: KanbanStatus = nextCompleted ? 'done' : 'todo';
          return {
            ...item,
            completed: nextCompleted,
            status: nextStatus,
            completedAt: nextCompleted ? new Date().toISOString() : undefined,
          };
        }
        return item;
      })
    );
  };

  const handleSaveItem = (updatedItem: Item) => {
    // If saving an individual occurrence
    if (updatedItem.isRecurringOccurrence && updatedItem.recurringSeriesId && updatedItem.originalScheduledDate) {
      const seriesId = updatedItem.recurringSeriesId;
      const origDate = updatedItem.originalScheduledDate;
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === seriesId) {
            const currentOverride = item.occurrenceOverrides?.[origDate] || {};
            return {
              ...item,
              occurrenceOverrides: {
                ...(item.occurrenceOverrides || {}),
                [origDate]: {
                  ...currentOverride,
                  title: updatedItem.title,
                  description: updatedItem.description,
                  completed: updatedItem.completed,
                  status: updatedItem.status,
                  completedAt: updatedItem.completedAt,
                  plannedDate: updatedItem.plannedDate,
                  dueDate: updatedItem.dueDate,
                  projectId: updatedItem.projectId,
                  tags: updatedItem.tags,
                },
              },
            };
          }
          return item;
        })
      );
      showToast('تغییرات فقط برای همین نوبت ذخیره شد.');
      return;
    }

    // Normal item or recurring series parent
    setItems((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)));

    // Check if item left active All Work filter
    if (activeView === 'all-work' && allWorkProjectFilters !== null) {
      const itemKey = updatedItem.projectId || UNASSIGNED_PROJECT_ID;
      if (!allWorkProjectFilters.includes(itemKey)) {
        showToast('مورد ویرایش‌شده خارج از فیلترهای فعال فعلی قرار دارد و با موفقیت ذخیره شد.');
      }
    }
  };

  const handleDeleteItem = (itemId: string) => {
    if (itemId.includes('__')) {
      const [seriesId, origDate] = itemId.split('__');
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === seriesId) {
            const currentOverride = item.occurrenceOverrides?.[origDate] || {};
            return {
              ...item,
              occurrenceOverrides: {
                ...(item.occurrenceOverrides || {}),
                [origDate]: {
                  ...currentOverride,
                  skipped: true,
                },
              },
            };
          }
          return item;
        })
      );
      showToast('نوبت نادیده گرفته شد و از لیست حذف گردید.');
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleRequestSkipOccurrence = (item: Item, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSkipConfirmOccurrence(item);
  };

  const handleConfirmSkipOccurrence = () => {
    if (!skipConfirmOccurrence) return;
    const seriesId = skipConfirmOccurrence.recurringSeriesId || skipConfirmOccurrence.id.split('__')[0];
    const origDate = skipConfirmOccurrence.originalScheduledDate || skipConfirmOccurrence.id.split('__')[1];
    const itemTitle = skipConfirmOccurrence.title;

    if (seriesId && origDate) {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === seriesId) {
            const currentOverride = item.occurrenceOverrides?.[origDate] || {};
            return {
              ...item,
              occurrenceOverrides: {
                ...(item.occurrenceOverrides || {}),
                [origDate]: {
                  ...currentOverride,
                  skipped: true,
                },
              },
            };
          }
          return item;
        })
      );
      setUndoSkipInfo({ seriesId, originalDate: origDate, title: itemTitle });
      showToast(`نوبت «${itemTitle}» نادیده گرفته شد.`);
    }
    setSkipConfirmOccurrence(null);
  };

  const handleUndoSkip = () => {
    if (!undoSkipInfo) return;
    const { seriesId, originalDate, title } = undoSkipInfo;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === seriesId && item.occurrenceOverrides?.[originalDate]) {
          const nextOverrides = { ...item.occurrenceOverrides };
          const cur = { ...nextOverrides[originalDate] };
          delete cur.skipped;
          if (Object.keys(cur).length === 0) {
            delete nextOverrides[originalDate];
          } else {
            nextOverrides[originalDate] = cur;
          }
          return {
            ...item,
            occurrenceOverrides: nextOverrides,
          };
        }
        return item;
      })
    );
    setUndoSkipInfo(null);
    showToast(`نوبت «${title}» بازگردانی شد.`);
  };

  const handleStopSeries = (seriesId: string, cutoffDate: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === seriesId && item.recurrence) {
          return {
            ...item,
            recurrence: {
              ...item.recurrence,
              stoppedAt: cutoffDate,
            },
          };
        }
        return item;
      })
    );
    showToast('تکرارهای آینده این کار از تاریخ انتخابی متوقف شد.');
  };

  const handleRestoreOccurrenceInModal = (seriesId: string, originalDate: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === seriesId && item.occurrenceOverrides?.[originalDate]) {
          const nextOverrides = { ...item.occurrenceOverrides };
          const cur = { ...nextOverrides[originalDate] };
          delete cur.skipped;
          if (Object.keys(cur).length === 0) {
            delete nextOverrides[originalDate];
          } else {
            nextOverrides[originalDate] = cur;
          }
          return {
            ...item,
            occurrenceOverrides: nextOverrides,
          };
        }
        return item;
      })
    );
    showToast('نوبت با موفقیت بازگردانی شد.');
  };

  // Explicit action to move a past item to today while preserving all other properties
  const handleMoveToToday = (item: Item, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated: Item = {
      ...item,
      plannedDate: todayDate,
      inToday: true,
    };
    handleSaveItem(updated);
  };

  // Project Handlers
  const handleOpenCreateProject = () => {
    setEditingProject(null);
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProject = (project: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProject(project);
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = (projectData: { name: string; description?: string; color: string }) => {
    if (editingProject) {
      const updated: Project = {
        ...editingProject,
        name: projectData.name,
        description: projectData.description,
        color: projectData.color,
      };
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } else {
      const newProject: Project = {
        id: generateId('proj'),
        name: projectData.name,
        description: projectData.description,
        color: projectData.color,
        createdAt: new Date().toISOString(),
        archived: false,
      };
      setProjects((prev) => [newProject, ...prev]);
      setSelectedProjectId(newProject.id);
      setActiveView('project-detail');
    }
  };

  const handleToggleArchiveProject = (projectId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          const nextArchived = !p.archived;
          return {
            ...p,
            archived: nextArchived,
            archivedAt: nextArchived ? new Date().toISOString() : undefined,
          };
        }
        return p;
      })
    );
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProjectId(project.id);
    setActiveView('project-detail');
  };

  // Import Data Handler for atomic replacement
  const handleImportData = (newItems: Item[], newProjects: Project[]): boolean => {
    try {
      setItems(newItems);
      setProjects(newProjects);
      saveItems(newItems);
      saveProjects(newProjects);
      return true;
    } catch (err) {
      console.error('Import error:', err);
      return false;
    }
  };

  // Expanded items for Today View (includes today's items + overdue unfinished occurrences from past 90 days)
  const expandedItemsForToday = useMemo(() => {
    return expandAllItems(items, todayDate, todayDate, {
      includeOverdueUnresolved: true,
      pastHorizonDays: 90,
      todayStr: todayDate,
    });
  }, [items, todayDate]);

  // Date-Based Logic for Today View
  // 1. Overdue Deadlines: Incomplete tasks with dueDate < todayDate
  // 2. Overdue Planned: Incomplete tasks with plannedDate < todayDate
  // 3. Today Main Items: Items planned for today OR due today (deduplicated)
  // 4. Completed Items
  const {
    overdueDeadlines,
    overduePlanned,
    todayActiveItems,
    todayCompletedItems,
    todayActiveCount,
    totalNotesCount,
  } = useMemo(() => {
    // Filter by search query
    let filtered = expandedItemsForToday;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((item) => {
        const titleMatch = item.title.toLowerCase().includes(q);
        const descMatch = item.description?.toLowerCase().includes(q) || false;
        const projectMatch = item.project?.toLowerCase().includes(q) || false;
        const tagMatch = item.tags?.some((t) => t.toLowerCase().includes(q)) || false;
        return titleMatch || descMatch || projectMatch || tagMatch;
      });
    }

    if (filter === 'tasks') {
      filtered = filtered.filter((item) => item.type === 'task');
    } else if (filter === 'notes') {
      filtered = filtered.filter((item) => item.type === 'note');
    }

    // 1. Overdue Deadlines: Incomplete tasks whose dueDate < todayDate
    const deadlinesOverdue = filtered.filter(
      (item) =>
        item.type === 'task' &&
        !item.completed &&
        item.status !== 'done' &&
        Boolean(item.dueDate && item.dueDate < todayDate)
    );

    // 2. Overdue Planned: Incomplete tasks whose plannedDate < todayDate
    const plannedOverdue = filtered.filter(
      (item) =>
        item.type === 'task' &&
        !item.completed &&
        item.status !== 'done' &&
        Boolean(item.plannedDate && item.plannedDate < todayDate)
    );

    // 3. Main Today List: items planned for today OR incomplete tasks due today
    // Deduplicated by ID so that an item planned for today and due today appears only once!
    const todayMap = new Map<string, Item>();

    for (const item of filtered) {
      const isPlannedToday = item.plannedDate === todayDate;
      const isDueToday =
        item.type === 'task' && item.dueDate === todayDate && !item.completed && item.status !== 'done';

      if (isPlannedToday || isDueToday) {
        todayMap.set(item.id, item);
      }
    }

    const todayAll = Array.from(todayMap.values());
    const activeMain = todayAll.filter((item) => !item.completed && item.status !== 'done');
    const completedMain = todayAll.filter(
      (item) => item.type === 'task' && (item.completed || item.status === 'done')
    );

    // Unique open tasks count (never inflated by items appearing in multiple sections)
    const uniqueOpenTaskIds = new Set<string>();
    for (const t of activeMain) {
      if (t.type === 'task') uniqueOpenTaskIds.add(t.id);
    }
    for (const t of plannedOverdue) {
      uniqueOpenTaskIds.add(t.id);
    }
    for (const t of deadlinesOverdue) {
      uniqueOpenTaskIds.add(t.id);
    }

    const notesCount = items.filter((item) => item.type === 'note').length;

    return {
      overdueDeadlines: deadlinesOverdue,
      overduePlanned: plannedOverdue,
      todayActiveItems: activeMain,
      todayCompletedItems: completedMain,
      todayActiveCount: uniqueOpenTaskIds.size,
      totalNotesCount: notesCount,
    };
  }, [expandedItemsForToday, items, searchQuery, filter, todayDate]);

  const activeProjectsCount = useMemo(() => {
    return projects.filter((p) => !p.archived).length;
  }, [projects]);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const selectedSeriesItem = useMemo(() => {
    if (!selectedSeriesModalId) return null;
    return items.find((p) => p.id === selectedSeriesModalId) || null;
  }, [items, selectedSeriesModalId]);

  const handleOpenQuickCaptureFromMobile = () => {
    if (activeView !== 'today') {
      setActiveView('today');
    }
    setTimeout(() => {
      captureSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      const inputEl = captureSectionRef.current?.querySelector('input');
      inputEl?.focus();
    }, 50);
  };

  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#111216] text-[#E2E4E9] flex antialiased selection:bg-violet-500/25 selection:text-white pb-20 md:pb-0">
        {/* Desktop Sidebar (RTL Right side) */}
        <Sidebar
          activeView={activeView}
          filter={filter}
          onNavigate={handleNavigate}
          isSimpleMode={isSimpleMode}
          onToggleSimpleMode={handleToggleSimpleMode}
          onOpenBackupModal={() => setIsBackupModalOpen(true)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          activeCount={todayActiveCount}
          allWorkCount={items.length}
          notesCount={totalNotesCount}
          projectsCount={activeProjectsCount}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Sticky Header with Contextual Title / Breadcrumbs and Simple Mode Toggle */}
          <Header
            activeView={activeView}
            activeProject={selectedProject}
            onNavigateToProjects={() => handleNavigate('projects')}
            todayActiveCount={todayActiveCount}
            activeProjectsCount={activeProjectsCount}
            isSimpleMode={isSimpleMode}
            onToggleSimpleMode={handleToggleSimpleMode}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">
          {/* VIEW 1: TODAY VIEW */}
          {activeView === 'today' && (
            <>
              {/* Separate Responsive Toolbar for Search & Filters */}
              <Toolbar
                filter={filter}
                onFilterChange={setFilter}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />

              {/* Quick Capture Component */}
              <div ref={captureSectionRef}>
                <QuickCapture
                  projects={projects}
                  onAddItem={handleAddItem}
                  isSimpleMode={isSimpleMode}
                />
              </div>

              {/* Today Sections: Overdue Deadlines, Overdue Planned Tasks, Main Today Items, and Completed */}
              <TodaySections
                overdueDeadlines={overdueDeadlines}
                overduePlanned={overduePlanned}
                todayActiveItems={todayActiveItems}
                todayCompletedItems={todayCompletedItems}
                projects={projects}
                isSimpleMode={isSimpleMode}
                filter={filter}
                searchQuery={searchQuery}
                onClearSearch={() => setSearchQuery('')}
                onResetFilter={() => setFilter('all')}
                onToggleComplete={handleToggleComplete}
                onSelectItem={(item) => setEditingItem(item)}
                onMoveToToday={handleMoveToToday}
                onOpenSeriesModal={(seriesId) => setSelectedSeriesModalId(seriesId)}
                onSkipOccurrence={handleRequestSkipOccurrence}
              />
            </>
          )}

          {/* VIEW 2: ALL WORK (List / Kanban / Calendar) */}
          {activeView === 'all-work' && (
            <AllWorkView
              items={items}
              projects={projects}
              activeTab={allWorkTab}
              onTabChange={handleAllWorkTabChange}
              selectedProjectIds={allWorkProjectFilters}
              onProjectFilterChange={handleAllWorkProjectFiltersChange}
              showArchivedProjects={allWorkShowArchived}
              onShowArchivedProjectsChange={handleAllWorkShowArchivedChange}
              searchQuery={allWorkSearchQuery}
              onSearchQueryChange={setAllWorkSearchQuery}
              isSimpleMode={isSimpleMode}
              onAddItem={handleAddItem}
              onUpdateItem={handleSaveItem}
              onToggleComplete={handleToggleComplete}
              onSelectItem={(item) => setEditingItem(item)}
              onShowToast={showToast}
            />
          )}

          {/* VIEW 3: NOTES VIEW */}
          {activeView === 'notes' && (
            <NotesView
              items={items}
              projects={projects}
              isSimpleMode={isSimpleMode}
              onAddItem={handleAddItem}
              onSelectItem={(item) => setEditingItem(item)}
            />
          )}

          {/* VIEW 4: PROJECTS LIST VIEW */}
          {activeView === 'projects' && (
            <ProjectList
              projects={projects}
              items={items}
              onSelectProject={handleSelectProject}
              onCreateProjectClick={handleOpenCreateProject}
              onEditProject={handleOpenEditProject}
              onToggleArchiveProject={handleToggleArchiveProject}
            />
          )}

          {/* VIEW 5: PROJECT DETAIL (List / Kanban / Calendar) */}
          {activeView === 'project-detail' && selectedProject && (
            <ProjectDetail
              project={selectedProject}
              items={items}
              projects={projects}
              viewMode={projectTab}
              onViewModeChange={handleProjectTabChange}
              isSimpleMode={isSimpleMode}
              onBack={() => setActiveView('projects')}
              onEditProject={handleOpenEditProject}
              onToggleArchiveProject={handleToggleArchiveProject}
              onAddItem={handleAddItem}
              onUpdateItem={handleSaveItem}
              onToggleComplete={handleToggleComplete}
              onSelectItem={(item) => setEditingItem(item)}
            />
          )}

          {/* Mobile Local Storage Indicator & Backup Trigger */}
          <div className="md:hidden pt-3 pb-1 text-center text-[11px] text-gray-500 flex items-center justify-center gap-2">
            <span>ذخیره محلی</span>
            <span>·</span>
            <button
              type="button"
              onClick={() => setIsBackupModalOpen(true)}
              className="text-violet-400 hover:text-violet-300 underline underline-offset-2 cursor-pointer"
            >
              خروجی JSON
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 cursor-pointer"
            >
              اتصال فایربیس
            </button>
          </div>
        </main>
      </div>

      {/* Floating Toast Notification for Filter Boundary Safety and Undo Actions */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] bg-[#1A1C26] border border-violet-500/40 text-violet-200 text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xl shadow-black/50 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Info className="w-4 h-4 text-violet-400 shrink-0" />
            <span className="truncate">{toastMessage}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {undoSkipInfo && (
              <button
                type="button"
                onClick={handleUndoSkip}
                className="text-xs font-semibold text-violet-300 hover:text-white bg-violet-900/50 hover:bg-violet-800/70 px-2 py-0.8 rounded border border-violet-700/60 cursor-pointer transition-colors"
              >
                بازگردانی
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setToastMessage(null);
                setUndoSkipInfo(null);
              }}
              className="text-gray-400 hover:text-white p-0.5 rounded cursor-pointer"
              aria-label="بستن پیام"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Item Detail / Editor Modal */}
      <ItemEditorModal
        item={editingItem}
        projects={projects}
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveItem}
        onDelete={handleDeleteItem}
        onOpenSeriesModal={(seriesId) => setSelectedSeriesModalId(seriesId)}
      />

      {/* Series Management Modal */}
      {selectedSeriesItem && (
        <SeriesModal
          isOpen={Boolean(selectedSeriesModalId)}
          onClose={() => setSelectedSeriesModalId(null)}
          seriesItem={selectedSeriesItem}
          onStopSeries={handleStopSeries}
          onRestoreOccurrence={handleRestoreOccurrenceInModal}
        />
      )}

      {/* Skip Occurrence Confirmation Dialog */}
      {skipConfirmOccurrence && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs"
          onClick={() => setSkipConfirmOccurrence(null)}
        >
          <div
            className="w-full max-w-sm bg-[#181920] border border-[#2D2F3C] rounded-2xl p-5 shadow-2xl text-right animate-in zoom-in-95 duration-150 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-amber-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-semibold text-gray-100">صرف‌نظر از این نوبت؟</h3>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              آیا از نادیده گرفتن نوبت «{skipConfirmOccurrence.title}» در تاریخ{' '}
              <span className="font-semibold text-violet-300">
                {formatJalaliDate(
                  skipConfirmOccurrence.originalScheduledDate || skipConfirmOccurrence.plannedDate || todayDate,
                  'full'
                )}
              </span>{' '}
              اطمینان دارید؟
            </p>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              این عمل زنجیره تکرار و سایر نوبت‌ها را تغییر نمی‌دهد و این نوبت از بخش مدیریت زنجیره قابل بازگردانی خواهد بود.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262835]">
              <button
                type="button"
                onClick={() => setSkipConfirmOccurrence(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmSkipOccurrence}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                صرف‌نظر از نوبت
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Project Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        project={editingProject}
        onClose={() => {
          setIsProjectModalOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
      />

      {/* Backup and Restore Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        items={items}
        projects={projects}
        onImportData={handleImportData}
        isItemEditorOpen={Boolean(editingItem)}
      />

      {/* Firebase Authentication & Cloud Architecture Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Mobile Bottom Navigation */}
      <MobileNav
        activeView={activeView}
        filter={filter}
        onNavigate={handleNavigate}
        onOpenQuickCapture={handleOpenQuickCaptureFromMobile}
        isSimpleMode={isSimpleMode}
        onToggleSimpleMode={handleToggleSimpleMode}
        activeCount={todayActiveCount}
        projectsCount={activeProjectsCount}
      />
    </div>
  </AuthProvider>
  );
}
