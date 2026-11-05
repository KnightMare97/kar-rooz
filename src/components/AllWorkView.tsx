import React, { useState, useMemo } from 'react';
import { Item, Project, WorkViewTab, KanbanStatus, ItemType, UNASSIGNED_PROJECT_ID } from '../types';
import { WorkListView } from './WorkListView';
import { KanbanBoard } from './KanbanBoard';
import { CalendarView } from './CalendarView';
import { ProjectMultiSelect } from './ProjectMultiSelect';
import {
  List as ListIcon,
  Columns,
  Calendar as CalendarIcon,
  Search,
  X,
  Plus,
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronUp,
  Sun,
  AlertCircle,
  Repeat,
} from 'lucide-react';
import { toPersianDigits, getTehranTodayDateString, formatJalaliDate, addDays } from '../utils/date';
import { expandAllItems } from '../utils/recurrence';

interface AllWorkViewProps {
  items: Item[];
  projects: Project[];
  activeTab: WorkViewTab;
  onTabChange: (tab: WorkViewTab) => void;
  selectedProjectIds: string[] | null;
  onProjectFilterChange: (selected: string[] | null) => void;
  showArchivedProjects: boolean;
  onShowArchivedProjectsChange: (show: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  isSimpleMode: boolean;
  onAddItem: (itemData: Omit<Item, 'id' | 'createdAt'>) => void;
  onUpdateItem: (item: Item) => void;
  onToggleComplete: (id: string, e: React.MouseEvent) => void;
  onSelectItem: (item: Item) => void;
  onShowToast: (message: string) => void;
}

export const AllWorkView: React.FC<AllWorkViewProps> = ({
  items,
  projects,
  activeTab,
  onTabChange,
  selectedProjectIds,
  onProjectFilterChange,
  showArchivedProjects,
  onShowArchivedProjectsChange,
  searchQuery,
  onSearchQueryChange,
  isSimpleMode,
  onAddItem,
  onUpdateItem,
  onToggleComplete,
  onSelectItem,
  onShowToast,
}) => {
  // Capture Form State
  const [captureTitle, setCaptureTitle] = useState('');
  const [captureType, setCaptureType] = useState<ItemType>('task');
  const [captureProjectId, setCaptureProjectId] = useState<string>('');
  const [captureDescription, setCaptureDescription] = useState('');
  const [captureTags, setCaptureTags] = useState('');
  const [captureInToday, setCaptureInToday] = useState(false);
  const [isCaptureExpanded, setIsCaptureExpanded] = useState(false);

  // Active Projects
  const activeProjects = useMemo(() => projects.filter((p) => !p.archived), [projects]);

  // Derive if exactly one concrete project is selected in filter (to preselect in capture)
  const singleSelectedConcreteProject = useMemo(() => {
    if (selectedProjectIds && selectedProjectIds.length === 1) {
      const id = selectedProjectIds[0];
      if (id !== UNASSIGNED_PROJECT_ID) {
        return projects.find((p) => p.id === id) || null;
      }
    }
    return null;
  }, [selectedProjectIds, projects]);

  // Preselect project in capture form if exactly one concrete project is selected in filter
  React.useEffect(() => {
    if (singleSelectedConcreteProject) {
      setCaptureProjectId(singleSelectedConcreteProject.id);
    } else {
      setCaptureProjectId('');
    }
  }, [singleSelectedConcreteProject]);

  // Project membership filter (OR logic across selected projects)
  // Default (selectedProjectIds === null): all active projects + unassigned
  const projectFilteredItems = useMemo(() => {
    if (selectedProjectIds === null) {
      // Default: active projects + unassigned items (exclude archived project items unless explicitly enabled)
      const activeProjectIds = new Set(activeProjects.map((p) => p.id));
      const activeProjectNames = new Set(activeProjects.map((p) => p.name));

      return items.filter((item) => {
        if (!item.projectId && !item.project) return true; // unassigned
        if (item.projectId) return activeProjectIds.has(item.projectId);
        if (item.project) return activeProjectNames.has(item.project);
        return true;
      });
    }

    // Custom selection with OR membership
    const selectedSet = new Set(selectedProjectIds);
    const allowUnassigned = selectedSet.has(UNASSIGNED_PROJECT_ID);

    return items.filter((item) => {
      const isUnassigned = !item.projectId && !item.project;
      if (isUnassigned) {
        return allowUnassigned;
      }

      if (item.projectId && selectedSet.has(item.projectId)) {
        return true;
      }

      if (item.project) {
        const proj = projects.find((p) => p.name === item.project);
        if (proj && selectedSet.has(proj.id)) {
          return true;
        }
      }

      return false;
    });
  }, [items, selectedProjectIds, activeProjects, projects]);

  // Search filter applied on top of project filter
  const searchAndProjectFilteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return projectFilteredItems;

    return projectFilteredItems.filter((item) => {
      const titleMatch = item.title.toLowerCase().includes(q);
      const descMatch = item.description?.toLowerCase().includes(q) || false;
      const projectMatch = item.project?.toLowerCase().includes(q) || false;
      const tagMatch = item.tags?.some((t) => t.toLowerCase().includes(q)) || false;
      return titleMatch || descMatch || projectMatch || tagMatch;
    });
  }, [projectFilteredItems, searchQuery]);

  const todayStr = getTehranTodayDateString();
  const [upcomingDaysHorizon, setUpcomingDaysHorizon] = useState<number>(90);
  const [pastHorizonDays] = useState<number>(60);
  const [showPastHistorical, setShowPastHistorical] = useState<boolean>(false);

  // Check if any recurring items exist
  const hasRecurringItems = useMemo(() => {
    return searchAndProjectFilteredItems.some((i) => Boolean(i.recurrence));
  }, [searchAndProjectFilteredItems]);

  // Expanded items for bounded List & Kanban views (default upcoming 90 days + unresolved past)
  const expandedListAndKanbanItems = useMemo(() => {
    const horizonEndDate = addDays(todayStr, upcomingDaysHorizon);
    const horizonStartDate = showPastHistorical
      ? addDays(todayStr, -pastHorizonDays * 2)
      : todayStr;

    return expandAllItems(
      searchAndProjectFilteredItems,
      horizonStartDate,
      horizonEndDate,
      {
        includeOverdueUnresolved: true,
        pastHorizonDays: showPastHistorical ? pastHorizonDays * 2 : pastHorizonDays,
        todayStr,
      }
    );
  }, [searchAndProjectFilteredItems, todayStr, upcomingDaysHorizon, pastHorizonDays, showPastHistorical]);

  // Tasks only for Kanban board
  const kanbanTasks = useMemo(() => {
    return expandedListAndKanbanItems.filter((item) => item.type === 'task');
  }, [expandedListAndKanbanItems]);

  const handleStatusChange = (taskId: string, newStatus: KanbanStatus) => {
    const task = items.find((i) => i.id === taskId);
    if (!task) return;

    const isDone = newStatus === 'done';
    onUpdateItem({
      ...task,
      status: newStatus,
      completed: isDone,
      completedAt: isDone ? task.completedAt || new Date().toISOString() : undefined,
    });
  };

  const handleCaptureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!captureTitle.trim()) return;

    const chosenProj = projects.find((p) => p.id === captureProjectId);
    const tags = captureTags
      .split(/[,،]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const isTask = captureType === 'task';

    const newItemData: Omit<Item, 'id' | 'createdAt'> = {
      type: captureType,
      title: captureTitle.trim(),
      description: captureDescription.trim() || undefined,
      completed: false,
      status: isTask ? 'todo' : undefined,
      projectId: captureProjectId || undefined,
      project: chosenProj?.name,
      tags,
      plannedDate: captureInToday ? getTehranTodayDateString() : undefined,
      inToday: captureInToday,
      destination: captureInToday ? 'today' : undefined,
    };

    onAddItem(newItemData);

    // Check if new item falls outside active filters
    if (selectedProjectIds !== null) {
      const matchesFilter = captureProjectId
        ? selectedProjectIds.includes(captureProjectId)
        : selectedProjectIds.includes(UNASSIGNED_PROJECT_ID);

      if (!matchesFilter) {
        const destName = chosenProj ? `پروژه «${chosenProj.name}»` : 'بخش بدون پروژه';
        onShowToast(`مورد جدید در ${destName} ثبت شد و خارج از فیلتر فعال فعلی است.`);
      }
    }

    setCaptureTitle('');
    setCaptureDescription('');
    setCaptureTags('');
    setCaptureInToday(false);
    setIsCaptureExpanded(false);
    // keep preselected project if single project is active
    if (!singleSelectedConcreteProject) {
      setCaptureProjectId('');
    }
  };

  const hasActiveFilters = selectedProjectIds !== null || Boolean(searchQuery.trim());

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* 1. Header Toolbar: View Switcher (List, Kanban, Calendar) & Filters */}
      <div className="bg-[#15161D] border border-[#232532] rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* View Tabs */}
          <div className="flex items-center p-1 bg-[#121318] rounded-xl border border-[#242634] self-start sm:self-auto select-none">
            <button
              type="button"
              onClick={() => onTabChange('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-[#27243B] text-violet-200 border border-violet-500/30 shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>فهرست</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                activeTab === 'kanban'
                  ? 'bg-[#27243B] text-violet-200 border border-violet-500/30 shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>کانبان</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-[#27243B] text-violet-200 border border-violet-500/30 shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>تقویم</span>
            </button>
          </div>

          {/* Counts & Summary */}
          <div className="text-xs text-gray-400 flex items-center gap-2">
            <span>
              {toPersianDigits(searchAndProjectFilteredItems.length)} مورد در این نما
            </span>
            {hasActiveFilters && (
              <span className="text-[10px] text-violet-300 bg-violet-950/40 border border-violet-800/40 px-2 py-0.5 rounded-full">
                فیلتر فعال
              </span>
            )}
          </div>
        </div>

        {/* Filter Bar: Search + Multi-Select Project Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1 border-t border-[#232532]/70">
          {/* Search Box */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              dir="auto"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="جستجو در تمام کارها، یادداشت‌ها و برچسب‌ها..."
              className="w-full pr-8 pl-7 py-1.5 bg-[#121318] border border-[#242634] focus:border-violet-500 rounded-lg text-xs text-gray-200 placeholder-gray-500 outline-hidden transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchQueryChange('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 cursor-pointer"
                title="پاک کردن جستجو"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Multi-Select Project Filter */}
          <ProjectMultiSelect
            projects={projects}
            items={items}
            selectedProjectIds={selectedProjectIds}
            onSelectionChange={onProjectFilterChange}
            showArchived={showArchivedProjects}
            onShowArchivedChange={onShowArchivedProjectsChange}
            isSimpleMode={isSimpleMode}
          />
        </div>
      </div>

      {/* 2. Quick Capture for All Work */}
      <div className="bg-[#15161D] border border-[#232532] rounded-2xl p-3 sm:p-4 shadow-xs">
        <form onSubmit={handleCaptureSubmit} className="space-y-2.5">
          <div className="flex items-center gap-2">
            {/* Type Switcher */}
            <div className="flex items-center p-0.5 bg-[#121318] rounded-lg border border-[#242634] shrink-0 text-xs select-none">
              <button
                type="button"
                onClick={() => setCaptureType('task')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded cursor-pointer transition-colors ${
                  captureType === 'task'
                    ? 'bg-[#29263E] text-violet-200 font-medium'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
                <span className="hidden sm:inline">تسک</span>
              </button>
              <button
                type="button"
                onClick={() => setCaptureType('note')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded cursor-pointer transition-colors ${
                  captureType === 'note'
                    ? 'bg-[#29263E] text-violet-200 font-medium'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">یادداشت</span>
              </button>
            </div>

            {/* Title Input */}
            <input
              type="text"
              dir="auto"
              value={captureTitle}
              onChange={(e) => setCaptureTitle(e.target.value)}
              placeholder={
                captureType === 'task'
                  ? singleSelectedConcreteProject
                    ? `تسک جدید در «${singleSelectedConcreteProject.name}»...`
                    : 'عنوان تسک جدید در همه کارها...'
                  : singleSelectedConcreteProject
                    ? `یادداشت جدید در «${singleSelectedConcreteProject.name}»...`
                    : 'عنوان یادداشت جدید...'
              }
              className="flex-1 bg-transparent border-0 px-2 text-xs sm:text-sm text-gray-100 placeholder-gray-500 focus:outline-hidden"
            />

            {/* Toggle Details */}
            {!isSimpleMode && (
              <button
                type="button"
                onClick={() => setIsCaptureExpanded(!isCaptureExpanded)}
                className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded-md transition-colors cursor-pointer shrink-0"
                title="توضیحات و پروژه"
              >
                {isCaptureExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!captureTitle.trim()}
              className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-35 rounded-lg transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ثبت</span>
            </button>
          </div>

          {/* Expandable Secondary Fields */}
          {isCaptureExpanded && !isSimpleMode && (
            <div className="pt-2 border-t border-[#20222D] space-y-2.5 animate-in fade-in duration-150">
              <textarea
                dir="auto"
                rows={2}
                value={captureDescription}
                onChange={(e) => setCaptureDescription(e.target.value)}
                placeholder="توضیحات تکمیلی (اختیاری)..."
                className="w-full px-3 py-1.5 bg-[#121318] border border-[#242634] rounded-lg text-xs text-gray-200 placeholder-gray-500 outline-hidden focus:border-violet-500 resize-none leading-relaxed"
              />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                {/* Project selector */}
                <select
                  value={captureProjectId}
                  onChange={(e) => setCaptureProjectId(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-[#121318] border border-[#242634] rounded-lg text-xs text-gray-300 outline-hidden focus:border-violet-500"
                >
                  <option value="">بدون پروژه (اختصاص‌نیافته)</option>
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                {/* Tags */}
                <input
                  type="text"
                  dir="auto"
                  value={captureTags}
                  onChange={(e) => setCaptureTags(e.target.value)}
                  placeholder="برچسب‌ها (با کاما)"
                  className="flex-1 px-2.5 py-1.5 bg-[#121318] border border-[#242634] rounded-lg text-xs text-gray-300 placeholder-gray-500 outline-hidden focus:border-violet-500"
                />

                {/* Today toggle */}
                <label className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 cursor-pointer select-none px-1">
                  <input
                    type="checkbox"
                    checked={captureInToday}
                    onChange={(e) => setCaptureInToday(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-violet-600 border-gray-600 focus:ring-violet-500 cursor-pointer"
                  />
                  <Sun className="w-3 h-3 text-violet-400" />
                  <span>انجام در امروز</span>
                </label>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Recurrence Horizon Control Bar for Bounded List & Kanban */}
      {hasRecurringItems && (activeTab === 'list' || activeTab === 'kanban') && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-[#14151C] border border-[#232532] text-xs text-gray-400 select-none">
          <div className="flex items-center gap-2">
            <Repeat className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span>
              نمایش تکرارها تا {toPersianDigits(upcomingDaysHorizon)} روز آینده (تا {formatJalaliDate(addDays(todayStr, upcomingDaysHorizon), 'short')})
            </span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setShowPastHistorical(!showPastHistorical)}
              className={`px-2 py-1 text-[11px] rounded-lg border transition-colors cursor-pointer ${
                showPastHistorical
                  ? 'bg-violet-950/40 text-violet-300 border-violet-700/50'
                  : 'bg-[#181920] text-gray-400 border-[#282A38] hover:text-white'
              }`}
            >
              {showPastHistorical ? 'پنهان‌سازی گذشته' : 'بررسی نوبت‌های گذشته'}
            </button>
            <button
              type="button"
              onClick={() => setUpcomingDaysHorizon((prev) => prev + 90)}
              className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-violet-950/40 text-violet-300 hover:text-white hover:bg-violet-900/50 border border-violet-800/40 transition-colors cursor-pointer"
            >
              نمایش نوبت‌های بیشتر (+۹۰ روز)
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Views: List, Kanban, or Calendar */}
      {activeTab === 'list' && (
        <WorkListView
          items={expandedListAndKanbanItems}
          projects={projects}
          isSimpleMode={isSimpleMode}
          onToggleComplete={onToggleComplete}
          onStatusChange={handleStatusChange}
          onSelectItem={onSelectItem}
          showProjectBadge={true}
          searchQuery={searchQuery}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={() => {
            onProjectFilterChange(null);
            onSearchQueryChange('');
          }}
        />
      )}

      {activeTab === 'kanban' && (
        <section aria-label="کانبان همه کارها">
          {kanbanTasks.length > 0 ? (
            <KanbanBoard
              tasks={kanbanTasks}
              projects={projects}
              isSimpleMode={isSimpleMode}
              onStatusChange={handleStatusChange}
              onToggleComplete={onToggleComplete}
              onSelectTask={onSelectItem}
              showProjectBadge={true}
            />
          ) : (
            <div className="py-12 text-center rounded-xl border border-dashed border-[#242633] bg-[#14151C]/40 text-xs text-gray-400 space-y-2">
              {hasActiveFilters ? (
                <>
                  <p>هیچ تسکی با فیلترهای انتخابی در ستون‌های کانبان یافت نشد.</p>
                  <button
                    type="button"
                    onClick={() => {
                      onProjectFilterChange(null);
                      onSearchQueryChange('');
                    }}
                    className="text-violet-400 hover:text-violet-300 underline underline-offset-2 cursor-pointer font-medium"
                  >
                    پاک کردن فیلترها و نمایش همه
                  </button>
                </>
              ) : (
                <p>تسوکی برای نمایش در کانبان وجود ندارد. با کادر بالا می‌توانید تسک جدیدی ثبت کنید.</p>
              )}
            </div>
          )}
        </section>
      )}

      {activeTab === 'calendar' && (
        <CalendarView
          items={searchAndProjectFilteredItems}
          projects={projects}
          isSimpleMode={isSimpleMode}
          onSelectItem={onSelectItem}
          onToggleComplete={onToggleComplete}
          onAddItem={onAddItem}
          defaultProjectId={singleSelectedConcreteProject ? singleSelectedConcreteProject.id : undefined}
          disableProjectPicker={false}
        />
      )}
    </div>
  );
};
