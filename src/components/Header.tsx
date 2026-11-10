import { Eye, EyeOff, ArrowRight, User as UserIcon, Database, Settings, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import { getTodayPersianDateString, toPersianDigits } from '../utils/date';
import { useAuth } from '../contexts/AuthContext';
import { ActiveView, Project } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  activeView: ActiveView;
  activeProject?: Project | null;
  onNavigateToProjects?: () => void;
  onNavigateToSettings?: () => void;
  todayActiveCount: number;
  activeProjectsCount: number;
  isSimpleMode: boolean;
  onToggleSimpleMode: () => void;
  onOpenAuthModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  activeProject,
  onNavigateToProjects,
  onNavigateToSettings,
  todayActiveCount,
  activeProjectsCount,
  isSimpleMode,
  onToggleSimpleMode,
  onOpenAuthModal,
}) => {
  const persianDate = getTodayPersianDateString();
  const { user, syncStatus, hasPendingWrites } = useAuth();

  return (
    <header className="border-b border-[#222430] bg-[#14151C]/90 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* Contextual Title / Breadcrumb Zone */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {activeView === 'today' && (
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight shrink-0">
                  امروز
                </h1>
                <span className="text-[11px] font-normal text-violet-300 bg-violet-950/40 border border-violet-800/40 px-2 py-0.5 rounded-full shrink-0">
                  {toPersianDigits(todayActiveCount)} مورد باز
                </span>
              </div>

              <span className="text-xs text-gray-500 hidden sm:inline" aria-hidden="true">
                ·
              </span>

              <span className="text-xs text-gray-400 font-normal shrink-0">
                {persianDate}
              </span>
            </div>
          )}

          {activeView === 'all-work' && (
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight shrink-0">
                همه کارها
              </h1>
              <span className="text-xs text-gray-500 hidden sm:inline" aria-hidden="true">
                ·
              </span>
              <span className="text-xs text-gray-400 font-normal shrink-0">
                فهرست، کانبان و تقویم یکپارچه
              </span>
            </div>
          )}

          {activeView === 'notes' && (
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight shrink-0">
                یادداشت‌ها
              </h1>
              <span className="text-xs text-gray-500 hidden sm:inline" aria-hidden="true">
                ·
              </span>
              <span className="text-xs text-gray-400 font-normal shrink-0">
                یادداشت‌ها و ایده‌های سریع
              </span>
            </div>
          )}

          {activeView === 'projects' && (
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight shrink-0">
                پروژه‌ها
              </h1>
              <span className="text-[11px] font-normal text-gray-400 bg-[#1A1C24] border border-[#2B2D3B] px-2 py-0.5 rounded-full shrink-0">
                {toPersianDigits(activeProjectsCount)} پروژه فعال
              </span>
            </div>
          )}

          {activeView === 'settings' && (
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight shrink-0">
                تنظیمات برنامه
              </h1>
              <span className="text-xs text-gray-500 hidden sm:inline" aria-hidden="true">
                ·
              </span>
              <span className="text-xs text-gray-400 font-normal shrink-0">
                شخصی‌سازی ظاهر، تقویم، داده‌ها و تلگرام
              </span>
            </div>
          )}

          {activeView === 'project-detail' && activeProject && (
            <div className="flex items-center gap-2 min-w-0 text-xs">
              <button
                type="button"
                onClick={onNavigateToProjects}
                className="text-gray-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>پروژه‌ها</span>
              </button>
              <span className="text-gray-600">/</span>
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: activeProject.color }}
                />
                <span className="font-semibold text-white text-sm sm:text-base truncate">
                  {activeProject.name}
                </span>
                {activeProject.archived && (
                  <span className="text-[10px] text-amber-300 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.2 rounded shrink-0">
                    آرشیو
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Controls: PWA Install & Firebase Account & Simple Mode & Settings Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton />
          {/* Settings Shortcut Button */}
          {onNavigateToSettings && (
            <button
              type="button"
              onClick={onNavigateToSettings}
              title="تنظیمات برنامه"
              className={`flex items-center justify-center p-1.5 sm:px-2.5 sm:py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer shrink-0 ${
                activeView === 'settings'
                  ? 'bg-violet-950/40 text-violet-200 border-violet-600/40 shadow-xs'
                  : 'bg-[#181920] text-gray-400 border-[#262834] hover:text-gray-200 hover:bg-[#1E202A]'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-violet-400" />
              <span className="hidden sm:inline mr-1.5">تنظیمات</span>
            </button>
          )}
          {/* Firebase / Account Status Button */}
          {onOpenAuthModal && (
            <button
              type="button"
              onClick={onOpenAuthModal}
              title={
                user
                  ? syncStatus === 'syncing' || hasPendingWrites
                    ? 'در حال ذخیره‌سازی تغییرات در سرور ابری...'
                    : syncStatus === 'synced'
                    ? `همگام با سرور ابری: ${user.email || user.displayName}`
                    : syncStatus === 'error'
                    ? 'خطا در ارتباط با سرور ابری'
                    : `حساب کاربری: ${user.email || user.displayName}`
                  : 'اتصال به فایربیس و ورود با گوگل'
              }
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer shrink-0 ${
                user
                  ? syncStatus === 'syncing' || hasPendingWrites
                    ? 'bg-amber-950/30 text-amber-300 border-amber-800/40'
                    : syncStatus === 'error'
                    ? 'bg-red-950/30 text-red-300 border-red-800/40'
                    : 'bg-emerald-950/30 text-emerald-300 border-emerald-800/40 hover:bg-emerald-900/40'
                  : 'bg-[#181920] text-gray-300 border-[#262834] hover:text-white hover:bg-[#1E202A]'
              }`}
            >
              {user ? (
                <>
                  {syncStatus === 'syncing' || hasPendingWrites ? (
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  ) : syncStatus === 'error' ? (
                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  ) : syncStatus === 'loading' ? (
                    <RefreshCw className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span className="truncate max-w-[90px] hidden sm:inline">
                    {syncStatus === 'syncing' || hasPendingWrites
                      ? 'ذخیره در سرور...'
                      : syncStatus === 'error'
                      ? 'خطای همگام‌سازی'
                      : user.displayName || 'همگام ابری'}
                  </span>
                  <span className="text-[10px] font-mono sm:hidden">
                    {syncStatus === 'syncing' || hasPendingWrites ? 'ذخیره' : 'ابری'}
                  </span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5 text-violet-400" />
                  <span>فایربیس</span>
                </>
              )}
            </button>
          )}

          {/* Compact Simple Mode Toggle */}
          <button
            type="button"
            onClick={onToggleSimpleMode}
            title={isSimpleMode ? 'خروج از حالت ساده (نمایش متادیتا)' : 'فعال‌سازی حالت ساده (تمرکز حداکثری)'}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer shrink-0 ${
              isSimpleMode
                ? 'bg-violet-950/40 text-violet-200 border-violet-600/40 shadow-xs'
                : 'bg-[#181920] text-gray-400 border-[#262834] hover:text-gray-200 hover:bg-[#1E202A]'
            }`}
          >
            {isSimpleMode ? <EyeOff className="w-3.5 h-3.5 text-violet-400" /> : <Eye className="w-3.5 h-3.5 text-gray-400" />}
            <span className="hidden sm:inline">حالت ساده: {isSimpleMode ? 'روشن' : 'خاموش'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
