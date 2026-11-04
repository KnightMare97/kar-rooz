/**
 * KarRooz (کار روز) - Personal Task, Note & Project Manager
 * Calm, focused, device-local, RTL Persian productivity tool.
 * Iteration 3: Persian Calendar and Date-Based Planning.
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Item, Project, FilterType, ActiveView, KanbanStatus } from './types';
import {
  loadItems,
  saveItems,
  loadProjects,
  saveProjects,
  loadSimpleMode,
  saveSimpleMode,
} from './services/storage';
import { getTehranTodayDateString } from './utils/date';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { QuickCapture } from './components/QuickCapture';
import { TodaySections } from './components/TodaySections';
import { CalendarView } from './components/CalendarView';
import { ItemEditorModal } from './components/ItemEditorModal';
import { MobileNav } from './components/MobileNav';
import { ProjectList } from './components/ProjectList';
import { ProjectDetail } from './components/ProjectDetail';
import { ProjectModal } from './components/ProjectModal';
import { BackupModal } from './components/BackupModal';

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

  // Modals
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

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
  };

  const handleToggleComplete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
    setItems((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
  };

  const handleDeleteItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
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
    let filtered = items;
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
  }, [items, searchQuery, filter, todayDate]);

  const activeProjectsCount = useMemo(() => {
    return projects.filter((p) => !p.archived).length;
  }, [projects]);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

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
    <div className="min-h-screen bg-[#111216] text-[#E2E4E9] flex antialiased selection:bg-violet-500/25 selection:text-white pb-20 md:pb-0">
      {/* Desktop Sidebar (RTL Right side) */}
      <Sidebar
        activeView={activeView}
        filter={filter}
        onNavigate={handleNavigate}
        isSimpleMode={isSimpleMode}
        onToggleSimpleMode={handleToggleSimpleMode}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        activeCount={todayActiveCount}
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
              />
            </>
          )}

          {/* VIEW 2: CALENDAR VIEW */}
          {activeView === 'calendar' && (
            <CalendarView
              items={items}
              projects={projects}
              isSimpleMode={isSimpleMode}
              onSelectItem={(item) => setEditingItem(item)}
              onToggleComplete={handleToggleComplete}
              onAddItem={handleAddItem}
            />
          )}

          {/* VIEW 3: PROJECTS LIST VIEW */}
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

          {/* VIEW 4: PROJECT DETAIL & KANBAN VIEW */}
          {activeView === 'project-detail' && selectedProject && (
            <ProjectDetail
              project={selectedProject}
              items={items}
              projects={projects}
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
            <span>ذخیره محلی روی همین دستگاه</span>
            <span>·</span>
            <button
              type="button"
              onClick={() => setIsBackupModalOpen(true)}
              className="text-violet-400 hover:text-violet-300 underline underline-offset-2 cursor-pointer"
            >
              خروجی و بازیابی داده‌ها
            </button>
          </div>
        </main>
      </div>

      {/* Item Detail / Editor Modal */}
      <ItemEditorModal
        item={editingItem}
        projects={projects}
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveItem}
        onDelete={handleDeleteItem}
      />

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
  );
}
