import React, { useState } from 'react';
import { Item, KanbanStatus, KANBAN_COLUMNS } from '../types';
import { StatusMenu } from './StatusMenu';
import { Check } from 'lucide-react';
import { toPersianDigits } from '../utils/date';

interface KanbanBoardProps {
  tasks: Item[];
  isSimpleMode: boolean;
  onStatusChange: (taskId: string, newStatus: KanbanStatus) => void;
  onToggleComplete: (taskId: string, e: React.MouseEvent) => void;
  onSelectTask: (task: Item) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  isSimpleMode,
  onStatusChange,
  onToggleComplete,
  onSelectTask,
}) => {
  // Mobile tab state for narrow viewports
  const [activeMobileColumn, setActiveMobileColumn] = useState<KanbanStatus>('todo');

  const getTasksByStatus = (status: KanbanStatus) => {
    return tasks.filter((t) => {
      if (status === 'done') {
        return t.status === 'done' || t.completed;
      }
      if (status === 'in_progress') {
        return t.status === 'in_progress' && !t.completed;
      }
      return (!t.status || t.status === 'todo') && !t.completed;
    });
  };

  const todoTasks = getTasksByStatus('todo');
  const inProgressTasks = getTasksByStatus('in_progress');
  const doneTasks = getTasksByStatus('done');

  const columnData: Record<KanbanStatus, Item[]> = {
    todo: todoTasks,
    in_progress: inProgressTasks,
    done: doneTasks,
  };

  const renderTaskCard = (task: Item, currentStatus: KanbanStatus) => {
    const isCompleted = task.completed || currentStatus === 'done';

    return (
      <div
        key={task.id}
        role="button"
        tabIndex={0}
        onClick={() => onSelectTask(task)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectTask(task);
          }
        }}
        className={`group p-3 rounded-xl border transition-all text-right cursor-pointer select-none focus:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500/50 ${
          isCompleted
            ? 'bg-[#15161C]/80 border-[#23242E] opacity-80 hover:opacity-100 hover:border-[#2D2F3C]'
            : 'bg-[#181920] border-[#262834] hover:bg-[#1E1F29] hover:border-[#353748]'
        }`}
      >
        {/* Top row: Checkbox + Title */}
        <div className="flex items-start gap-2.5">
          <button
            type="button"
            aria-label={isCompleted ? 'علامت‌گذاری به عنوان انجام‌نشده' : 'تکمیل تسک'}
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete(task.id, e);
            }}
            className={`w-4.5 h-4.5 rounded-md flex items-center justify-center border transition-all cursor-pointer mt-0.5 shrink-0 ${
              isCompleted
                ? 'bg-violet-600 border-violet-500 text-white'
                : 'border-gray-500 hover:border-violet-400 bg-transparent'
            }`}
          >
            {isCompleted && <Check className="w-3 h-3 stroke-[2.5]" />}
          </button>

          <div className="flex-1 min-w-0">
            <h5
              dir="auto"
              className={`text-xs sm:text-sm font-medium leading-relaxed ${
                isCompleted ? 'text-gray-400 line-through decoration-gray-600' : 'text-gray-100'
              }`}
            >
              {task.title}
            </h5>

            {task.description && !isSimpleMode && (
              <p dir="auto" className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                {task.description}
              </p>
            )}

            {/* Tags and Today badge */}
            {!isSimpleMode && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2 text-[10px] text-gray-500">
                {task.inToday && (
                  <span className="text-violet-300 bg-violet-950/40 border border-violet-800/40 px-1.5 py-0.2 rounded font-medium">
                    در امروز
                  </span>
                )}
                {task.tags &&
                  task.tags.map((tag, idx) => (
                    <span key={idx} className="text-gray-400">
                      #{tag}
                    </span>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Compact Single Status Menu */}
        <div
          className="mt-2.5 pt-2 border-t border-[#23242E] flex items-center justify-between text-[11px]"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[10px] text-gray-500">وضعیت:</span>

          <StatusMenu
            currentStatus={currentStatus}
            onStatusChange={(newStatus) => onStatusChange(task.id, newStatus)}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Mobile Column Switcher Tabs */}
      <div className="md:hidden flex items-center p-1 bg-[#14151C] rounded-xl border border-[#232532] gap-1">
        {KANBAN_COLUMNS.map((col) => {
          const count = columnData[col.id].length;
          const isActive = activeMobileColumn === col.id;
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => setActiveMobileColumn(col.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#27243B] text-violet-200 border border-violet-500/30 shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span>{col.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#181920] text-gray-400 font-mono">
                {toPersianDigits(count)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile View: Single Column with Clear Navigation */}
      <div className="md:hidden space-y-2.5">
        <div className="flex items-center justify-between text-xs text-gray-400 px-1">
          <span className="font-medium text-gray-300">
            {KANBAN_COLUMNS.find((c) => c.id === activeMobileColumn)?.label}
          </span>
          <span className="text-[11px] font-mono text-gray-500">
            {toPersianDigits(columnData[activeMobileColumn].length)} تسک
          </span>
        </div>
        {columnData[activeMobileColumn].length > 0 ? (
          <div className="space-y-2">
            {columnData[activeMobileColumn].map((task) =>
              renderTaskCard(task, activeMobileColumn)
            )}
          </div>
        ) : (
          <div className="py-8 text-center rounded-xl border border-dashed border-[#242633] bg-[#14151C]/40 text-xs text-gray-500">
            تسوکی در این ستون وجود ندارد.
          </div>
        )}
      </div>

      {/* Desktop View: Preserved 3 Columns Grid */}
      <div className="hidden md:grid md:grid-cols-3 gap-3.5 items-start">
        {KANBAN_COLUMNS.map((col) => {
          const colTasks = columnData[col.id];
          return (
            <div
              key={col.id}
              className="bg-[#14151C]/70 border border-[#232532] rounded-xl p-3 flex flex-col min-h-[300px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#20222D]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                  <span className="text-xs font-semibold text-gray-200">{col.label}</span>
                </div>
                <span className="text-[11px] font-mono text-gray-400 bg-[#181920] px-1.5 py-0.2 rounded-md">
                  {toPersianDigits(colTasks.length)}
                </span>
              </div>

              {/* Tasks List */}
              <div className="space-y-2 flex-1">
                {colTasks.length > 0 ? (
                  colTasks.map((task) => renderTaskCard(task, col.id))
                ) : (
                  <div className="h-24 flex items-center justify-center text-center rounded-lg border border-dashed border-[#20222D] text-xs text-gray-500">
                    بدون تسک
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
