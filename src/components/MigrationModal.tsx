import React, { useState } from 'react';
import { Item, Project } from '../types';
import { CollisionResolution, MigrationResult } from '../services/firestoreRepository';
import { toPersianDigits } from '../utils/date';
import {
  Cloud,
  HardDrive,
  Download,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Layers,
  Folder,
} from 'lucide-react';

interface MigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  localItems: Item[];
  localProjects: Project[];
  cloudItemsCount: number;
  cloudProjectsCount: number;
  collidingCount: number;
  onMigrate: (resolution: CollisionResolution) => Promise<MigrationResult>;
  onDismissWithoutMigration: () => void;
}

export const MigrationModal: React.FC<MigrationModalProps> = ({
  isOpen,
  onClose,
  localItems,
  localProjects,
  cloudItemsCount,
  cloudProjectsCount,
  collidingCount,
  onMigrate,
  onDismissWithoutMigration,
}) => {
  const [resolution, setResolution] = useState<CollisionResolution>('rename');
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [backupDownloaded, setBackupDownloaded] = useState(false);

  if (!isOpen) return null;

  const handleExportBackup = () => {
    try {
      const exportData = {
        appName: 'KarRooz',
        version: 4,
        exportedAt: new Date().toISOString(),
        note: 'پشتیبان خودکار پیش از انتقال داده‌ها به فضای ابری',
        projects: localProjects,
        items: localItems,
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const link = document.createElement('a');
      link.href = url;
      link.download = `karrooz-pre-migration-backup-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupDownloaded(true);
    } catch {
      setMigrationError('خطا در دانلود فایل پشتیبان محلی.');
    }
  };

  const handleStartMigration = async () => {
    setMigrationError(null);
    setIsMigrating(true);
    try {
      const result = await onMigrate(resolution);
      if (!result.success) {
        setMigrationError(result.error || 'خطا در ثبت اطلاعات در سرور فایربیس.');
      } else {
        onClose();
      }
    } catch (err: any) {
      setMigrationError(err.message || 'خطا در برقراری ارتباط با سرور.');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="migration-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-lg bg-[#181920] border border-[#2D2F3C] rounded-2xl shadow-2xl flex flex-col text-right overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#252733]">
          <div className="flex items-center gap-2 text-violet-300">
            <Cloud className="w-5 h-5 shrink-0" />
            <h3 id="migration-modal-title" className="text-sm font-semibold text-gray-100">
              مدیریت انتقال اطلاعات محلی به حساب ابری
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            aria-label="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {migrationError && (
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-800/40 text-xs text-red-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{migrationError}</span>
            </div>
          )}

          <p className="text-xs text-gray-300 leading-relaxed">
            شما با موفقیت وارد حساب گوگل خود شدید. داده‌های موجود در این مرورگر به صورت خودکار آپلود یا بازنویسی نشده‌اند.
            می‌توانید اطلاعات محلی را به حساب ابری خود منتقل کنید یا کار را با داده‌های ابری مستقل ادامه دهید.
          </p>

          {/* Counts Comparison Box */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-[#13141B] border border-[#242634] rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-300">
                <HardDrive className="w-3.5 h-3.5 text-violet-400" />
                <span>داده‌های محلی مرورگر</span>
              </div>
              <div className="text-[11px] text-gray-400 space-y-0.5">
                <div>وظایف و یادداشت‌ها: <strong className="text-gray-200">{toPersianDigits(localItems.length)}</strong></div>
                <div>پروژه‌ها: <strong className="text-gray-200">{toPersianDigits(localProjects.length)}</strong></div>
              </div>
            </div>

            <div className="p-3 bg-[#13141B] border border-[#242634] rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-300">
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span>داده‌های موجود در حساب ابری</span>
              </div>
              <div className="text-[11px] text-gray-400 space-y-0.5">
                <div>وظایف و یادداشت‌ها: <strong className="text-gray-200">{toPersianDigits(cloudItemsCount)}</strong></div>
                <div>پروژه‌ها: <strong className="text-gray-200">{toPersianDigits(cloudProjectsCount)}</strong></div>
              </div>
            </div>
          </div>

          {/* Collisions Warning if any */}
          {collidingCount > 0 && (
            <div className="p-3 rounded-xl bg-amber-950/25 border border-amber-800/40 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>شناسایی {toPersianDigits(collidingCount)} مورد تداخل شناسه</span>
              </div>
              <p className="text-[11px] text-gray-300">
                برخی از موارد محلی با موارد موجود در حساب ابری دارای شناسه یکسان هستند. شیوه رفع تداخل را انتخاب نمایید:
              </p>

              <div className="space-y-1.5 pt-1 text-xs text-gray-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="collision_resolution"
                    value="rename"
                    checked={resolution === 'rename'}
                    onChange={() => setResolution('rename')}
                    className="text-violet-600 focus:ring-0"
                  />
                  <span>تولید شناسه جدید برای موارد محلی (پیشنهادی - حفظ هر دو نسخه)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="collision_resolution"
                    value="skip"
                    checked={resolution === 'skip'}
                    onChange={() => setResolution('skip')}
                    className="text-violet-600 focus:ring-0"
                  />
                  <span>صرف‌نظر از موارد تکراری (اولویت با نسخه ابری)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="collision_resolution"
                    value="overwrite"
                    checked={resolution === 'overwrite'}
                    onChange={() => setResolution('overwrite')}
                    className="text-violet-600 focus:ring-0"
                  />
                  <span>جایگزینی موارد ابری با نسخه محلی</span>
                </label>
              </div>
            </div>
          )}

          {/* Safety Backup Step */}
          <div className="p-3 rounded-xl bg-[#14151C] border border-[#262835] flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-gray-200">پشتیبان‌گیری امن قبل از مهاجرت</span>
              <p className="text-[11px] text-gray-400">
                {backupDownloaded
                  ? 'نسخه پشتیبان محلی با موفقیت ذخیره شد ✓'
                  : 'پیشنهاد می‌شود یک نسخه از اطلاعات محلی خود را دانلود کنید.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportBackup}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer shrink-0 ${
                backupDownloaded
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                  : 'bg-[#1C1E28] hover:bg-[#252837] text-gray-300 hover:text-white border-[#2C2F40]'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{backupDownloaded ? 'پشتیبان دریافت شد' : 'دریافت فایل JSON'}</span>
            </button>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-[#14151C] border-t border-[#252733] flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onDismissWithoutMigration}
            disabled={isMigrating}
            className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors cursor-pointer text-center"
          >
            ادامه بدون انتقال (نگهداری داده‌های ابری مستقل)
          </button>

          <button
            type="button"
            onClick={handleStartMigration}
            disabled={isMigrating}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            {isMigrating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>در حال انتقال و تایید سرور...</span>
              </>
            ) : (
              <>
                <Cloud className="w-4 h-4" />
                <span>انتقال به حساب ابری</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
