import React, { useState, useRef } from 'react';
import { Item, Project } from '../types';
import {
  Download,
  Upload,
  AlertTriangle,
  X,
  HardDrive,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { toPersianDigits, getTehranTodayDateString, parseDateString } from '../utils/date';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  projects: Project[];
  onImportData: (newItems: Item[], newProjects: Project[]) => boolean;
  isItemEditorOpen?: boolean;
}

interface ParsedBackup {
  version: number;
  items: Item[];
  projects: Project[];
  fileName: string;
  legacyItemsCountWithoutDate: number;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  items,
  projects,
  onImportData,
  isItemEditorOpen = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importError, setImportError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<ParsedBackup | null>(null);
  // User choice for legacy items lacking dates: 'schedule_today' | 'leave_undated'
  const [legacyScheduleChoice, setLegacyScheduleChoice] = useState<'schedule_today' | 'leave_undated'>('schedule_today');

  if (!isOpen) return null;

  const handleExport = () => {
    if (isItemEditorOpen) {
      setImportError('لطفاً ابتدا تغییرات باز در پنجره ویرایش را ذخیره یا لغو کنید.');
      return;
    }

    try {
      const exportData = {
        appName: 'KarRooz',
        version: 4,
        exportedAt: new Date().toISOString(),
        note: 'این فایل متنی حاوی اطلاعات شخصی شما به صورت رمزنگاری‌نشده (Unencrypted) است.',
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

      setSuccessMessage('فایل خروجی با موفقیت در دستگاه شما ذخیره شد.');
      setImportError(null);
    } catch (err) {
      console.error(err);
      setImportError('خطا در تولید فایل خروجی.');
    }
  };

  const validateAndParseJson = (rawContent: string, fileName: string): ParsedBackup => {
    let parsed: any;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new Error('فایل انتخاب‌شده یک فایل معتبر JSON نیست.');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('فرمت فایل پشتیبان نامعتبر است.');
    }

    if (parsed.appName !== 'KarRooz') {
      throw new Error('این فایل متعلق به برنامه کار روز نیست یا ساختار نامعتبر دارد.');
    }

    const version = Number(parsed.version);
    if (version !== 1 && version !== 2 && version !== 3 && version !== 4) {
      throw new Error(`نگارش فایل پشتیبان (${version}) پشتیبانی نمی‌شود.`);
    }

    if (!Array.isArray(parsed.items) || !Array.isArray(parsed.projects)) {
      throw new Error('اطلاعات پروژه‌ها یا تسک‌ها در فایل پشتیبان مفقود یا نامعتبر است.');
    }

    // Validate projects
    const validatedProjects: Project[] = parsed.projects.map((p: any, idx: number) => {
      if (!p || typeof p !== 'object' || typeof p.name !== 'string' || !p.name.trim()) {
        throw new Error(`پروژه شماره ${toPersianDigits(idx + 1)} نام معتبر ندارد.`);
      }
      return {
        id: String(p.id || `proj-${Date.now()}-${idx}`),
        name: String(p.name).trim(),
        description: p.description ? String(p.description) : undefined,
        color: typeof p.color === 'string' ? p.color : '#818CF8',
        createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString(),
        archived: Boolean(p.archived),
        archivedAt: p.archivedAt ? String(p.archivedAt) : undefined,
      };
    });

    let legacyCount = 0;

    // Validate items
    const validatedItems: Item[] = parsed.items.map((item: any, idx: number) => {
      if (!item || typeof item !== 'object' || typeof item.title !== 'string' || !item.title.trim()) {
        throw new Error(`مورد شماره ${toPersianDigits(idx + 1)} عنوان معتبر ندارد.`);
      }

      const itemType = item.type === 'note' ? 'note' : 'task';
      const completed = Boolean(item.completed);
      let status = item.status;
      if (itemType === 'task') {
        if (!status || (status !== 'todo' && status !== 'in_progress' && status !== 'done')) {
          status = completed ? 'done' : 'todo';
        }
      } else {
        status = undefined;
      }

      // Check date fields
      let plannedDate: string | undefined = undefined;
      if (item.plannedDate && typeof item.plannedDate === 'string' && parseDateString(item.plannedDate)) {
        plannedDate = item.plannedDate;
      }

      let dueDate: string | undefined = undefined;
      if (itemType === 'task' && item.dueDate && typeof item.dueDate === 'string' && parseDateString(item.dueDate)) {
        dueDate = item.dueDate;
      }

      const hasLegacyTodayFlag = Boolean(item.inToday || item.destination === 'today');
      if (!plannedDate && hasLegacyTodayFlag) {
        legacyCount++;
      }

      // Preserve recurrence and occurrenceOverrides if valid
      let recurrence = undefined;
      if (itemType === 'task' && item.recurrence && typeof item.recurrence === 'object') {
        const r = item.recurrence;
        if (
          (r.frequency === 'daily' || r.frequency === 'weekly' || r.frequency === 'monthly') &&
          typeof r.interval === 'number' &&
          r.startDate
        ) {
          recurrence = {
            frequency: r.frequency,
            interval: Math.max(1, Number(r.interval) || 1),
            startDate: String(r.startDate),
            endType: r.endType === 'until' ? 'until' : 'never',
            endDate: r.endDate ? String(r.endDate) : undefined,
            weeklyDays: Array.isArray(r.weeklyDays) ? r.weeklyDays.map(Number) : undefined,
            monthlyBasis: r.monthlyBasis === 'gregorian' ? 'gregorian' : 'jalali',
            monthlyDay: typeof r.monthlyDay === 'number' ? Number(r.monthlyDay) : undefined,
            monthlyPolicy: r.monthlyPolicy === 'skip' ? 'skip' : 'last_day',
            deadlineOffsetDays: typeof r.deadlineOffsetDays === 'number' ? Number(r.deadlineOffsetDays) : undefined,
            stoppedAt: r.stoppedAt ? String(r.stoppedAt) : undefined,
          };
        }
      }

      let occurrenceOverrides = undefined;
      if (itemType === 'task' && item.occurrenceOverrides && typeof item.occurrenceOverrides === 'object') {
        occurrenceOverrides = { ...item.occurrenceOverrides };
      }

      return {
        id: String(item.id || `item-${Date.now()}-${idx}`),
        type: itemType,
        title: String(item.title).trim(),
        description: item.description ? String(item.description) : undefined,
        completed: itemType === 'task' ? completed : false,
        status,
        projectId: item.projectId ? String(item.projectId) : undefined,
        project: item.project ? String(item.project) : undefined,
        legacyProjectLabel: item.legacyProjectLabel ? String(item.legacyProjectLabel) : undefined,
        tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
        completedAt: item.completedAt ? String(item.completedAt) : undefined,
        plannedDate,
        dueDate,
        inToday: Boolean(item.inToday),
        destination: item.destination === 'today' ? 'today' : undefined,
        recurrence,
        occurrenceOverrides,
      };
    });

    return {
      version,
      items: validatedItems,
      projects: validatedProjects,
      fileName,
      legacyItemsCountWithoutDate: legacyCount,
    };
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setSuccessMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const result = validateAndParseJson(text, file.name);
        setPendingImport(result);
      } catch (err: any) {
        setImportError(err.message || 'خطا در اعتبارسنجی فایل.');
        setPendingImport(null);
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.onerror = () => {
      setImportError('خطا در خواندن فایل از حافظه دستگاه.');
      setPendingImport(null);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!pendingImport) return;

    try {
      const todayStr = getTehranTodayDateString();

      // Process items based on user choice for legacy items lacking dates
      const finalItems = pendingImport.items.map((item) => {
        let plannedDate = item.plannedDate;

        if (!plannedDate && (item.inToday || item.destination === 'today')) {
          if (legacyScheduleChoice === 'schedule_today') {
            plannedDate = todayStr;
          } else {
            plannedDate = undefined;
          }
        }

        return {
          ...item,
          plannedDate,
          inToday: plannedDate === todayStr,
        };
      });

      const ok = onImportData(finalItems, pendingImport.projects);
      if (ok) {
        setSuccessMessage(
          `اطلاعات با موفقیت بازیابی شد (${toPersianDigits(pendingImport.projects.length)} پروژه و ${toPersianDigits(finalItems.length)} مورد).`
        );
        setPendingImport(null);
        setImportError(null);
      } else {
        setImportError('خطا در ذخیره‌سازی داده‌ها در حافظه مرورگر.');
      }
    } catch (err) {
      console.error(err);
      setImportError('عملیات بازیابی با خطا مواجه شد. داده‌های قبلی دست‌نخورده باقی ماندند.');
    }
  };

  const handleCancelImport = () => {
    setPendingImport(null);
    setImportError(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[#181920] border-t sm:border border-[#2D2F3C] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col text-right overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 bg-gray-600/40 rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#252733]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-950/40 border border-violet-800/40 flex items-center justify-center text-violet-400">
              <HardDrive className="w-4 h-4" />
            </div>
            <h3 id="backup-modal-title" className="text-sm font-semibold text-gray-100">
              مدیریت داده و پشتیبان‌گیری
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-[#232532] rounded-lg transition-colors cursor-pointer"
            aria-label="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Privacy & Unencrypted Warning */}
          <div className="p-3 rounded-xl bg-[#14151C] border border-[#262835] flex items-start gap-2.5 text-xs text-gray-400 leading-relaxed">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-gray-200 font-medium block mb-0.5">توجه به حریم خصوصی:</span>
              فایل‌های پشتیبان به‌صورت متنی (JSON) و <strong>رمزنگاری‌نشده (Unencrypted)</strong> ذخیره می‌شوند و حاوی اطلاعات شخصی شما هستند. آن را در محلی امن نگهداری فرمایید.
            </div>
          </div>

          {/* Feedback Alerts */}
          {importError && (
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-800/40 flex items-start gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{importError}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 flex items-start gap-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Pending Import Confirmation */}
          {pendingImport ? (
            <div className="p-4 rounded-xl bg-amber-950/25 border border-amber-800/40 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4" />
                <span>تأیید جایگزینی داده‌ها (نسخه {toPersianDigits(pendingImport.version)})</span>
              </div>

              <div className="text-xs text-gray-300 space-y-1.5 leading-relaxed">
                <p>
                  فایل معتبر است: <strong>{pendingImport.fileName}</strong>
                </p>
                <p className="text-gray-400">
                  شامل {toPersianDigits(pendingImport.projects.length)} پروژه و {toPersianDigits(pendingImport.items.length)} تسک و یادداشت.
                </p>

                {/* Legacy Today items choice */}
                {pendingImport.legacyItemsCountWithoutDate > 0 && (
                  <div className="p-3 my-2 bg-[#14151C] border border-amber-800/50 rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 text-amber-300 font-medium text-[11px]">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {toPersianDigits(pendingImport.legacyItemsCountWithoutDate)} مورد فاقد تاریخ صریح هستند:
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer text-gray-300">
                        <input
                          type="radio"
                          name="legacy-choice"
                          value="schedule_today"
                          checked={legacyScheduleChoice === 'schedule_today'}
                          onChange={() => setLegacyScheduleChoice('schedule_today')}
                          className="text-violet-600 focus:ring-violet-500"
                        />
                        <span>تنظیم روز انجام برای امروز (پیش‌فرض)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-gray-300">
                        <input
                          type="radio"
                          name="legacy-choice"
                          value="leave_undated"
                          checked={legacyScheduleChoice === 'leave_undated'}
                          onChange={() => setLegacyScheduleChoice('leave_undated')}
                          className="text-violet-600 focus:ring-violet-500"
                        />
                        <span>بدون تاریخ زمان‌بندی (دسترسی از پروژه‌ها و لیست کل)</span>
                      </label>
                    </div>
                  </div>
                )}

                <p className="text-amber-300 font-medium pt-1">
                  هشدار: تمام داده‌های فعلی روی این دستگاه با محتوای این فایل به طور کامل جایگزین خواهند شد (جایگزینی کامل، نه ادغام).
                </p>
              </div>

              <div className="pt-2 border-t border-amber-800/30 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleExport}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs text-gray-300 hover:text-white bg-[#1A1C24] hover:bg-[#222430] border border-[#2E3140] rounded-lg transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-gray-400" />
                  <span>دانلود نسخه پشتیبان از داده‌های فعلی پیش از جایگزینی</span>
                </button>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className="flex-1 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer shadow-sm shadow-red-900/30"
                  >
                    تأیید و جایگزینی داده‌ها
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelImport}
                    className="px-4 py-2 text-xs font-medium text-gray-300 hover:text-white bg-[#222430] hover:bg-[#2A2C3A] rounded-lg transition-colors cursor-pointer"
                  >
                    انصراف
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Action 1: Export */}
              <div className="p-3.5 rounded-xl bg-[#14151C] border border-[#252734] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-gray-200">خروجی اطلاعات (Backup v4)</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    دانلود کل پروژه‌ها، تسک‌ها، کارهای تکرارشونده، روزهای انجام و مهلت‌ها به صورت JSON
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors cursor-pointer shrink-0 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>خروجی</span>
                </button>
              </div>

              {/* Action 2: Import */}
              <div className="p-3.5 rounded-xl bg-[#14151C] border border-[#252734] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-gray-200">بازیابی اطلاعات (Restore)</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    بارگذاری فایل پشتیبان نسخه کار روز (نگارش ۱، ۲، ۳ یا ۴) و جایگزینی روی این دستگاه
                  </p>
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileSelected}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-200 hover:text-white bg-[#222430] hover:bg-[#2C2E3E] border border-[#2E3142] rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>انتخاب فایل</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#252733] bg-[#14151C]/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
