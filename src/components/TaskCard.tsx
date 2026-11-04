import React from 'react';
import { Item, Project } from '../types';
import { Check, FileText, Calendar, Clock, AlertTriangle } from 'lucide-react';
import {
  formatTimeAgo,
  formatJalaliDate,
  isPastDate,
  isTodayDate,
  getRelativeDateLabel,
} from '../utils/date';

interface TaskCardProps {
  item: Item;
  projects?: Project[];
  isSimpleMode: boolean;
  onToggleComplete: (id: string, e: React.MouseEvent) => void;
  onClick: (item: Item) => void;
  onMoveToToday?: (item: Item, e: React.MouseEvent) => void;
  showMoveToTodayAction?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  item,
  projects = [],
  isSimpleMode,
  onToggleComplete,
  onClick,
  onMoveToToday,
  showMoveToTodayAction = false,
}) => {
  const isTask = item.type === 'task';

  // Find linked project or display name
  const linkedProject =
    projects.find((p) => p.id === item.projectId) ||
    projects.find((p) => p.name === item.project);

  const projectName = linkedProject?.name || item.project;
  const projectColor = linkedProject?.color || '#A78BFA';

  const isCompleted = item.completed || item.status === 'done';

  // Date semantics analysis
  const isDueOverdue =
    isTask && !isCompleted && item.dueDate && isPastDate(item.dueDate);
  const isDueToday =
    isTask && !isCompleted && item.dueDate && isTodayDate(item.dueDate);
  const isPlannedPast =
    isTask && !isCompleted && item.plannedDate && isPastDate(item.plannedDate);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${isTask ? 'تسک' : 'یادداشت'}: ${item.title}`}
      onClick={() => onClick(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(item);
        }
      }}
      className={`group relative flex items-start gap-3 p-3.5 rounded-xl border transition-all text-right cursor-pointer select-none focus:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500/50 ${
        isCompleted
          ? 'bg-[#15161C]/70 border-[#23242E] opacity-75 hover:opacity-100 hover:border-[#2D2F3C]'
          : isDueOverdue
            ? 'bg-[#1A1517] border-rose-900/40 hover:bg-[#20181A] hover:border-rose-800/60'
            : 'bg-[#181920] border-[#262834] hover:bg-[#1E1F29] hover:border-[#353748]'
      }`}
    >
      {/* Action / Icon Zone */}
      <div className="pt-0.5 shrink-0">
        {isTask ? (
          <button
            type="button"
            aria-label={
              isCompleted
                ? 'علامت‌گذاری به عنوان انجام نشده'
                : 'علامت‌گذاری به عنوان انجام شده'
            }
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete(item.id, e);
            }}
            className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all cursor-pointer ${
              isCompleted
                ? 'bg-violet-600 border-violet-500 text-white'
                : 'border-gray-500/70 hover:border-violet-400 bg-transparent group-hover:border-gray-400'
            }`}
          >
            {isCompleted && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
          </button>
        ) : (
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center text-violet-400/80 bg-violet-950/20"
            title="یادداشت"
          >
            <FileText className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      {/* Main Content Zone */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <div className="flex items-center justify-between gap-2">
          <h4
            dir="auto"
            className={`text-sm font-medium leading-relaxed tracking-normal transition-colors ${
              isCompleted
                ? 'text-gray-400 line-through decoration-gray-600'
                : 'text-gray-100 group-hover:text-white'
            }`}
          >
            {item.title}
          </h4>

          {/* Timestamp in quiet unboxed text */}
          {!isSimpleMode && (
            <span className="text-[11px] text-gray-500 shrink-0 font-normal">
              {formatTimeAgo(item.createdAt)}
            </span>
          )}
        </div>

        {/* Description snippet if present */}
        {item.description && !isSimpleMode && (
          <p
            dir="auto"
            className={`text-xs mt-1 leading-relaxed line-clamp-2 ${
              isCompleted ? 'text-gray-500' : 'text-gray-400'
            }`}
          >
            {item.description}
          </p>
        )}

        {/* Distinct Planned Date & Due Date Indicators */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px]">
          {/* Planned Date Badge */}
          {item.plannedDate && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium text-[10px] ${
                isPlannedPast && !isCompleted
                  ? 'bg-amber-950/40 text-amber-300 border border-amber-800/40'
                  : 'bg-violet-950/30 text-violet-300 border border-violet-800/30'
              }`}
              title={`روز انجام: ${formatJalaliDate(item.plannedDate, 'full')}`}
            >
              <Calendar className="w-3 h-3 text-violet-400 shrink-0" />
              <span>انجام: {getRelativeDateLabel(item.plannedDate)}</span>
            </span>
          )}

          {/* Due Date (Deadline) Badge - Tasks Only */}
          {isTask && item.dueDate && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium text-[10px] ${
                isDueOverdue
                  ? 'bg-rose-950/50 text-rose-300 border border-rose-800/50'
                  : isDueToday
                    ? 'bg-amber-950/40 text-amber-300 border border-amber-800/40'
                    : 'bg-[#1F202B] text-gray-300 border border-[#2F3142]'
              }`}
              title={`مهلت تحویل: ${formatJalaliDate(item.dueDate, 'full')}`}
            >
              {isDueOverdue ? (
                <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
              ) : (
                <Clock className="w-3 h-3 text-gray-400 shrink-0" />
              )}
              <span>
                {isDueOverdue ? 'مهلت گذشته: ' : 'مهلت: '}
                {getRelativeDateLabel(item.dueDate)}
              </span>
            </span>
          )}

          {/* Quick "انتقال به امروز" action for past planned items */}
          {showMoveToTodayAction && onMoveToToday && !isCompleted && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveToToday(item, e);
              }}
              className="mr-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-violet-900/40 hover:bg-violet-800/60 text-violet-200 border border-violet-700/50 transition-colors cursor-pointer"
              title="تغییر روز انجام به امروز"
            >
              <span>انتقال به امروز</span>
            </button>
          )}
        </div>

        {/* Unboxed Metadata: project, status, legacy label, tags */}
        {!isSimpleMode && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px] text-gray-400">
            {/* Status if in_progress */}
            {item.status === 'in_progress' && !isCompleted && (
              <>
                <span className="text-amber-400 font-medium inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span>در حال انجام</span>
                </span>
                <span aria-hidden="true" className="text-gray-600">
                  ·
                </span>
              </>
            )}

            {/* Project Name & Color Dot */}
            {projectName && (
              <>
                <span className="inline-flex items-center gap-1 font-medium text-gray-300">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: projectColor }}
                  />
                  <span>{projectName}</span>
                </span>
              </>
            )}

            {/* Legacy Label if unmatched */}
            {item.legacyProjectLabel && !linkedProject && (
              <>
                <span className="text-gray-500 text-[10px]">
                  (برچسب قدیمی: {item.legacyProjectLabel})
                </span>
              </>
            )}

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <>
                {projectName && (
                  <span aria-hidden="true" className="text-gray-600">
                    ·
                  </span>
                )}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {item.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-gray-500 hover:text-gray-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
