import React, { useState } from 'react';
import {
  CalendarSystem,
} from '../types';
import {
  getTehranTodayDateString,
  toPersianDigits,
  getMonthCalendarCells,
  PERSIAN_MONTH_NAMES,
  GREGORIAN_MONTH_NAMES_FA,
  PERSIAN_WEEKDAY_SHORT,
  gregorianToJalali,
  jalaliToGregorian,
  parseDateString,
} from '../utils/date';
import { X, ChevronRight, ChevronLeft, Calendar as CalendarIcon } from 'lucide-react';

interface DatePickerModalProps {
  isOpen: boolean;
  title: string;
  selectedDate?: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  onClearDate?: () => void;
  onClose: () => void;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  isOpen,
  title,
  selectedDate,
  onSelectDate,
  onClearDate,
  onClose,
}) => {
  const todayStr = getTehranTodayDateString();
  const initialBase = selectedDate || todayStr;
  const initialJalali = gregorianToJalali(initialBase);
  const initialGreg = parseDateString(initialBase) || { year: 2026, month: 11, day: 4 };

  const [system, setSystem] = useState<CalendarSystem>('jalali');
  const [jYear, setJYear] = useState<number>(initialJalali.jy);
  const [jMonth, setJMonth] = useState<number>(initialJalali.jm);
  const [gYear, setGYear] = useState<number>(initialGreg.year);
  const [gMonth, setGMonth] = useState<number>(initialGreg.month);

  if (!isOpen) return null;

  const currentYear = system === 'jalali' ? jYear : gYear;
  const currentMonth = system === 'jalali' ? jMonth : gMonth;

  const cells = getMonthCalendarCells(currentYear, currentMonth, system, todayStr);

  const handlePrevMonth = () => {
    if (system === 'jalali') {
      if (jMonth === 1) {
        setJMonth(12);
        setJYear((prev) => prev - 1);
      } else {
        setJMonth((prev) => prev - 1);
      }
    } else {
      if (gMonth === 1) {
        setGMonth(12);
        setGYear((prev) => prev - 1);
      } else {
        setGMonth((prev) => prev - 1);
      }
    }
  };

  const handleNextMonth = () => {
    if (system === 'jalali') {
      if (jMonth === 12) {
        setJMonth(1);
        setJYear((prev) => prev + 1);
      } else {
        setJMonth((prev) => prev + 1);
      }
    } else {
      if (gMonth === 12) {
        setGMonth(1);
        setGYear((prev) => prev + 1);
      } else {
        setGMonth((prev) => prev + 1);
      }
    }
  };

  const handleGoToToday = () => {
    const tJ = gregorianToJalali(todayStr);
    const tG = parseDateString(todayStr) || { year: 2026, month: 11, day: 4 };
    setJYear(tJ.jy);
    setJMonth(tJ.jm);
    setGYear(tG.year);
    setGMonth(tG.month);
  };

  const monthLabel =
    system === 'jalali'
      ? `${PERSIAN_MONTH_NAMES[jMonth - 1]} ${toPersianDigits(jYear)}`
      : `${GREGORIAN_MONTH_NAMES_FA[gMonth - 1]} ${toPersianDigits(gYear)}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="datepicker-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#16171E] border border-[#2B2D3C] rounded-2xl shadow-2xl p-4 text-right animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#252735]">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-violet-400" />
            <h4 id="datepicker-modal-title" className="text-xs font-semibold text-gray-200">
              {title}
            </h4>
          </div>

          <div className="flex items-center gap-2">
            {/* Calendar system switch */}
            <div className="flex items-center p-0.5 bg-[#111217] rounded-md border border-[#232532] text-[10px]">
              <button
                type="button"
                onClick={() => setSystem('jalali')}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  system === 'jalali'
                    ? 'bg-[#29263E] text-violet-200 font-medium'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                شمسی
              </button>
              <button
                type="button"
                onClick={() => setSystem('gregorian')}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  system === 'gregorian'
                    ? 'bg-[#29263E] text-violet-200 font-medium'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                میلادی
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white rounded-md hover:bg-[#20222D] cursor-pointer"
              aria-label="بستن"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between py-2.5">
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 text-gray-400 hover:text-white hover:bg-[#20222E] rounded-md transition-colors cursor-pointer"
            title="ماه بعد"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-100">{monthLabel}</span>
            <button
              type="button"
              onClick={handleGoToToday}
              className="text-[10px] text-violet-400 hover:text-violet-300 px-1.5 py-0.5 bg-violet-950/30 rounded border border-violet-800/40 cursor-pointer"
            >
              امروز
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 text-gray-400 hover:text-white hover:bg-[#20222E] rounded-md transition-colors cursor-pointer"
            title="ماه قبل"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Weekday Labels (Saturday-first) */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-gray-400 py-1 border-b border-[#20222E] mb-1">
          {PERSIAN_WEEKDAY_SHORT.map((wd, i) => (
            <span key={i} className={i === 6 ? 'text-amber-400/90' : ''}>
              {wd}
            </span>
          ))}
        </div>

        {/* Month Day Cells */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, idx) => {
            const isSelected = selectedDate === cell.dateStr;
            const isFriday = idx % 7 === 6;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onSelectDate(cell.dateStr);
                  onClose();
                }}
                className={`h-8 rounded-lg text-xs font-medium flex items-center justify-center transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-violet-600 text-white shadow-xs'
                    : cell.isToday
                      ? 'bg-violet-950/40 text-violet-300 border border-violet-600/50 hover:bg-violet-900/40'
                      : !cell.isCurrentMonth
                        ? 'text-gray-400 opacity-40 hover:text-gray-200'
                        : isFriday
                          ? 'text-amber-300/90 hover:bg-[#20222E]'
                          : 'text-gray-200 hover:bg-[#20222E]'
                }`}
              >
                {toPersianDigits(cell.dayNumber)}
              </button>
            );
          })}
        </div>

        {/* Clear & Footer Actions */}
        <div className="flex items-center justify-between pt-3 mt-2 border-t border-[#232532]">
          {onClearDate ? (
            <button
              type="button"
              onClick={() => {
                onClearDate();
                onClose();
              }}
              className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
            >
              حذف تاریخ
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-xs text-gray-400 hover:text-white bg-[#20222E] rounded-md transition-colors cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
