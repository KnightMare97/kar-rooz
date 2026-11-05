import React, { useState } from 'react';
import { Item } from '../types';
import {
  Repeat,
  X,
  AlertTriangle,
  StopCircle,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Clock,
  Info,
} from 'lucide-react';
import {
  formatJalaliDate,
  getTehranTodayDateString,
  toPersianDigits,
  addDays,
} from '../utils/date';
import {
  getRecurrenceSummaryFa,
  calculateDeadlineOffset,
  isSeriesActive,
} from '../utils/recurrence';
import { DatePickerModal } from './DatePickerModal';

interface SeriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  seriesItem: Item | null;
  onStopSeries: (seriesId: string, cutoffDate: string) => void;
  onRestoreOccurrence: (seriesId: string, originalDate: string) => void;
}

export const SeriesModal: React.FC<SeriesModalProps> = ({
  isOpen,
  onClose,
  seriesItem,
  onStopSeries,
  onRestoreOccurrence,
}) => {
  const [isConfirmingStop, setIsConfirmingStop] = useState(false);
  const todayStr = getTehranTodayDateString();
  const [cutoffDate, setCutoffDate] = useState<string>(todayStr);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  if (!isOpen || !seriesItem || !seriesItem.recurrence) return null;

  const rule = seriesItem.recurrence;
  const deadlineOffset = calculateDeadlineOffset(seriesItem.plannedDate, seriesItem.dueDate);
  const isActive = isSeriesActive(rule, todayStr);
  const overrides = seriesItem.occurrenceOverrides || {};
  const overrideEntries = Object.entries(overrides);

  const completedCount = overrideEntries.filter(([_, o]) => o.completed).length;
  const skippedList = overrideEntries.filter(([_, o]) => o.skipped);
  const rescheduledCount = overrideEntries.filter(([orig, o]) => o.plannedDate && o.plannedDate !== orig).length;

  const handleConfirmStop = () => {
    onStopSeries(seriesItem.id, cutoffDate);
    setIsConfirmingStop(false);
    onClose();
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="series-modal-title"
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      >
        <div
          className="w-full sm:max-w-md bg-[#181920] border-t sm:border border-[#2D2F3C] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col text-right overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Handle */}
          <div className="w-12 h-1.5 bg-gray-600/40 rounded-full mx-auto mt-2.5 sm:hidden" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#252733]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-950/40 border border-violet-800/40 flex items-center justify-center text-violet-400">
                <Repeat className="w-4 h-4" />
              </div>
              <div>
                <h3 id="series-modal-title" className="text-sm font-semibold text-gray-100">
                  مدیریت مجموعه تکرار
                </h3>
              </div>
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

          {/* Content */}
          <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs text-gray-300">
            {/* Task Title & Status */}
            <div className="p-3 rounded-xl bg-[#14151C] border border-[#262835] space-y-1.5">
              <span className="text-[11px] text-gray-500">عنوان تسک اصلی:</span>
              <h4 className="text-sm font-bold text-white">{seriesItem.title}</h4>

              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {isActive ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>تکرار فعال است</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-400 bg-amber-950/30 border border-amber-800/40 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>
                      متوقف‌شده از {formatJalaliDate(rule.stoppedAt || todayStr, 'short')}
                    </span>
                  </span>
                )}

                {seriesItem.plannedDate && (
                  <span className="text-[11px] text-gray-400">
                    تاریخ شروع: {formatJalaliDate(seriesItem.plannedDate, 'short')}
                  </span>
                )}
              </div>
            </div>

            {/* Pattern Summary */}
            <div className="p-3 rounded-xl bg-[#14151C] border border-[#262835] space-y-1">
              <span className="text-[11px] text-gray-500">الگوی تنظیم‌شده:</span>
              <p className="text-violet-200 font-semibold leading-relaxed">
                {getRecurrenceSummaryFa(rule, seriesItem.plannedDate, deadlineOffset)}
              </p>
            </div>

            {/* Stats & Overrides Summary */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-[#14151C] border border-[#262835] text-center">
                <span className="text-[10px] text-gray-500 block">انجام‌شده‌ها</span>
                <span className="text-sm font-bold text-emerald-400 font-mono mt-0.5 block">
                  {toPersianDigits(completedCount)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#14151C] border border-[#262835] text-center">
                <span className="text-[10px] text-gray-500 block">ردشده‌ها</span>
                <span className="text-sm font-bold text-amber-400 font-mono mt-0.5 block">
                  {toPersianDigits(skippedList.length)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#14151C] border border-[#262835] text-center">
                <span className="text-[10px] text-gray-500 block">جابجا‌شده‌ها</span>
                <span className="text-sm font-bold text-violet-400 font-mono mt-0.5 block">
                  {toPersianDigits(rescheduledCount)}
                </span>
              </div>
            </div>

            {/* Skipped Occurrences List & Restore Action */}
            {skippedList.length > 0 && (
              <div className="p-3 rounded-xl bg-[#14151C] border border-[#262835] space-y-2">
                <span className="text-[11px] font-semibold text-gray-300 block">
                  نوبت‌های ردشده (صرف‌نظر شده):
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {skippedList.map(([origDate]) => (
                    <div
                      key={origDate}
                      className="flex items-center justify-between p-2 rounded-lg bg-[#181920] border border-[#262835]"
                    >
                      <span className="text-gray-300 text-xs">
                        نوبت {formatJalaliDate(origDate, 'full')}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRestoreOccurrence(seriesItem.id, origDate)}
                        className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-violet-300 hover:text-white bg-violet-950/40 hover:bg-violet-900/50 border border-violet-700/50 rounded-md transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>بازگردانی</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pattern Change Explanation Note */}
            <div className="p-3 rounded-xl bg-[#14151C] border border-[#262835] flex items-start gap-2.5 text-xs text-gray-400 leading-relaxed">
              <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-gray-200 font-medium block mb-0.5">تغییر الگوی تکرار:</span>
                برای تغییر فرکانس یا الگوی تکرار، تکرار این مجموعه را از تاریخ دلخواه متوقف کرده و تسک تکرارشونده جدیدی ایجاد فرمایید. تاریخچه گذشته دست‌نخورده باقی می‌ماند.
              </div>
            </div>

            {/* Stop Series Action / Confirmation */}
            {isActive && (
              <div className="pt-2">
                {!isConfirmingStop ? (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingStop(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-amber-400 hover:text-amber-300 bg-amber-950/20 hover:bg-amber-950/40 border border-amber-800/40 rounded-xl transition-colors cursor-pointer"
                  >
                    <StopCircle className="w-4 h-4" />
                    <span>توقف تکرار این مجموعه از تاریخ مشخص...</span>
                  </button>
                ) : (
                  <div className="p-3.5 rounded-xl bg-amber-950/25 border border-amber-800/40 space-y-3">
                    <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                      <AlertTriangle className="w-4 h-4" />
                      <span>تأیید توقف تکرارهای آینده</span>
                    </div>

                    <p className="text-[11px] text-gray-300 leading-relaxed">
                      نوبت‌های پس از این تاریخ دیگر در تقویم و لیست‌ها ظاهر نخواهند شد. نوبت‌های گذشته و وضعیت‌های ثبت‌شده حفظ می‌شوند.
                    </p>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#14151C] border border-amber-800/40">
                      <span className="text-[11px] text-gray-400">تاریخ توقف (شامل این تاریخ به بعد):</span>
                      <button
                        type="button"
                        onClick={() => setIsDatePickerOpen(true)}
                        className="px-2.5 py-1 text-xs font-semibold text-amber-300 bg-[#181920] border border-amber-700/50 rounded-lg hover:border-amber-400 cursor-pointer"
                      >
                        {formatJalaliDate(cutoffDate, 'short')}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleConfirmStop}
                        className="flex-1 py-1.5 px-3 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors cursor-pointer"
                      >
                        تأیید و توقف تکرار
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsConfirmingStop(false)}
                        className="py-1.5 px-3 text-xs font-medium text-gray-400 hover:text-white bg-[#222430] rounded-lg transition-colors cursor-pointer"
                      >
                        انصراف
                      </button>
                    </div>
                  </div>
                )}
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

      {isDatePickerOpen && (
        <DatePickerModal
          isOpen={isDatePickerOpen}
          title="انتخاب تاریخ توقف تکرار"
          selectedDate={cutoffDate}
          onSelectDate={(newDate) => {
            setCutoffDate(newDate);
            setIsDatePickerOpen(false);
          }}
          onClearDate={() => {
            setCutoffDate(todayStr);
            setIsDatePickerOpen(false);
          }}
          onClose={() => setIsDatePickerOpen(false)}
        />
      )}
    </>
  );
};
