import React from 'react';
import { FilterType, ActiveView } from '../types';
import {
  Sun,
  FileText,
  Folder,
  Calendar,
  CloudOff,
  HardDrive,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toPersianDigits } from '../utils/date';

interface SidebarProps {
  activeView: ActiveView;
  filter: FilterType;
  onNavigate: (view: ActiveView, filter?: FilterType) => void;
  isSimpleMode: boolean;
  onToggleSimpleMode: () => void;
  onOpenBackupModal: () => void;
  activeCount: number;
  notesCount: number;
  projectsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  filter,
  onNavigate,
  isSimpleMode,
  onToggleSimpleMode,
  onOpenBackupModal,
  activeCount,
  notesCount,
  projectsCount,
}) => {
  const isTodayActive = activeView === 'today' && (filter === 'all' || filter === 'tasks');
  const isNotesActive = activeView === 'today' && filter === 'notes';
  const isProjectsActive = activeView === 'projects' || activeView === 'project-detail';

  return (
    <aside className="w-64 border-l border-[#242633] bg-[#15161D] flex flex-col justify-between shrink-0 h-screen sticky top-0 hidden md:flex select-none">
      {/* Top Branding & Main Navigation */}
      <div className="p-5 space-y-6 overflow-y-auto">
        {/* Brand Wordmark */}
        <div className="flex items-center justify-between pb-3 border-b border-[#222431]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-400 font-bold text-sm">
              ک
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">کار روز</h2>
              <p className="text-[11px] text-gray-400">مدیریت آرام کارها</p>
            </div>
          </div>
          <span className="text-[10px] text-violet-400/90 bg-violet-950/40 border border-violet-800/40 px-2 py-0.5 rounded-full font-mono">
            نسخه ۲
          </span>
        </div>

        {/* Primary Navigation */}
        <div className="space-y-1">
          <div className="text-[11px] font-semibold text-gray-400 px-2 mb-2">فضای کاری</div>

          {/* Today */}
          <button
            type="button"
            onClick={() => onNavigate('today', 'all')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              isTodayActive
                ? 'bg-[#252238] text-violet-200 border border-violet-500/30'
                : 'text-gray-300 hover:bg-[#1E202B] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sun className="w-4 h-4 text-violet-400" />
              <span>امروز</span>
            </div>
            <span className="text-[11px] font-mono text-gray-400 bg-[#16171E] px-1.5 py-0.5 rounded-md">
              {toPersianDigits(activeCount)}
            </span>
          </button>

          {/* Calendar (Now enabled!) */}
          <button
            type="button"
            onClick={() => onNavigate('calendar')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              activeView === 'calendar'
                ? 'bg-[#252238] text-violet-200 border border-violet-500/30'
                : 'text-gray-300 hover:bg-[#1E202B] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-violet-400" />
              <span>تقویم و برنامه‌ریزی</span>
            </div>
          </button>

          {/* Projects (Enabled!) */}
          <button
            type="button"
            onClick={() => onNavigate('projects')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              isProjectsActive
                ? 'bg-[#252238] text-violet-200 border border-violet-500/30'
                : 'text-gray-300 hover:bg-[#1E202B] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Folder className="w-4 h-4 text-violet-400" />
              <span>پروژه‌ها و کانبان</span>
            </div>
            <span className="text-[11px] font-mono text-gray-400 bg-[#16171E] px-1.5 py-0.5 rounded-md">
              {toPersianDigits(projectsCount)}
            </span>
          </button>

          {/* Notes */}
          <button
            type="button"
            onClick={() => onNavigate('today', 'notes')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              isNotesActive
                ? 'bg-[#252238] text-violet-200 border border-violet-500/30'
                : 'text-gray-300 hover:bg-[#1E202B] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-violet-400" />
              <span>یادداشت‌ها</span>
            </div>
            <span className="text-[11px] font-mono text-gray-400 bg-[#16171E] px-1.5 py-0.5 rounded-md">
              {toPersianDigits(notesCount)}
            </span>
          </button>
        </div>

        {/* Future Scope Navigation - Hidden in Simple Mode to eliminate nonessential distraction */}
        {!isSimpleMode && (
          <div className="space-y-1 pt-2 border-t border-[#222431]">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[11px] font-semibold text-gray-400">بخش‌های آینده</span>
              <span className="text-[10px] text-gray-500">غیرفعال در این نسخه</span>
            </div>

            <div
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-gray-400 bg-transparent border border-transparent cursor-not-allowed select-none opacity-50"
              title="همگام‌سازی ابری در فاز بعدی خواهد آمد"
            >
              <div className="flex items-center gap-2.5">
                <CloudOff className="w-4 h-4 text-gray-400" />
                <span>همگام‌سازی ابری</span>
              </div>
              <span className="text-[10px] text-gray-400 border border-gray-700/60 px-1.5 py-0.2 rounded">
                آینده
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Area: Compact Simple Mode Toggle & Secondary Storage Notice */}
      <div className="p-4 space-y-2.5 border-t border-[#222431] bg-[#121318]/50">
        {/* Compact Simple Mode Toggle */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#181922] border border-[#262835]">
          <div className="flex items-center gap-2">
            {isSimpleMode ? (
              <EyeOff className="w-3.5 h-3.5 text-violet-400" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-gray-400" />
            )}
            <span className="text-xs font-medium text-gray-200">حالت ساده</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isSimpleMode}
            onClick={onToggleSimpleMode}
            className={`px-2.5 py-0.5 text-[11px] font-medium rounded-md border transition-colors cursor-pointer ${
              isSimpleMode
                ? 'bg-violet-950/40 text-violet-200 border-violet-600/40'
                : 'bg-[#121318] text-gray-400 border-[#242634] hover:text-gray-200'
            }`}
          >
            {isSimpleMode ? 'روشن' : 'خاموش'}
          </button>
        </div>

        {/* Visually Secondary Local Storage Status & Compact Backup Trigger */}
        <div className="pt-0.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 px-1">
            <HardDrive className="w-3 h-3 text-gray-500 shrink-0" />
            <span>ذخیره محلی روی همین دستگاه</span>
          </div>

          <button
            type="button"
            onClick={onOpenBackupModal}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] text-gray-400 hover:text-gray-200 hover:bg-[#181922] border border-transparent hover:border-[#262835] transition-colors cursor-pointer select-none"
            title="پشتیبان‌گیری و بازیابی داده‌ها به صورت فایل JSON"
          >
            <span>خروجی و بازیابی اطلاعات</span>
            <span className="text-[10px] text-violet-400 font-mono">JSON</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
