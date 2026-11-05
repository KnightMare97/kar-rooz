import React from 'react';
import { FilterType, ActiveView } from '../types';
import { Sun, Folder, Plus, FileText, Layers } from 'lucide-react';
import { toPersianDigits } from '../utils/date';

interface MobileNavProps {
  activeView: ActiveView;
  filter: FilterType;
  onNavigate: (view: ActiveView, filter?: FilterType) => void;
  onOpenQuickCapture: () => void;
  isSimpleMode: boolean;
  onToggleSimpleMode: () => void;
  activeCount: number;
  projectsCount: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeView,
  onNavigate,
  onOpenQuickCapture,
  activeCount,
  projectsCount,
}) => {
  const isTodayActive = activeView === 'today';
  const isAllWorkActive = activeView === 'all-work';
  const isProjectsActive = activeView === 'projects' || activeView === 'project-detail';
  const isNotesActive = activeView === 'notes';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#14151C]/95 backdrop-blur-md border-t border-[#232532] px-2 py-1.5 flex items-center justify-around select-none">
      {/* 1. Today Tab */}
      <button
        type="button"
        onClick={() => onNavigate('today')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors cursor-pointer ${
          isTodayActive ? 'text-violet-400 font-semibold' : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        <div className="relative">
          <Sun className="w-5 h-5" />
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-violet-600 text-white text-[9px] flex items-center justify-center font-mono">
              {toPersianDigits(activeCount)}
            </span>
          )}
        </div>
        <span className="text-[10px]">امروز</span>
      </button>

      {/* 2. All Work Tab */}
      <button
        type="button"
        onClick={() => onNavigate('all-work')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors cursor-pointer ${
          isAllWorkActive ? 'text-violet-400 font-semibold' : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        <Layers className="w-5 h-5" />
        <span className="text-[10px]">همه کارها</span>
      </button>

      {/* 3. Quick Add Button */}
      <button
        type="button"
        onClick={onOpenQuickCapture}
        aria-label="ثبت سریع مورد جدید"
        className="flex items-center justify-center w-11 h-11 -mt-4 rounded-full bg-violet-600 text-white shadow-lg shadow-violet-900/40 hover:bg-violet-700 transition-transform active:scale-95 cursor-pointer shrink-0"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
      </button>

      {/* 4. Projects Tab */}
      <button
        type="button"
        onClick={() => onNavigate('projects')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors cursor-pointer ${
          isProjectsActive ? 'text-violet-400 font-semibold' : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        <div className="relative">
          <Folder className="w-5 h-5" />
          {projectsCount > 0 && (
            <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-[#27243B] text-violet-300 border border-violet-500/40 text-[9px] flex items-center justify-center font-mono">
              {toPersianDigits(projectsCount)}
            </span>
          )}
        </div>
        <span className="text-[10px]">پروژه‌ها</span>
      </button>

      {/* 5. Notes Tab */}
      <button
        type="button"
        onClick={() => onNavigate('notes')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors cursor-pointer ${
          isNotesActive ? 'text-violet-400 font-semibold' : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        <FileText className="w-5 h-5" />
        <span className="text-[10px]">یادداشت‌ها</span>
      </button>
    </nav>
  );
};
