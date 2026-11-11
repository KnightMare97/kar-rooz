import React, { useState, useMemo } from 'react';
import { Project, Item, KanbanStatus, ItemType, WorkViewTab } from '../types';
import { KanbanBoard } from './KanbanBoard';
import { WorkListView } from './WorkListView';
import { CalendarView } from './CalendarView';
import { CompleteTaskConfirmModal } from './CompleteTaskConfirmModal';
import {
  Archive,
  RotateCcw,
  Edit2,
  Columns,
  List as ListIcon,
  Calendar as CalendarIcon,
  Plus,
  FileText,
  CheckCircle2,
  Sun,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Repeat,
} from 'lucide-react';
import { toPersianDigits, getTehranTodayDateString, formatJalaliDate, addDays } from '../utils/date';
import { expandAllItems } from '../utils/recurrence';

interface ProjectDetailProps {
  project: Project;
  items: Item[]; // all items
  projects: Project[];
  viewMode: WorkViewTab;
  onViewModeChange: (mode: WorkViewTab) => void;
  isSimpleMode: boolean;
  onBack: () => void;
  onEditProject: (project: Project) => void;
  onToggleArchiveProject: (projectId: string) => void;
  onAddItem: (itemData: Omit<Item, 'id' | 'createdAt'>) => void;
  onUpdateItem: (item: Item) => void;
  onToggleComplete: (id: string, e: React.MouseEvent) => void;
  onSelectItem: (item: Item) => void;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  project,
  items,
  projects,
  viewMode,
  onViewModeChange,
  isSimpleMode,
  onBack,
  onEditProject,
  onToggleArchiveProject,
  onAddItem,
  onUpdateItem,
  onToggleComplete,
  onSelectItem,
}) => {
  // Search within project
  const [searchQuery, setSearchQuery] = useState('');

  // Project Quick Capture Form State
  const [captureTitle, setCaptureTitle] = useState('');
  const [captureType, setCaptureType] = useState<ItemType>('task');
  const [captureInToday, setCaptureInToday] = useState(false); // Off by default
  const [isCaptureExpanded, setIsCaptureExpanded] = useState(false);
  const [captureDescription, setCaptureDescription] = useState('');
  const [captureTags, setCaptureTags] = useState('');

  // Linked notes collapsed state (in Kanban view)
  const [isNotesOpen, setIsNotesOpen] = useState(true);

  // All items belonging to this project (tasks + notes)
  const allProjectItems = useMemo(() => {
    return items.filter(
      (item) => item.projectId === project.id || (!item.projectId && item.project === project.name)
    );
  }, [items, project.id, project.name]);

  // Tasks belonging to this project
  const allProjectTasks = useMemo(() => {
    return allProjectItems.filter((item) => item.type === 'task');
  }, [allProjectItems]);

  // Notes belonging to this project
  const allProjectNotes = useMemo(() => {
    return allProjectItems.filter((item) => item.type === 'note');
  }, [allProjectItems]);

  // Filtered items based on search query
  const searchFilteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allProjectItems;

    return allProjectItems.filter((item) => {
      const titleMatch = item.title.toLowerCase().includes(q);
      const descMatch = item.description?.toLowerCase().includes(q) || false;
      const tagMatch = item.tags?.some((t) => t.toLowerCase().includes(q)) || false;
      return titleMatch || descMatch || tagMatch;
    });
  }, [allProjectItems, searchQuery]);

  const todayStr = getTehranTodayDateString();
  const [upcomingDaysHorizon, setUpcomingDaysHorizon] = useState<number>(90);
  const [pastHorizonDays, setPastHorizonDays] = useState<number>(60);
  const [showPastHistorical, setShowPastHistorical] = useState<boolean>(false);

  // Check if any recurring items exist in this project
  const hasRecurringItems = useMemo(() => {
    return searchFilteredItems.some((i) => Boolean(i.recurrence));
  }, [searchFilteredItems]);

  // Expanded items for bounded List & Kanban views (default upcoming 90 days + unresolved past)
  const expandedProjectItems = useMemo(() => {
    const horizonEndDate = addDays(todayStr, upcomingDaysHorizon);
    const horizonStartDate = showPastHistorical
      ? addDays(todayStr, -pastHorizonDays * 2)
      : todayStr;

    return expandAllItems(
      searchFilteredItems,
      horizonStartDate,
      horizonEndDate,
      {
        includeOverdueUnresolved: true,
        pastHorizonDays: showPastHistorical ? pastHorizonDays * 2 : pastHorizonDays,
        todayStr,
      }
    );
  }, [searchFilteredItems, todayStr, upcomingDaysHorizon, pastHorizonDays, showPastHistorical]);

  // Filtered tasks specifically for Kanban
  const searchFilteredTasks = useMemo(() => {
    return expandedProjectItems.filter((item) => item.type === 'task');
  }, [expandedProjectItems]);

  // Filtered notes specifically for Kanban notes section
  const searchFilteredNotes = useMemo(() => {
    return searchFilteredItems.filter((item) => item.type === 'note');
  }, [searchFilteredItems]);

  const [confirmCompleteTask, setConfirmCompleteTask] = useState<Item | null>(null);

  const handleStatusChange = (taskId: string, newStatus: KanbanStatus) => {
    const task = items.find((i) => i.id === taskId);
    if (!task) return;

    if (newStatus === 'done') {
      const openSteps = task.steps?.filter((s) => s.text.trim().length > 0 && !s.completed);
      if (openSteps && openSteps.length > 0) {
        setConfirmCompleteTask(task);
        return;
      }
    }

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

    const tags = captureTags
      .split(/[,،]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const isTask = captureType === 'task';

    onAddItem({
      type: captureType,
      title: captureTitle.trim(),
      description: captureDescription.trim() || undefined,
      completed: false,
      status: isTask ? 'todo' : undefined,
      projectId: project.id,
      project: project.name,
      tags,
      plannedDate: captureInToday ? getTehranTodayDateString() : undefined,
      inToday: captureInToday,
      destination: captureInToday ? 'today' : undefined,
    });

    setCaptureTitle('');
    setCaptureDescription('');
    setCaptureTags('');
    setCaptureInToday(false);
    setIsCaptureExpanded(false);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Compact Project Bar (Avoids duplicate large title since header has breadcrumb) */}
      <div className="bg-[#15161D] border border-[#232532] rounded-2xl p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Project description or summary */}
          <div className="min-w-0">
            {project.description ? (
              <p className="text-xs text-gray-300 leading-relaxed max-w-xl">
                {project.description}
              </p>
            ) : (
              <span className="text-xs text-gray-400">
                پروژه با {toPersianDigits(allProjectTasks.length)} تسک و {toPersianDigits(allProjectNotes.length)} یادداشت
              </span>
            )}
          </div>

          {/* Action Tools & 3-Tab View Switcher */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* 3-Tab View Switcher: List, Kanban, Calendar */}
            <div className="flex items-center p-0.5 bg-[#121318] rounded-xl border border-[#242634] select-none">
              <button
                type="button"
                onClick={() => onViewModeChange('list')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-[#27243B] text-violet-200 border border-violet-500/30 shadow-xs'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title="نمای فهرست (تسک‌ها و یادداشت‌ها)"
              >
                <ListIcon className="w-3.5 h-3.5" />
                <span>فهرست</span>
              </button>

              <button
                type="button"
                onClick={() => onViewModeChange('kanban')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-[#27243B] text-violet-200 border border-violet-500/30 shadow-xs'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title="نمای کانبان (۳ ستون کاری)"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>کانبان</span>
              </button>

              <button
                type="button"
                onClick={() => onViewModeChange('calendar')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-[#27243B] text-violet-200 border border-violet-500/30 shadow-xs'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title="نمای تقویم این پروژه"
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>تقویم</span>
              </button>
            </div>

            {/* Edit Project */}
            <button
              type="button"
              onClick={() => onEditProject(project)}
              className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-[#1E202B] rounded-lg border border-[#242634] transition-colors cursor-pointer"
              title="ویرایش مشخصات پروژه"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            {/* Archive / Restore */}
            <button
              type="button"
              onClick={() => onToggleArchiveProject(project.id)}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition-colors cursor-pointer ${
                project.archived
                  ? 'bg-amber-950/30 text-amber-300 border-amber-800/40 hover:bg-amber-900/40'
                  : 'bg-[#181920] text-gray-400 border-[#242634] hover:text-gray-200'
              }`}
              title={project.archived ? 'خروج پروژه از آرشیو' : 'انتقال پروژه به آرشیو'}
            >
              {project.archived ? <RotateCcw className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
              <span>{project.archived ? 'بازگردانی' : 'آرشیو'}</span>
            </button>
          </div>
        </div>

        {/* Project Search Box */}
        <div className="pt-2.5 mt-2.5 border-t border-[#232532]/70">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              dir="auto"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`جستجو در کارهای «${project.name}»...`}
              className="w-full pr-8 pl-7 py-1.5 bg-[#121318] border border-[#242634] focus:border-violet-500 rounded-lg text-xs text-gray-200 placeholder-gray-500 outline-hidden transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 cursor-pointer"
                title="پاک کردن جستجو"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Capture (Fixed to this Project - No redundant project picker!) */}
      {viewMode !== 'calendar' && (
        <div className="bg-[#15161D] border border-[#232532] rounded-2xl p-3 sm:p-4 shadow-xs">
          <form onSubmit={handleCaptureSubmit} className="space-y-2.5">
            <div className="flex items-center gap-2">
              {/* Type selector */}
              <div className="flex items-center p-0.5 bg-[#121318] rounded-lg border border-[#242634] shrink-0 text-xs select-none">
                <button
                  type="button"
                  onClick={() => setCaptureType('task')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded cursor-pointer transition-colors ${
                    captureType === 'task'
                      ? 'bg-[#27243B] text-violet-200 font-medium'
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
                      ? 'bg-[#27243B] text-violet-200 font-medium'
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
                    ? `افزودن تسک به «${project.name}»...`
                    : `افزودن یادداشت به «${project.name}»...`
                }
                className="flex-1 bg-transparent border-0 px-2 text-xs sm:text-sm text-gray-100 placeholder-gray-500 focus:outline-hidden"
              />

              {/* Toggle Details */}
              {!isSimpleMode && (
                <button
                  type="button"
                  onClick={() => setIsCaptureExpanded(!isCaptureExpanded)}
                  className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded-md transition-colors cursor-pointer shrink-0"
                  title="توضیحات و برچسب‌ها"
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

            {/* Expanded Secondary Fields */}
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
                  <input
                    type="text"
                    dir="auto"
                    value={captureTags}
                    onChange={(e) => setCaptureTags(e.target.value)}
                    placeholder="برچسب‌ها (با کاما)"
                    className="flex-1 px-2.5 py-1.5 bg-[#121318] border border-[#242634] rounded-lg text-xs text-gray-200 placeholder-gray-500 outline-hidden focus:border-violet-500"
                  />

                  {/* Explicit "نمایش در امروز" Switch */}
                  <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none px-1">
                    <input
                      type="checkbox"
                      checked={captureInToday}
                      onChange={(e) => setCaptureInToday(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-violet-600 border-gray-600 focus:ring-violet-500 cursor-pointer"
                    />
                    <span className="flex items-center gap-1">
                      <Sun className="w-3.5 h-3.5 text-violet-400" />
                      <span>نمایش در کارهای امروز</span>
                    </span>
                  </label>
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Recurrence Horizon Control Bar for Bounded List & Kanban */}
      {hasRecurringItems && (viewMode === 'list' || viewMode === 'kanban') && (
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

      {/* Main Views */}
      {viewMode === 'list' && (
        <WorkListView
          items={expandedProjectItems}
          projects={projects}
          isSimpleMode={isSimpleMode}
          onToggleComplete={onToggleComplete}
          onStatusChange={handleStatusChange}
          onSelectItem={onSelectItem}
          showProjectBadge={false}
          searchQuery={searchQuery}
          hasActiveFilters={Boolean(searchQuery)}
          onResetFilters={() => setSearchQuery('')}
        />
      )}

      {viewMode === 'kanban' && (
        <div className="space-y-4">
          <section aria-label="کانبان پروژه">
            {searchFilteredTasks.length > 0 ? (
              <KanbanBoard
                tasks={searchFilteredTasks}
                projects={projects}
                isSimpleMode={isSimpleMode}
                onStatusChange={handleStatusChange}
                onToggleComplete={onToggleComplete}
                onSelectTask={onSelectItem}
                showProjectBadge={false}
              />
            ) : (
              <div className="py-12 text-center rounded-xl border border-dashed border-[#242633] bg-[#14151C]/40 text-xs text-gray-400">
                {searchQuery
                  ? `هیچ تسکی با عبارت «${searchQuery}» در این پروژه یافت نشد.`
                  : 'هنوز تسکی به این پروژه اضافه نشده است. با کادر بالا اولین تسک را ثبت کنید.'}
              </div>
            )}
          </section>

          {/* Linked Notes Section (Kept accessible outside Kanban columns) */}
          <section className="bg-[#15161D] border border-[#232532] rounded-2xl p-4 shadow-xs space-y-2">
            <button
              type="button"
              onClick={() => setIsNotesOpen(!isNotesOpen)}
              className="w-full flex items-center justify-between text-xs font-semibold text-gray-300 hover:text-white transition-colors cursor-pointer select-none"
              aria-expanded={isNotesOpen}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>
                  یادداشت‌های این پروژه ({toPersianDigits(searchFilteredNotes.length)}
                  {searchQuery && ` از ${toPersianDigits(allProjectNotes.length)}`})
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-400">
                <span className="text-[11px]">{isNotesOpen ? 'بستن' : 'مشاهده'}</span>
                {isNotesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {isNotesOpen && (
              <div className="pt-2 border-t border-[#232532] space-y-2 animate-in fade-in duration-150">
                {searchFilteredNotes.length > 0 ? (
                  searchFilteredNotes.map((note) => (
                    <div
                      key={note.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectItem(note)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectItem(note);
                        }
                      }}
                      className="p-3 bg-[#181920] border border-[#262834] hover:border-[#353748] hover:bg-[#1E1F29] rounded-xl text-right cursor-pointer transition-all select-none"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-blue-400/80 shrink-0" />
                          <h5 dir="auto" className="text-xs sm:text-sm font-medium text-gray-100">{note.title}</h5>
                        </div>
                        {note.inToday && (
                          <span className="text-[10px] text-violet-300 bg-violet-950/40 border border-violet-800/40 px-1.5 py-0.2 rounded font-medium">
                            در امروز
                          </span>
                        )}
                      </div>
                      {note.description && (
                        <p dir="auto" className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                          {note.description}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 py-3 text-center">
                    {searchQuery ? 'یادداشتی مطابق جستجو یافت نشد.' : 'یادداشتی برای این پروژه ثبت نشده است.'}
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {viewMode === 'calendar' && (
        <CalendarView
          items={searchFilteredItems}
          projects={projects}
          isSimpleMode={isSimpleMode}
          onSelectItem={onSelectItem}
          onToggleComplete={onToggleComplete}
          onAddItem={onAddItem}
          defaultProjectId={project.id}
          disableProjectPicker={true}
        />
      )}

      {/* Confirmation Modal if Kanban moves task with open steps to Done */}
      {confirmCompleteTask && (
        <CompleteTaskConfirmModal
          isOpen={Boolean(confirmCompleteTask)}
          taskTitle={confirmCompleteTask.title}
          uncompletedCount={
            confirmCompleteTask.steps?.filter((s) => s.text.trim().length > 0 && !s.completed).length || 0
          }
          totalCount={confirmCompleteTask.steps?.filter((s) => s.text.trim().length > 0).length || 0}
          onCompleteAll={() => {
            const allDoneSteps = (confirmCompleteTask.steps || []).map((s) => ({ ...s, completed: true }));
            onUpdateItem({
              ...confirmCompleteTask,
              status: 'done',
              completed: true,
              completedAt: new Date().toISOString(),
              steps: allDoneSteps,
            });
            setConfirmCompleteTask(null);
          }}
          onCompleteTaskOnly={() => {
            onUpdateItem({
              ...confirmCompleteTask,
              status: 'done',
              completed: true,
              completedAt: new Date().toISOString(),
            });
            setConfirmCompleteTask(null);
          }}
          onCancel={() => setConfirmCompleteTask(null)}
        />
      )}
    </div>
  );
};
