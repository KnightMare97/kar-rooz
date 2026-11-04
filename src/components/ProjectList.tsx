import React, { useState } from 'react';
import { Project, Item } from '../types';
import {
  Folder,
  Plus,
  Archive,
  RotateCcw,
  Edit2,
  ChevronRight,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toPersianDigits } from '../utils/date';

interface ProjectListProps {
  projects: Project[];
  items: Item[];
  onSelectProject: (project: Project) => void;
  onCreateProjectClick: () => void;
  onEditProject: (project: Project, e: React.MouseEvent) => void;
  onToggleArchiveProject: (projectId: string, e: React.MouseEvent) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  items,
  onSelectProject,
  onCreateProjectClick,
  onEditProject,
  onToggleArchiveProject,
}) => {
  const [showArchived, setShowArchived] = useState(false);

  const activeProjects = projects.filter((p) => !p.archived);
  const archivedProjects = projects.filter((p) => p.archived);

  const getProjectStats = (project: Project) => {
    const projectItems = items.filter(
      (i) => i.projectId === project.id || (!i.projectId && i.project === project.name)
    );
    const tasks = projectItems.filter((i) => i.type === 'task');
    const doneTasks = tasks.filter((t) => t.completed || t.status === 'done').length;
    const inProgressTasks = tasks.filter((t) => !t.completed && t.status === 'in_progress').length;
    const todoTasks = tasks.filter((t) => !t.completed && (!t.status || t.status === 'todo')).length;
    const notesCount = projectItems.filter((i) => i.type === 'note').length;

    return {
      totalTasks: tasks.length,
      doneTasks,
      inProgressTasks,
      todoTasks,
      notesCount,
    };
  };

  const renderProjectCard = (project: Project) => {
    const stats = getProjectStats(project);

    return (
      <div
        key={project.id}
        role="button"
        tabIndex={0}
        onClick={() => onSelectProject(project)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectProject(project);
          }
        }}
        className={`group relative p-4 rounded-xl border text-right cursor-pointer select-none transition-all focus:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500/50 ${
          project.archived
            ? 'bg-[#15161C]/70 border-[#23242E] opacity-75 hover:opacity-100 hover:border-[#2E303D]'
            : 'bg-[#181920] border-[#252734] hover:bg-[#1E1F29] hover:border-[#353748]'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Project Title and Color Dot */}
          <div className="flex items-start gap-2.5 min-w-0">
            <span
              className="w-3 h-3 rounded-full shrink-0 mt-1"
              style={{ backgroundColor: project.color }}
            />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-100 group-hover:text-white transition-colors truncate">
                {project.name}
              </h3>
              {project.description && (
                <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                  {project.description}
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions (Edit, Archive) */}
          <div
            className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={(e) => onEditProject(project, e)}
              className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-[#252733] rounded-lg transition-colors cursor-pointer"
              title="ویرایش پروژه"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => onToggleArchiveProject(project.id, e)}
              className="p-1.5 text-gray-400 hover:text-amber-300 hover:bg-[#252733] rounded-lg transition-colors cursor-pointer"
              title={project.archived ? 'خروج از آرشیو' : 'انتقال به آرشیو'}
            >
              {project.archived ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Task Metrics & Status Breakdown */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#232532] text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <span>
              {toPersianDigits(stats.totalTasks)} تسک
            </span>
            {stats.inProgressTasks > 0 && (
              <span className="text-amber-400 font-normal">
                {toPersianDigits(stats.inProgressTasks)} در حال انجام
              </span>
            )}
            {stats.notesCount > 0 && (
              <span className="text-gray-400">
                {toPersianDigits(stats.notesCount)} یادداشت
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-[11px] text-violet-400 group-hover:text-violet-300 font-medium">
            <span>مشاهده</span>
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Header with Title & Add Project Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Folder className="w-5 h-5 text-violet-400" />
            <span>پروژه‌ها</span>
            <span className="text-xs font-normal text-gray-400 bg-[#16171E] border border-[#262835] px-2 py-0.5 rounded-full font-mono">
              {toPersianDigits(activeProjects.length)} فعال
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">دسته‌بندی و پیشبرد کارهای چندمرحله‌ای</p>
        </div>

        <button
          type="button"
          onClick={onCreateProjectClick}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors cursor-pointer shadow-sm shadow-violet-900/30"
        >
          <Plus className="w-4 h-4" />
          <span>پروژه جدید</span>
        </button>
      </div>

      {/* Active Projects Grid */}
      {activeProjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {activeProjects.map(renderProjectCard)}
        </div>
      ) : (
        <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-[#262835] bg-[#14151B]/40">
          <div className="w-10 h-10 rounded-xl bg-[#1E202B] border border-[#2D2F3F] flex items-center justify-center text-violet-400 mx-auto mb-3">
            <Folder className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-gray-200">هنوز پروژه‌ای ثبت نشده است</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed">
            پروژه‌ها به شما کمک می‌کنند اهداف و کارهای چندمرحله‌ای را بدون تنظیمات پیچیده پیش ببرید.
          </p>
          <button
            type="button"
            onClick={onCreateProjectClick}
            className="mt-4 px-3.5 py-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors cursor-pointer"
          >
            ایجاد اولین پروژه
          </button>
        </div>
      )}

      {/* Archived Projects Collapsible Section */}
      {archivedProjects.length > 0 && (
        <div className="pt-4 border-t border-[#232532]">
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className="w-full flex items-center justify-between py-2 text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
            aria-expanded={showArchived}
          >
            <div className="flex items-center gap-2">
              <Archive className="w-3.5 h-3.5 text-gray-500" />
              <span>پروژه‌های آرشیو شده ({toPersianDigits(archivedProjects.length)})</span>
            </div>
            {showArchived ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showArchived && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3 animate-in fade-in duration-150">
              {archivedProjects.map(renderProjectCard)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
