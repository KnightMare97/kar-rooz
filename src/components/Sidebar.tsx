import React from 'react';
import { FilterType, ActiveView } from '../types';
import {
  Sun,
  FileText,
  Folder,
  Layers,
  Cloud,
  HardDrive,
  Database,
  CheckCircle2,
  Settings,
} from 'lucide-react';
import { toPersianDigits } from '../utils/date';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  activeView: ActiveView;
  filter: FilterType;
  onNavigate: (view: ActiveView, filter?: FilterType) => void;
  isSimpleMode: boolean;
  onToggleSimpleMode: () => void;
  onOpenBackupModal: () => void;
  onOpenAuthModal?: () => void;
  activeCount: number;
  allWorkCount?: number;
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
  onOpenAuthModal,
  activeCount,
  allWorkCount = 0,
  notesCount,
  projectsCount,
}) => {
  const { user, syncStatus, hasPendingWrites } = useAuth();
  const isTodayActive = activeView === 'today';
  const isAllWorkActive = activeView === 'all-work';
  const isNotesActive = activeView === 'notes';
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
            نسخه ۳
          </span>
        </div>

        {/* Primary Navigation: 1. امروز 2. همه کارها 3. پروژه‌ها 4. یادداشت‌ها */}
        <div className="space-y-1">
          <div className="text-[11px] font-semibold text-gray-400 px-2 mb-2">فضای کاری</div>

          {/* 1. Today */}
          <button
            type="button"
            onClick={() => onNavigate('today')}
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

          {/* 2. All Work (Unified Views: List, Kanban, Calendar) */}
          <button
            type="button"
            onClick={() => onNavigate('all-work')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              isAllWorkActive
                ? 'bg-[#252238] text-violet-200 border border-violet-500/30'
                : 'text-gray-300 hover:bg-[#1E202B] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-violet-400" />
              <span>همه کارها</span>
            </div>
            {allWorkCount > 0 && (
              <span className="text-[11px] font-mono text-gray-400 bg-[#16171E] px-1.5 py-0.5 rounded-md">
                {toPersianDigits(allWorkCount)}
              </span>
            )}
          </button>

          {/* 3. Projects */}
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
              <span>پروژه‌ها</span>
            </div>
            <span className="text-[11px] font-mono text-gray-400 bg-[#16171E] px-1.5 py-0.5 rounded-md">
              {toPersianDigits(projectsCount)}
            </span>
          </button>

          {/* 4. Notes */}
          <button
            type="button"
            onClick={() => onNavigate('notes')}
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

          {/* 5. Settings */}
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              activeView === 'settings'
                ? 'bg-[#252238] text-violet-200 border border-violet-500/30'
                : 'text-gray-300 hover:bg-[#1E202B] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4 text-violet-400" />
              <span>تنظیمات</span>
            </div>
          </button>
        </div>

        {/* Cloud & Firebase Integration Section */}
        {!isSimpleMode && (
          <div className="space-y-1 pt-2 border-t border-[#222431]">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[11px] font-semibold text-gray-400">بک‌اند و فضای ابری</span>
              <span className="text-[10px] text-emerald-400 font-mono">Firebase</span>
            </div>

            <button
              type="button"
              onClick={onOpenAuthModal}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer border ${
                user
                  ? syncStatus === 'syncing' || hasPendingWrites
                    ? 'bg-amber-950/25 border-amber-800/40 text-amber-200 hover:bg-amber-950/40'
                    : 'bg-emerald-950/25 border-emerald-800/40 text-emerald-200 hover:bg-emerald-950/40'
                  : 'bg-[#181922] border-[#262835] text-gray-300 hover:text-white hover:bg-[#1E202B]'
              }`}
              title="مشاهده وضعیت حساب کاربری، تست ارتباط با فایربیس و قوانین امنیتی"
            >
              <div className="flex items-center gap-2.5">
                <Database className={`w-4 h-4 ${user ? 'text-emerald-400' : 'text-violet-400'}`} />
                <span className="truncate max-w-[110px]">
                  {user ? (user.displayName || 'حساب کاربری') : 'ورود / فایربیس'}
                </span>
              </div>
              <span
                className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                  user
                    ? syncStatus === 'syncing' || hasPendingWrites
                      ? 'text-amber-300 bg-amber-950/50 border border-amber-800/50'
                      : syncStatus === 'error'
                      ? 'text-red-300 bg-red-950/50 border border-red-800/50'
                      : 'text-emerald-300 bg-emerald-950/50 border border-emerald-800/50'
                    : 'text-violet-300 bg-violet-950/50 border border-violet-800/50'
                }`}
              >
                {user
                  ? syncStatus === 'syncing' || hasPendingWrites
                    ? 'ذخیره...'
                    : syncStatus === 'error'
                    ? 'خطا'
                    : 'همگام'
                  : 'ورود'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Area: Secondary Storage Notice & Backup Trigger */}
      <div className="p-4 space-y-2 border-t border-[#222431] bg-[#121318]/50">
        <div className="pt-0.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 px-1">
            {user ? (
              <>
                <Cloud className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="text-gray-400">همگام با پایگاه ابری Firestore</span>
              </>
            ) : (
              <>
                <HardDrive className="w-3 h-3 text-gray-500 shrink-0" />
                <span>ذخیره محلی روی همین دستگاه</span>
              </>
            )}
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
