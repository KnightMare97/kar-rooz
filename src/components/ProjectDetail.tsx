import React, { useState, useMemo } from 'react';
import { Project, Item, KanbanStatus, ItemType } from '../types';
import { KanbanBoard } from './KanbanBoard';
import { TaskCard } from './TaskCard';
import { StatusMenu } from './StatusMenu';
import {
  Archive,
  RotateCcw,
  Edit2,
  Columns,
  List as ListIcon,
  Plus,
  FileText,
  CheckCircle2,
  Sun,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Tag as TagIcon,
} from 'lucide-react';
import { toPersianDigits, getTehranTodayDateString } from '../utils/date';

interface ProjectDetailProps {
  project: Project;
  items: Item[]; // all items
  projects: Project[];
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
  isSimpleMode,
  onBack,
  onEditProject,
  onToggleArchiveProject,
  onAddItem,
  onUpdateItem,
  onToggleComplete,
  onSelectItem,
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Search & List status filter
  const [searchQuery, setSearchQuery] = useState('');
  const [listStatusFilter, setListStatusFilter] = useState<'all' | KanbanStatus>('all');

  // Project Quick Capture Form State
  const [captureTitle, setCaptureTitle] = useState('');
  const [captureType, setCaptureType] = useState<ItemType>('task');
  const [captureInToday, setCaptureInToday] = useState(false); // Off by default!
  const [isCaptureExpanded, setIsCaptureExpanded] = useState(false);
  const [captureDescription, setCaptureDescription] = useState('');
  const [captureTags, setCaptureTags] = useState('');

  // Linked notes collapsed state
  const [isNotesOpen, setIsNotesOpen] = useState(true);

  // All tasks belonging to this project
  const allProjectTasks = useMemo(() => {
    return items.filter(
      (item) => item.type === 'task' && (item.projectId === project.id || (!item.projectId && item.project === project.name))
    );
  }, [items, project.id, project.name]);

  // All notes belonging to this project
  const allProjectNotes = useMemo(() => {
    return items.filter(
      (item) => item.type === 'note' && (item.projectId === project.id || (!item.projectId && item.project === project.name))
    );
  }, [items, project.id, project.name]);

  // Filtered tasks based on search query
  const searchFilteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allProjectTasks;

    return allProjectTasks.filter((task) => {
      const titleMatch = task.title.toLowerCase().includes(q);
      const descMatch = task.description?.toLowerCase().includes(q) || false;
      const tagMatch = task.tags?.some((t) => t.toLowerCase().includes(q)) || false;
      return titleMatch || descMatch || tagMatch;
    });
  }, [allProjectTasks, searchQuery]);

  // Tasks specifically for List view (filtered by status filter as well)
  const listTasks = useMemo(() => {
    if (listStatusFilter === 'all') return searchFilteredTasks;
    return searchFilteredTasks.filter((task) => {
      const taskStatus = task.status || (task.completed ? 'done' : 'todo');
      return taskStatus === listStatusFilter;
    });
  }, [searchFilteredTasks, listStatusFilter]);

  // Filtered notes based on search query
  const searchFilteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allProjectNotes;

    return allProjectNotes.filter((note) => {
      const titleMatch = note.title.toLowerCase().includes(q);
      const descMatch = note.description?.toLowerCase().includes(q) || false;
      const tagMatch = note.tags?.some((t) => t.toLowerCase().includes(q)) || false;
      return titleMatch || descMatch || tagMatch;
    });
  }, [allProjectNotes, searchQuery]);

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

    const tags = captureTags
      .split(/[,،]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    onAddItem({
      type: captureType,
      title: captureTitle.trim(),
      description: captureDescription.trim() || undefined,
      completed: false,
      status: captureType === 'task' ? 'todo' : undefined,
      projectId: project.id,
      project: project.name,
      tags,
      plannedDate: captureInToday ? getTehranTodayDateString() : undefined,
      inToday: captureInToday, // Off by default unless explicitly enabled
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
      <div className="bg-[#15161D] border border-[#232532] rounded-xl p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Project description or status summary */}
          <div className="min-w-0">
            {project.description ? (
              <p className="text-xs text-gray-300 leading-relaxed max-w-xl">
                {project.description}
              </p>
            ) : (
              <span className="text-xs text-gray-400">
                پروژه فعال با {toPersianDigits(allProjectTasks.length)} تسک و {toPersianDigits(allProjectNotes.length)} یادداشت
              </span>
            )}
          </div>

          {/* Action Tools & View Switcher */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* View Mode Switcher */}
            <div className="flex items-center p-0.5 bg-[#121318] rounded-lg border border-[#242634]">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-[#27243B] text-violet-200 shadow-xs'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title="نمای کانبان (۳ ستون)"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>کانبان</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-[#27243B] text-violet-200 shadow-xs'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                title="نمای لیستی"
              >
                <ListIcon className="w-3.5 h-3.5" />
                <span>لیست</span>
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
      </div>

      {/* Project Search & Status Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Search input within project */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            dir="auto"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`جستجو در کارهای «${project.name}»...`}
            className="w-full pr-8 pl-7 py-1.5 bg-[#14151C] border border-[#232532] focus:border-violet-500 rounded-lg text-xs text-gray-200 placeholder-gray-500 outline-hidden transition-colors"
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

        {/* Status Filters (for List view) */}
        {viewMode === 'list' && (
          <div className="flex items-center p-0.5 bg-[#14151C] rounded-lg border border-[#232532] shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setListStatusFilter('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                listStatusFilter === 'all'
                  ? 'bg-[#27243B] text-violet-200 shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              همه ({toPersianDigits(searchFilteredTasks.length)})
            </button>
            <button
              type="button"
              onClick={() => setListStatusFilter('todo')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                listStatusFilter === 'todo'
                  ? 'bg-[#27243B] text-violet-200 shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              انجام‌نشده
            </button>
            <button
              type="button"
              onClick={() => setListStatusFilter('in_progress')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                listStatusFilter === 'in_progress'
                  ? 'bg-[#27243B] text-violet-200 shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              در حال انجام
            </button>
            <button
              type="button"
              onClick={() => setListStatusFilter('done')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                listStatusFilter === 'done'
                  ? 'bg-[#27243B] text-violet-200 shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              انجام‌شده
            </button>
          </div>
        )}

        {/* Kanban View Result Counts Banner */}
        {viewMode === 'kanban' && searchQuery && (
          <span className="text-xs text-gray-400 shrink-0 self-center">
            {toPersianDigits(searchFilteredTasks.length)} نتیجه در ۳ ستون
          </span>
        )}
      </div>

      {/* Quick Capture for this Project */}
      <div className="bg-[#16171E] border border-[#242633] rounded-xl p-3 shadow-xs">
        <form onSubmit={handleCaptureSubmit} className="space-y-2.5">
          <div className="flex items-center gap-2">
            {/* Type selector */}
            <div className="flex items-center p-0.5 bg-[#111217] rounded-lg border border-[#232532] shrink-0">
              <button
                type="button"
                onClick={() => setCaptureType('task')}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  captureType === 'task'
                    ? 'bg-[#27243B] text-violet-200'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
                <span className="hidden sm:inline">تسک</span>
              </button>
              <button
                type="button"
                onClick={() => setCaptureType('note')}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  captureType === 'note'
                    ? 'bg-[#27243B] text-violet-200'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-violet-400" />
                <span className="hidden sm:inline">یادداشت</span>
              </button>
            </div>

            {/* Title Input */}
            <input
              type="text"
              dir="auto"
              value={captureTitle}
              onChange={(e) => setCaptureTitle(e.target.value)}
              placeholder={captureType === 'task' ? `افزودن تسک به «${project.name}»...` : `افزودن یادداشت به «${project.name}»...`}
              className="flex-1 bg-transparent border-0 px-2 text-xs sm:text-sm text-gray-100 placeholder-gray-500 focus:outline-hidden"
            />

            {/* Toggle Details */}
            {!isSimpleMode && (
              <button
                type="button"
                onClick={() => setIsCaptureExpanded(!isCaptureExpanded)}
                className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded-md transition-colors cursor-pointer shrink-0"
              >
                {isCaptureExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!captureTitle.trim()}
              className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-35 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت</span>
            </button>
          </div>

          {/* Expanded Secondary Fields */}
          {isCaptureExpanded && !isSimpleMode && (
            <div className="pt-2 border-t border-[#20222D] space-y-2 animate-in fade-in duration-150">
              <textarea
                dir="auto"
                rows={2}
                value={captureDescription}
                onChange={(e) => setCaptureDescription(e.target.value)}
                placeholder="توضیحات تکمیلی (اختیاری)..."
                className="w-full px-3 py-1.5 bg-[#111217] border border-[#242633] rounded-lg text-xs text-gray-200 placeholder-gray-500 outline-hidden focus:border-violet-500 resize-none"
              />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <input
                  type="text"
                  dir="auto"
                  value={captureTags}
                  onChange={(e) => setCaptureTags(e.target.value)}
                  placeholder="برچسب‌ها (با کاما)"
                  className="flex-1 px-2.5 py-1 bg-[#111217] border border-[#242633] rounded-lg text-xs text-gray-200 placeholder-gray-500 outline-hidden focus:border-violet-500"
                />

                {/* Explicit "نمایش در امروز" Switch (OFF by default) */}
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none px-1">
                  <input
                    type="checkbox"
                    checked={captureInToday}
                    onChange={(e) => setCaptureInToday(e.target.checked)}
                    className="w-4 h-4 rounded text-violet-600 border-gray-600 focus:ring-violet-500 cursor-pointer"
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

      {/* Main Project Tasks: Kanban or List */}
      <section aria-label="تسک‌های پروژه">
        {searchFilteredTasks.length > 0 ? (
          viewMode === 'kanban' ? (
            <KanbanBoard
              tasks={searchFilteredTasks}
              isSimpleMode={isSimpleMode}
              onStatusChange={handleStatusChange}
              onToggleComplete={onToggleComplete}
              onSelectTask={onSelectItem}
            />
          ) : (
            <div className="space-y-2">
              {listTasks.map((task) => {
                const currentStatus = task.status || (task.completed ? 'done' : 'todo');
                return (
                  <div key={task.id} className="relative group">
                    <TaskCard
                      item={task}
                      projects={projects}
                      isSimpleMode={isSimpleMode}
                      onToggleComplete={onToggleComplete}
                      onClick={onSelectItem}
                    />
                    {/* Status Menu on List item */}
                    <div className="absolute left-3 top-3.5 z-10 hidden sm:block">
                      <StatusMenu
                        currentStatus={currentStatus}
                        onStatusChange={(newStatus) => handleStatusChange(task.id, newStatus)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="py-10 text-center rounded-xl border border-dashed border-[#242633] bg-[#14151C]/40 text-xs text-gray-400">
            {searchQuery
              ? `هیچ تسکی با عبارت «${searchQuery}» در این پروژه یافت نشد.`
              : 'هنوز تسکی به این پروژه اضافه نشده است. با کادر بالا اولین تسک را ثبت کنید.'}
          </div>
        )}
      </section>

      {/* Linked Notes Section (Always separate from Kanban workflow) */}
      <section className="pt-3 border-t border-[#232532]">
        <button
          type="button"
          onClick={() => setIsNotesOpen(!isNotesOpen)}
          className="w-full flex items-center justify-between py-2 text-xs font-semibold text-gray-300 hover:text-white transition-colors cursor-pointer"
          aria-expanded={isNotesOpen}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-violet-400" />
            <span>
              یادداشت‌های این پروژه ({toPersianDigits(searchFilteredNotes.length)}
              {searchQuery && ` از ${toPersianDigits(allProjectNotes.length)}`})
            </span>
          </div>
          {isNotesOpen ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
        </button>

        {isNotesOpen && (
          <div className="mt-2 space-y-2 animate-in fade-in duration-150">
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
                  className="p-3 bg-[#16171E] border border-[#232532] hover:border-[#2D3040] hover:bg-[#1B1D26] rounded-xl text-right cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-violet-400/80 shrink-0" />
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
  );
};
