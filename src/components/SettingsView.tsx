import React, { useState } from 'react';
import { Item, Project } from '../types';
import { useSettings, ACCENT_PRESETS } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { toPersianDigits } from '../utils/date';
import {
  Palette,
  Calendar as CalendarIcon,
  Database,
  Send,
  Moon,
  Sun,
  Monitor,
  Check,
  Eye,
  EyeOff,
  Download,
  Upload,
  HardDrive,
  Cloud,
  ShieldCheck,
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  LogOut,
  Info,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

interface SettingsViewProps {
  items: Item[];
  projects: Project[];
  isSimpleMode: boolean;
  onToggleSimpleMode: () => void;
  onOpenBackupModal: () => void;
  onOpenAuthModal: () => void;
  onOpenMigrationModal?: () => void;
}

type SettingsSection = 'appearance' | 'calendar' | 'account' | 'telegram';

export const SettingsView: React.FC<SettingsViewProps> = ({
  items,
  projects,
  isSimpleMode,
  onToggleSimpleMode,
  onOpenBackupModal,
  onOpenAuthModal,
  onOpenMigrationModal,
}) => {
  const {
    settings,
    setThemeMode,
    setAccentColor,
    setCardDensity,
    setCalendarSystem,
    activeAccent,
  } = useSettings();

  const {
    user,
    loading: authLoading,
    authError,
    signInWithGoogle,
    signOut,
    connectionResult,
    isTestingConnection,
    verifyConnection,
    metadata,
    syncStatus,
    hasPendingWrites,
  } = useAuth();

  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');
  const [copiedCode, setCopiedCode] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // One-click quick JSON export
  const handleQuickExport = () => {
    try {
      const exportData = {
        appName: 'KarRooz',
        version: 4,
        exportedAt: new Date().toISOString(),
        note: 'پشتیبان اطلاعات شخصی کار روز',
        projects,
        items,
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const link = document.createElement('a');
      link.href = url;
      link.download = `karrooz-backup-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportNotice('فایل پشتیبان با موفقیت دانلود شد.');
      setTimeout(() => setExportNotice(null), 4000);
    } catch {
      setExportNotice('خطا در تهیه فایل پشتیبان.');
    }
  };

  const handleCopyPairingCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    });
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Settings Navigation Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-[#14151C] border border-[#232532] rounded-xl overflow-x-auto select-none">
        <button
          type="button"
          onClick={() => setActiveSection('appearance')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            activeSection === 'appearance'
              ? 'bg-[#252238] text-violet-200 border border-violet-500/30 shadow-xs'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1A1C25]'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>ظاهر و پوسته</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('calendar')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            activeSection === 'calendar'
              ? 'bg-[#252238] text-violet-200 border border-violet-500/30 shadow-xs'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1A1C25]'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>تقویم و تاریخ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('account')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            activeSection === 'account'
              ? 'bg-[#252238] text-violet-200 border border-violet-500/30 shadow-xs'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1A1C25]'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>حساب و داده‌ها</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('telegram')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            activeSection === 'telegram'
              ? 'bg-[#252238] text-violet-200 border border-violet-500/30 shadow-xs'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1A1C25]'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>اتصال تلگرام</span>
        </button>
      </div>

      {/* SECTION 1: APPEARANCE (ظاهر و پوسته) */}
      {activeSection === 'appearance' && (
        <div className="space-y-4">
          {/* Theme Mode Selector */}
          <div className="p-4 sm:p-5 bg-[#15161D] border border-[#232532] rounded-2xl space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-100">حالت نمایشی (قالب)</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                انتخاب میان پس‌زمینه زغالی آرامش‌بخش، تم روشن یا هماهنگی خودکار با تنظیمات سیستم.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setThemeMode('dark')}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                  settings.themeMode === 'dark'
                    ? 'bg-[#252238] border-violet-500/50 text-violet-200 shadow-sm'
                    : 'bg-[#181922] border-[#272937] text-gray-400 hover:text-gray-200 hover:bg-[#1F212D]'
                }`}
              >
                <Moon className="w-4 h-4 text-violet-400" />
                <span>تاریک (پیش‌فرض)</span>
              </button>

              <button
                type="button"
                onClick={() => setThemeMode('light')}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                  settings.themeMode === 'light'
                    ? 'bg-[#252238] border-violet-500/50 text-violet-200 shadow-sm'
                    : 'bg-[#181922] border-[#272937] text-gray-400 hover:text-gray-200 hover:bg-[#1F212D]'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-400" />
                <span>روشن</span>
              </button>

              <button
                type="button"
                onClick={() => setThemeMode('system')}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                  settings.themeMode === 'system'
                    ? 'bg-[#252238] border-violet-500/50 text-violet-200 shadow-sm'
                    : 'bg-[#181922] border-[#272937] text-gray-400 hover:text-gray-200 hover:bg-[#1F212D]'
                }`}
              >
                <Monitor className="w-4 h-4 text-blue-400" />
                <span>هماهنگ با دستگاه</span>
              </button>
            </div>
          </div>

          {/* Accent Color Palette */}
          <div className="p-4 sm:p-5 bg-[#15161D] border border-[#232532] rounded-2xl space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-100">رنگ شاخص و برجسته</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                رنگ ملایم برای کلیدها، نشانگرها و حالت‌های فعال با رعایت کنتراست استاندارد.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              {ACCENT_PRESETS.map((accent) => {
                const isSelected = settings.accentColor === accent.id;
                return (
                  <button
                    key={accent.id}
                    type="button"
                    onClick={() => setAccentColor(accent.id)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer text-right ${
                      isSelected
                        ? 'shadow-xs'
                        : 'border-[#272937] text-gray-400 hover:text-gray-200 hover:bg-[#1C1E28]'
                    }`}
                    style={
                      isSelected
                        ? {
                            borderColor: accent.hex,
                            backgroundColor: `${accent.hex}22`,
                          }
                        : undefined
                    }
                  >
                    <span
                      className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center shadow-xs"
                      style={{ backgroundColor: accent.hex }}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                    </span>
                    <span className="truncate">{accent.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card Density & Simple Mode */}
          <div className="p-4 sm:p-5 bg-[#15161D] border border-[#232532] rounded-2xl space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-100">تراکم و تمرکز بصری</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                تنظیم فاصله کارت‌ها و فعال‌سازی محیط کاربری بی‌پیرایه.
              </p>
            </div>

            <div className="space-y-3">
              {/* Card Density */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#181922] border border-[#262835] rounded-xl">
                <div>
                  <span className="text-xs font-semibold text-gray-200">تراکم کارت‌های وظایف</span>
                  <p className="text-[11px] text-gray-400">
                    {settings.cardDensity === 'comfortable'
                      ? 'حالت راحت با فاصله‌گذاری دست‌ودلباز'
                      : 'حالت فشرده با پدینگ کمتر برای نمایش موارد بیشتر'}
                  </p>
                </div>
                <div className="flex items-center gap-1 self-start sm:self-auto bg-[#13141B] p-1 rounded-lg border border-[#282A38]">
                  <button
                    type="button"
                    onClick={() => setCardDensity('comfortable')}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                      settings.cardDensity === 'comfortable'
                        ? 'bg-[#252238] text-violet-200 shadow-xs'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    راحت
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardDensity('compact')}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                      settings.cardDensity === 'compact'
                        ? 'bg-[#252238] text-violet-200 shadow-xs'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    فشرده
                  </button>
                </div>
              </div>

              {/* Simple Mode Toggle */}
              <div className="flex items-center justify-between p-3 bg-[#181922] border border-[#262835] rounded-xl">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-200">حالت ساده (Simple Mode)</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        isSimpleMode
                          ? 'bg-violet-950/50 text-violet-300 border border-violet-800/50'
                          : 'bg-gray-800/40 text-gray-400'
                      }`}
                    >
                      {isSimpleMode ? 'روشن' : 'خاموش'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    پنهان کردن برچسب‌ها، نشانگرها و متادیتاها برای تمرکز حداکثری بر محتوای اصلی.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onToggleSimpleMode}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer shrink-0 ${
                    isSimpleMode
                      ? 'bg-violet-600 hover:bg-violet-700 text-white border-violet-500'
                      : 'bg-[#222431] hover:bg-[#2A2C3C] text-gray-300 border-[#2D3040]'
                  }`}
                >
                  {isSimpleMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{isSimpleMode ? 'غیرفعال‌سازی' : 'فعال‌سازی'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: CALENDAR & DATES (تقویم و تاریخ) */}
      {activeSection === 'calendar' && (
        <div className="space-y-4">
          <div className="p-4 sm:p-5 bg-[#15161D] border border-[#232532] rounded-2xl space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-100">سامانه تقویم و شیوه نمایش</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                تغییر نحوه نمایش روزها و ماه‌ها در تقویم برنامه بدون دستکاری تاریخ وظایف.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCalendarSystem('jalali')}
                className={`p-3.5 rounded-xl border text-right transition-colors cursor-pointer space-y-1 ${
                  settings.calendarSystem === 'jalali'
                    ? 'bg-[#252238] border-violet-500/50 text-white shadow-xs'
                    : 'bg-[#181922] border-[#272937] text-gray-400 hover:text-gray-200 hover:bg-[#1C1E28]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-100">گاه‌شماری خورشیدی / جلالی</span>
                  {settings.calendarSystem === 'jalali' && (
                    <span className="text-[10px] bg-violet-600/30 text-violet-300 px-1.5 py-0.5 rounded">
                      پیش‌فرض
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">
                  شروع هفته از شنبه، نام ماه‌های ایرانی (فروردین تا اسفند).
                </p>
              </button>

              <button
                type="button"
                onClick={() => setCalendarSystem('gregorian')}
                className={`p-3.5 rounded-xl border text-right transition-colors cursor-pointer space-y-1 ${
                  settings.calendarSystem === 'gregorian'
                    ? 'bg-[#252238] border-violet-500/50 text-white shadow-xs'
                    : 'bg-[#181922] border-[#272937] text-gray-400 hover:text-gray-200 hover:bg-[#1C1E28]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-100">گاه‌شماری میلادی (Gregorian)</span>
                  {settings.calendarSystem === 'gregorian' && (
                    <span className="text-[10px] bg-violet-600/30 text-violet-300 px-1.5 py-0.5 rounded">
                      فعال
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">
                  ماه‌های میلادی استاندارد با حفظ اولویت برچسب‌های فارسی.
                </p>
              </button>
            </div>

            {/* Immutability & Timezone Guarantee Notice */}
            <div className="p-3.5 rounded-xl bg-[#14151C] border border-[#262835] flex items-start gap-3">
              <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-gray-300 leading-relaxed">
                <span className="font-semibold text-gray-100 block">
                  قاعده تغییرناپذیری تاریخ‌ها و انطباق زمانی
                </span>
                <p className="text-[11px] text-gray-400">
                  تمام وظایف و مهلت‌ها بدون توجه به تقویم انتخابی، با فرمت استاندارد بین‌المللی{' '}
                  <code className="text-violet-300 font-mono px-1 py-0.2 bg-black/40 rounded">YYYY-MM-DD</code>{' '}
                  و بر مبنای منطقه زمانی ایران (<code className="text-violet-300 font-mono">Asia/Tehran</code>) نگهداری می‌شوند.
                  سوئیچ میان تقویم‌ها تنها لایه نمایش را تغییر داده و داده‌های پایگاه هرگز دگرگون نخواهند شد.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: ACCOUNT & DATA (حساب کاربری، فایربیس و پشتیبان‌گیری) */}
      {activeSection === 'account' && (
        <div className="space-y-4">
          {/* Firebase Connection Card */}
          <div className="p-4 sm:p-5 bg-[#15161D] border border-[#232532] rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-100">حساب کاربری ابری (Firebase)</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  ارتباط با فایربیس برای دسترسی و احراز هویت با حساب گوگل.
                </p>
              </div>
              {user ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-full font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>متصل با گوگل</span>
                </span>
              ) : (
                <span className="text-xs text-gray-400 bg-[#1A1C25] border border-[#282A37] px-2.5 py-1 rounded-full">
                  حالت محلی (آفلاین)
                </span>
              )}
            </div>

            {/* User Profile or Sign-in Box */}
            <div className="p-3.5 rounded-xl bg-[#181922] border border-[#262835] space-y-3">
              {user ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'پروفایل'}
                        className="w-10 h-10 rounded-full border border-emerald-500/40 object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-300 font-bold text-sm">
                        {(user.displayName || user.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-100">{user.displayName || 'کاربر کار روز'}</h4>
                      <p className="text-[11px] text-gray-400 font-mono" dir="ltr">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => verifyConnection()}
                      disabled={isTestingConnection}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-[#14151C] hover:bg-[#20222D] border border-[#2B2D3B] rounded-lg transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin text-emerald-400' : ''}`} />
                      <span>{isTestingConnection ? 'در حال آزمون...' : 'آزمون اتصال'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => signOut()}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-300 hover:text-red-200 bg-red-950/20 hover:bg-red-950/40 border border-red-800/40 rounded-lg transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>خروج</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-gray-200">حساب کاربری وارد نشده است</span>
                    <p className="text-[11px] text-gray-400">
                      داده‌های شما فعلاً به صورت امن در حافظه این مرورگر ذخیره هستند.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => signInWithGoogle()}
                    disabled={authLoading}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors cursor-pointer shadow-xs whitespace-nowrap shrink-0"
                  >
                    <span>{authLoading ? 'در حال اتصال...' : 'ورود با حساب گوگل'}</span>
                  </button>
                </div>
              )}

              {/* Connection Result feedback */}
              {connectionResult && (
                <div
                  className={`p-2.5 rounded-lg text-[11px] flex items-center justify-between gap-2 ${
                    connectionResult.success
                      ? 'bg-emerald-950/30 text-emerald-300 border border-emerald-800/40'
                      : 'bg-red-950/30 text-red-300 border border-red-800/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {connectionResult.success ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{connectionResult.message}</span>
                  </div>
                  {connectionResult.timestamp && (
                    <span className="font-mono text-[10px] text-gray-400">
                      {connectionResult.timestamp}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Local to Cloud Migration Action */}
            {user && onOpenMigrationModal && (
              <div className="p-3.5 rounded-xl bg-violet-950/20 border border-violet-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-200">
                    <Cloud className="w-3.5 h-3.5 text-violet-400" />
                    <span>انتقال و همگام‌سازی اطلاعات محلی به ابر</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    انتقال امن وظایف و پروژه‌های ذخیره‌شده در این مرورگر به پایگاه اختصاصی این حساب گوگل.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenMigrationModal}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <span>مدیریت انتقال داده‌ها</span>
                </button>
              </div>
            )}

            {/* Backend Architecture Details */}
            <div className="p-3 rounded-xl bg-[#14151C] border border-[#242633] space-y-1.5 text-[11px] text-gray-400 font-mono">
              <div className="flex items-center justify-between">
                <span>شناسه پروژه:</span>
                <span className="text-gray-200">{metadata.projectId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>پایگاه فایراستور:</span>
                <span className="text-gray-200 truncate max-w-[200px]" title={metadata.firestoreDatabaseId}>
                  {metadata.firestoreDatabaseId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>قوانین امنیتی:</span>
                <span className="text-emerald-400">Default-Deny (محدود به شناسه هر کاربر)</span>
              </div>
            </div>
          </div>

          {/* Backup & Data Persistence Card */}
          <div className="p-4 sm:p-5 bg-[#15161D] border border-[#232532] rounded-2xl space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-100">مدیریت پشتیبان و داده‌های محلی</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                تعداد {toPersianDigits(items.length)} مورد و {toPersianDigits(projects.length)} پروژه ذخیره‌شده روی این دستگاه.
              </p>
            </div>

            {exportNotice && (
              <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{exportNotice}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Export JSON Button */}
              <button
                type="button"
                onClick={handleQuickExport}
                className="flex items-center justify-between p-3.5 bg-[#181922] hover:bg-[#1E202C] border border-[#262835] hover:border-violet-500/40 rounded-xl text-right transition-colors cursor-pointer group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-200 group-hover:text-violet-300">
                    <Download className="w-4 h-4 text-violet-400" />
                    <span>دریافت نسخه پشتیبان (JSON)</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    دانلود مستقیم فایل کامل اطلاعات روی حافظه دستگاه.
                  </p>
                </div>
              </button>

              {/* Import / Advanced Backup Modal Trigger */}
              <button
                type="button"
                onClick={onOpenBackupModal}
                className="flex items-center justify-between p-3.5 bg-[#181922] hover:bg-[#1E202C] border border-[#262835] hover:border-violet-500/40 rounded-xl text-right transition-colors cursor-pointer group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-200 group-hover:text-violet-300">
                    <Upload className="w-4 h-4 text-violet-400" />
                    <span>بازیابی اطلاعات و ابزارهای پیشرفته</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    بررسی نگارش، اعتبارسنجی ساختار و مدیریت مهاجرت داده‌ها.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: TELEGRAM INTEGRATION (اتصال ربات تلگرام) */}
      {activeSection === 'telegram' && (
        <div className="space-y-4">
          <div className="p-4 sm:p-5 bg-[#15161D] border border-[#232532] rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-100">ربات تلگرام کار روز</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  ثبت سریع کارها، مرور کارهای امروز و تعیین زمان‌بندی از طریق چت تلگرام.
                </p>
              </div>

              {/* Status Indicator: Real & Honest */}
              <span className="inline-flex items-center gap-1.5 text-xs text-amber-300 bg-amber-950/40 border border-amber-800/40 px-2.5 py-1 rounded-full font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>هنوز پیکربندی نشده</span>
              </span>
            </div>

            {/* Architecture Explanatory Banner */}
            <div className="p-3.5 rounded-xl bg-[#14151C] border border-[#262835] space-y-2 text-xs text-gray-300 leading-relaxed">
              <div className="flex items-center gap-2 text-violet-300 font-semibold">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>معماری امن بدون شبیه‌سازی محلی</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                برای حفظ امنیت و جلوگیری از جعل هویت تلگرام، تولید کد اتصال منحصراً از طریق توکن‌های
                یک‌بار مصرف سرورلس در Cloudflare Worker و متصل به شناسه کاربر احراز هویت شده انجام خواهد شد.
                کد کلاینتی شبیه‌سازی‌شده ایجاد نمی‌شود.
              </p>
            </div>

            {/* Server-Side Pairing State Box */}
            <div className="p-4 rounded-xl bg-[#181922] border border-[#262835] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-gray-200">وضعیت اتصال به ربات</span>
                  <p className="text-[11px] text-gray-400">
                    {user
                      ? 'نیازمند استقرار Cloudflare Worker و ثبت Webhook تلگرام'
                      : 'برای اتصال تلگرام، ابتدا باید وارد حساب کاربری گوگل خود شوید.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={true}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-gray-400 bg-[#14151B] border border-[#292B3A] rounded-lg cursor-not-allowed opacity-60 whitespace-nowrap"
                    title="تولید کد مستلزم استقرار ورکر در کلودفلر است"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>تولید کد اتصال (نیازمند ورکر)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Setup Guidance Alert */}
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/30 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5 text-xs text-gray-300 leading-relaxed">
                <span className="font-semibold text-amber-200 block">
                  مراحل پیش‌نیاز راه‌اندازی ربات
                </span>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  فایل‌های آماده استقرار در پوشه <code className="text-violet-300 font-mono">worker/</code> قرار دارند.
                  پس از کپی محتوای <code className="text-violet-300 font-mono">worker/dist/index.js</code> در داشبورد Cloudflare
                  و تنظیم متغیرهای محرمانه <code className="text-violet-300 font-mono">TELEGRAM_BOT_TOKEN</code> و{' '}
                  <code className="text-violet-300 font-mono">TELEGRAM_WEBHOOK_SECRET</code>،
                  اتصال به صورت امن و دوطرفه فعال خواهد شد.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
