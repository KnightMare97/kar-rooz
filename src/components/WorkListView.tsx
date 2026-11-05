import React, { useState, useMemo } from 'react';
import { Item, Project, KanbanStatus } from '../types';
import { StatusMenu } from './StatusMenu';
import {
  Check,
  CheckCircle2,
  FileText,
  Clock,
  Search,
  X,
  Filter,
  Repeat,
} from 'lucide-react';
import { toPersianDigits, formatJalaliDate } from '../utils/date';

interface WorkListViewProps {
  items: Item[]; // Pre-filtered by scope (All Work or Project) and project filter
  projects: Project[];
  isSimpleMode: boolean;
  onToggleComplete: (id: string, e: React.MouseEvent) => void;
  onStatusChange: (taskId: string, newStatus: KanbanStatus) => void;
  onSelectItem: (item: Item) => void;
  showProjectBadge?: boolean;
  searchQuery?: string;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
}

type ListSubFilter = 'all' | 'todo' | 'in_progress' | 'done' | 'notes';

export const WorkListView: React.FC<WorkListViewProps> = ({
  items,
  projects,
  isSimpleMode,
  onToggleComplete,
  onStatusChange,
  onSelectItem,
  showProjectBadge = true,
  searchQuery,
  hasActiveFilters = false,
  onResetFilters,
}) => {
  const [subFilter, setSubFilter] = useState<ListSubFilter>('all');

  const filteredItems = useMemo(() => {
    if (subFilter === 'all') return items;
    if (subFilter === 'notes') {
      return items.filter((item) => item.type === 'note');
    }
    return items.filter((item) => {
      if (item.type !== 'task') return false;
      const status = item.status || (item.completed ? 'done' : 'todo');
      return status === subFilter;
    });
  }, [items, subFilter]);

  // Counts for each tab
  const counts = useMemo(() => {
    let todo = 0;
    let inProgress = 0;
    let done = 0;
    let notes = 0;

    for (const item of items) {
      if (item.type === 'note') {
        notes++;
      } else {
        const s = item.status || (item.completed ? 'done' : 'todo');
        if (s === 'done') done++;
        else if (s === 'in_progress') inProgress++;
        else todo++;
      }
    }

    return {
      all: items.length,
      todo,
      inProgress,
      done,
      notes,
    };
  }, [items]);

  const getProjectInfo = (item: Item) => {
    if (!item.projectId && !item.project) return null;
    const proj = projects.find((p) => p.id === item.projectId);
    return {
      name: proj?.name || item.project || 'پروژه',
      color: proj?.color || '#818CF8',
      archived: proj?.archived || false,
    };
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-150">
      {/* Sub-Filter Tabs: All, Todo, In Progress, Done, Notes */}
      <div className="flex items-center gap-1 p-1 bg-[#14151C] rounded-xl border border-[#232532] overflow-x-auto text-xs select-none">
        <button
          type="button"
          onClick={() => setSubFilter('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${
            subFilter === 'all'
              ? 'bg-[#27243B] text-violet-200 font-medium shadow-xs'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <span>همه</span>
          <span className="text-[10px] font-mono text-gray-400 bg-[#181920] px-1.5 py-0.2 rounded-md">
            {toPersianDigits(counts.all)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubFilter('todo')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${
            subFilter === 'todo'
              ? 'bg-[#27243B] text-violet-200 font-medium shadow-xs'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <span>انجام‌نشده</span>
          {counts.todo > 0 && (
            <span className="text-[10px] font-mono text-gray-400 bg-[#181920] px-1.5 py-0.2 rounded-md">
              {toPersianDigits(counts.todo)}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSubFilter('in_progress')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${
            subFilter === 'in_progress'
              ? 'bg-[#27243B] text-violet-200 font-medium shadow-xs'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <span>در حال انجام</span>
          {counts.inProgress > 0 && (
            <span className="text-[10px] font-mono text-amber-300 bg-amber-950/40 px-1.5 py-0.2 rounded-md">
              {toPersianDigits(counts.inProgress)}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSubFilter('done')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${
            subFilter === 'done'
              ? 'bg-[#27243B] text-violet-200 font-medium shadow-xs'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <span>انجام‌شده</span>
          {counts.done > 0 && (
            <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/40 px-1.5 py-0.2 rounded-md">
              {toPersianDigits(counts.done)}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSubFilter('notes')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${
            subFilter === 'notes'
              ? 'bg-[#27243B] text-violet-200 font-medium shadow-xs'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-blue-400" />
          <span>یادداشت‌ها</span>
          {counts.notes > 0 && (
            <span className="text-[10px] font-mono text-blue-300 bg-blue-950/40 px-1.5 py-0.2 rounded-md">
              {toPersianDigits(counts.notes)}
            </span>
          )}
        </button>
      </div>

      {/* Items List */}
      <div className="space-y-2">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const isNote = item.type === 'note';
            const currentStatus = item.status || (item.completed ? 'done' : 'todo');
            const isCompleted = item.type === 'task' && (item.completed || currentStatus === 'done');
            const projectInfo = showProjectBadge ? getProjectInfo(item) : null;

            if (isNote) {
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectItem(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectItem(item);
                    }
                  }}
                  className="group p-3 sm:p-3.5 rounded-xl bg-[#16171E] border border-[#232532] hover:border-[#2E3142] hover:bg-[#1B1D26] transition-all text-right cursor-pointer select-none"
                >
                  <div className="flex items-start gap-2.5">
                    <FileText className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4
                          dir="auto"
                          className="text-xs sm:text-sm font-medium text-gray-100 group-hover:text-white leading-relaxed truncate"
                        >
                          {item.title}
                        </h4>
                        <span className="text-[10px] text-blue-300 bg-blue-950/40 border border-blue-800/40 px-1.5 py-0.2 rounded font-medium shrink-0">
                          یادداشت
                        </span>
                      </div>

                      {item.description && !isSimpleMode && (
                        <p
                          dir="auto"
                          className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-relaxed"
                        >
                          {item.description}
                        </p>
                      )}

                      {/* Metadata row: Project, Tags, Planned Date */}
                      {!isSimpleMode && (
                        <div className="flex items-center gap-2 flex-wrap mt-2 text-[10px] text-gray-400">
                          {projectInfo && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-[#111218] border border-[#232532] text-gray-300">
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: projectInfo.color }}
                              />
                              <span className="truncate max-w-[120px]">{projectInfo.name}</span>
                              {projectInfo.archived && (
                                <span className="text-[9px] text-amber-300 font-mono">(آرشیو)</span>
                              )}
                            </span>
                          )}

                          {item.plannedDate && (
                            <span className="inline-flex items-center gap-1 text-violet-300 bg-violet-950/30 px-1.5 py-0.2 rounded">
                              <Clock className="w-3 h-3 text-violet-400" />
                              <span>{formatJalaliDate(item.plannedDate, 'short')}</span>
                            </span>
                          )}

                          {item.tags?.map((tag, i) => (
                            <span key={i} className="text-gray-400">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            // Task Card
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectItem(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectItem(item);
                  }
                }}
                className={`group p-3 sm:p-3.5 rounded-xl border transition-all text-right cursor-pointer select-none ${
                  isCompleted
                    ? 'bg-[#15161C]/80 border-[#23242E] opacity-75 hover:opacity-100'
                    : 'bg-[#181920] border-[#262834] hover:bg-[#1E1F29] hover:border-[#353748]'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {/* Task Completion Checkbox */}
                  <button
                    type="button"
                    aria-label={isCompleted ? 'تسک تکمیل شده' : 'تکمیل تسک'}
                    onClick={(e) => onToggleComplete(item.id, e)}
                    className={`w-4.5 h-4.5 rounded-md flex items-center justify-center border transition-all cursor-pointer mt-0.5 shrink-0 ${
                      isCompleted
                        ? 'bg-violet-600 border-violet-500 text-white'
                        : 'border-gray-500 hover:border-violet-400 bg-transparent'
                    }`}
                  >
                    {isCompleted && <Check className="w-3 h-3 stroke-[2.5]" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4
                        dir="auto"
                        className={`text-xs sm:text-sm font-medium leading-relaxed ${
                          isCompleted
                            ? 'text-gray-400 line-through decoration-gray-600'
                            : 'text-gray-100 group-hover:text-white'
                        }`}
                      >
                        {item.title}
                      </h4>

                      {/* Status Menu Button (Compact) */}
                      <div
                        className="shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <StatusMenu
                          currentStatus={currentStatus}
                          onStatusChange={(newStatus) => onStatusChange(item.id, newStatus)}
                        />
                      </div>
                    </div>

                    {item.description && !isSimpleMode && (
                      <p
                        dir="auto"
                        className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-relaxed"
                      >
                        {item.description}
                      </p>
                    )}

                    {/* Metadata Row */}
                    {!isSimpleMode && (
                      <div className="flex items-center gap-2 flex-wrap mt-2 text-[10px] text-gray-400">
                        {projectInfo && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-[#111218] border border-[#232532] text-gray-300">
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: projectInfo.color }}
                            />
                            <span className="truncate max-w-[120px]">{projectInfo.name}</span>
                            {projectInfo.archived && (
                              <span className="text-[9px] text-amber-300 font-mono">(آرشیو)</span>
                            )}
                          </span>
                        )}

                        {(item.isRecurringOccurrence || item.recurrence) && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] text-violet-300 bg-violet-950/40 border border-violet-800/40 px-1.5 py-0.2 rounded font-medium"
                            title="تسک تکرارشونده"
                          >
                            <Repeat className="w-2.5 h-2.5 text-violet-400" />
                            <span>تکرار</span>
                          </span>
                        )}

                        {item.dueDate && (
                          <span className="inline-flex items-center gap-1 text-amber-300 bg-amber-950/30 border border-amber-800/30 px-1.5 py-0.2 rounded">
                            <Clock className="w-2.5 h-2.5 text-amber-400" />
                            <span>مهلت: {formatJalaliDate(item.dueDate, 'short')}</span>
                          </span>
                        )}

                        {item.plannedDate && (
                          <span className="inline-flex items-center gap-1 text-violet-300 bg-violet-950/30 border border-violet-800/30 px-1.5 py-0.2 rounded">
                            <CheckCircle2 className="w-2.5 h-2.5 text-violet-400" />
                            <span>انجام: {formatJalaliDate(item.plannedDate, 'short')}</span>
                          </span>
                        )}

                        {item.inToday && (
                          <span className="text-violet-300 bg-violet-950/40 border border-violet-800/40 px-1.5 py-0.2 rounded font-medium">
                            در امروز
                          </span>
                        )}

                        {item.tags?.map((tag, i) => (
                          <span key={i} className="text-gray-400">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center rounded-xl border border-dashed border-[#242633] bg-[#14151C]/40 text-xs text-gray-400 space-y-2">
            {searchQuery || hasActiveFilters || subFilter !== 'all' ? (
              <>
                <p>هیچ موردی با فیلترهای انتخابی یا عبارت جستجو یافت نشد.</p>
                {onResetFilters && (
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="text-violet-400 hover:text-violet-300 underline underline-offset-2 cursor-pointer font-medium"
                  >
                    پاک کردن فیلترها و نمایش همه
                  </button>
                )}
              </>
            ) : (
              <p>هنوز تسک یا یادداشتی ثبت نشده است. با کادر بالا اولین مورد خود را اضافه کنید.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
