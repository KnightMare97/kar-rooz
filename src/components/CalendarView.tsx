import React, { useState, useMemo } from 'react';
import { Item, Project, CalendarSystem, ItemType } from '../types';
import { TaskCard } from './TaskCard';
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
  formatJalaliDate,
  formatGregorianDate,
  isTodayDate,
} from '../utils/date';
import {
  ChevronRight,
  ChevronLeft,
  Calendar as CalendarIcon,
  Plus,
  CheckCircle2,
  FileText,
  Clock,
} from 'lucide-react';

interface CalendarViewProps {
  items: Item[];
  projects: Project[];
  isSimpleMode: boolean;
  onSelectItem: (item: Item) => void;
  onToggleComplete: (id: string, e: React.MouseEvent) => void;
  onAddItem: (itemData: Omit<Item, 'id' | 'createdAt'>) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  items,
  projects,
  isSimpleMode,
  onSelectItem,
  onToggleComplete,
  onAddItem,
}) => {
  const todayStr = getTehranTodayDateString();
  const todayJalali = gregorianToJalali(todayStr);
  const todayGreg = parseDateString(todayStr) || { year: 2026, month: 11, day: 4 };

  const [calendarSystem, setCalendarSystem] = useState<CalendarSystem>('jalali');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Month navigation state
  const [jYear, setJYear] = useState<number>(todayJalali.jy);
  const [jMonth, setJMonth] = useState<number>(todayJalali.jm);
  const [gYear, setGYear] = useState<number>(todayGreg.year);
  const [gMonth, setGMonth] = useState<number>(todayGreg.month);

  // Inline Quick Add state for the selected day
  const [quickTitle, setQuickTitle] = useState('');
  const [quickType, setQuickType] = useState<ItemType>('task');
  const [quickSelectedProjectId, setQuickSelectedProjectId] = useState<string>('');

  const currentYear = calendarSystem === 'jalali' ? jYear : gYear;
  const currentMonth = calendarSystem === 'jalali' ? jMonth : gMonth;

  // Generate calendar cells (Saturday-first)
  const cells = useMemo(() => {
    return getMonthCalendarCells(currentYear, currentMonth, calendarSystem, todayStr);
  }, [currentYear, currentMonth, calendarSystem, todayStr]);

  // Map dates to item indicators for fast calendar lookup
  const dateIndicators = useMemo(() => {
    const map = new Map<string, { plannedCount: number; dueCount: number }>();

    for (const item of items) {
      if (item.plannedDate) {
        const curr = map.get(item.plannedDate) || { plannedCount: 0, dueCount: 0 };
        curr.plannedCount++;
        map.set(item.plannedDate, curr);
      }
      if (item.type === 'task' && item.dueDate) {
        const curr = map.get(item.dueDate) || { plannedCount: 0, dueCount: 0 };
        curr.dueCount++;
        map.set(item.dueDate, curr);
      }
    }

    return map;
  }, [items]);

  // Selected Day Items: deduplicated items that are either planned on this day or due on this day
  const selectedDayItems = useMemo(() => {
    const map = new Map<string, { item: Item; isPlanned: boolean; isDue: boolean }>();

    for (const item of items) {
      const isPlanned = item.plannedDate === selectedDate;
      const isDue = item.type === 'task' && item.dueDate === selectedDate;

      if (isPlanned || isDue) {
        const existing = map.get(item.id);
        if (existing) {
          existing.isPlanned = existing.isPlanned || isPlanned;
          existing.isDue = existing.isDue || isDue;
        } else {
          map.set(item.id, { item, isPlanned, isDue });
        }
      }
    }

    return Array.from(map.values());
  }, [items, selectedDate]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (calendarSystem === 'jalali') {
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
    if (calendarSystem === 'jalali') {
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
    setSelectedDate(todayStr);
    const tJ = gregorianToJalali(todayStr);
    const tG = parseDateString(todayStr) || { year: 2026, month: 11, day: 4 };
    setJYear(tJ.jy);
    setJMonth(tJ.jm);
    setGYear(tG.year);
    setGMonth(tG.month);
  };

  // Switch calendar system: NEVER alters the underlying selectedDate!
  const handleSwitchCalendarSystem = (newSystem: CalendarSystem) => {
    if (newSystem === calendarSystem) return;
    setCalendarSystem(newSystem);

    // Sync current displayed month to the selectedDate
    if (newSystem === 'jalali') {
      const j = gregorianToJalali(selectedDate);
      setJYear(j.jy);
      setJMonth(j.jm);
    } else {
      const g = parseDateString(selectedDate) || { year: 2026, month: 11, day: 4 };
      setGYear(g.year);
      setGMonth(g.month);
    }
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    const chosenProj = projects.find((p) => p.id === quickSelectedProjectId);

    onAddItem({
      type: quickType,
      title: quickTitle.trim(),
      completed: false,
      status: quickType === 'task' ? 'todo' : undefined,
      projectId: quickSelectedProjectId || undefined,
      project: chosenProj?.name,
      tags: [],
      plannedDate: selectedDate,
      inToday: selectedDate === todayStr,
      destination: selectedDate === todayStr ? 'today' : undefined,
    });

    setQuickTitle('');
  };

  const monthLabel =
    calendarSystem === 'jalali'
      ? `${PERSIAN_MONTH_NAMES[jMonth - 1]} ${toPersianDigits(jYear)}`
      : `${GREGORIAN_MONTH_NAMES_FA[gMonth - 1]} ${toPersianDigits(gYear)}`;

  const selectedDateFormatted = formatJalaliDate(selectedDate, 'full');
  const selectedDateGregorianFormatted = formatGregorianDate(selectedDate, 'full');

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-150">
      {/* Top Calendar Toolbar */}
      <div className="bg-[#15161D] border border-[#232532] rounded-2xl p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Month & Year Title + Navigation */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1 bg-[#121318] p-1 rounded-xl border border-[#242634]">
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-[#20222E] rounded-lg transition-colors cursor-pointer"
                title="ماه بعد"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-[#20222E] rounded-lg transition-colors cursor-pointer"
                title="ماه قبل"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {monthLabel}
            </h3>

            <button
              type="button"
              onClick={handleGoToToday}
              className="text-xs font-medium text-violet-300 hover:text-white bg-violet-950/40 hover:bg-violet-900/50 border border-violet-800/40 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              برو به امروز
            </button>
          </div>

          {/* Calendar System Switcher */}
          <div className="flex items-center self-start sm:self-auto gap-2">
            <span className="text-xs text-gray-400">تقویم:</span>
            <div className="flex items-center p-0.5 bg-[#121318] rounded-xl border border-[#242634]">
              <button
                type="button"
                onClick={() => handleSwitchCalendarSystem('jalali')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  calendarSystem === 'jalali'
                    ? 'bg-[#27243B] text-violet-200 border border-violet-500/30 shadow-xs'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                خورشیدی (جلالی)
              </button>
              <button
                type="button"
                onClick={() => handleSwitchCalendarSystem('gregorian')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  calendarSystem === 'gregorian'
                    ? 'bg-[#27243B] text-violet-200 border border-violet-500/30 shadow-xs'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                میلادی (Gregorian)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Month Calendar & Selected Day Agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Month Calendar Grid (Desktop 7 cols, Mobile full width) */}
        <div className="lg:col-span-7 bg-[#15161D] border border-[#232532] rounded-2xl p-3 sm:p-4 shadow-xs">
          {/* Weekday headers: Saturday first */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center text-xs font-semibold text-gray-400 pb-2 border-b border-[#232532] select-none">
            {PERSIAN_WEEKDAY_SHORT.map((wd, i) => (
              <span
                key={i}
                className={i === 6 ? 'text-amber-400/90' : 'text-gray-400'}
                title={wd}
              >
                {wd}
              </span>
            ))}
          </div>

          {/* Month Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 pt-2">
            {cells.map((cell, idx) => {
              const isSelected = selectedDate === cell.dateStr;
              const isFriday = idx % 7 === 6;
              const indicators = dateIndicators.get(cell.dateStr);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedDate(cell.dateStr)}
                  className={`group relative min-h-[52px] sm:min-h-[64px] p-1 sm:p-1.5 rounded-xl border flex flex-col justify-between items-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-violet-600/25 border-violet-500 text-white shadow-xs'
                      : cell.isToday
                        ? 'bg-[#1D1B28] border-violet-600/50 text-violet-300'
                        : !cell.isCurrentMonth
                          ? 'bg-[#121318]/50 border-transparent text-gray-400 opacity-40 hover:opacity-75'
                          : isFriday
                            ? 'bg-[#181920] border-[#252733] text-amber-300/90 hover:bg-[#1E1F29]'
                            : 'bg-[#181920] border-[#252733] text-gray-200 hover:bg-[#1E1F29]'
                  }`}
                >
                  {/* Day Number */}
                  <div className="w-full flex items-center justify-between text-[11px] sm:text-xs">
                    <span
                      className={`font-semibold ${
                        isSelected
                          ? 'text-white'
                          : cell.isToday
                            ? 'text-violet-300'
                            : ''
                      }`}
                    >
                      {toPersianDigits(cell.dayNumber)}
                    </span>

                    {/* Small Today Tag if space allows */}
                    {cell.isToday && (
                      <span className="text-[8px] bg-violet-600/30 text-violet-300 px-1 rounded-sm hidden sm:inline">
                        امروز
                      </span>
                    )}
                  </div>

                  {/* Indicators / Badge Dots */}
                  <div className="w-full flex items-center justify-center gap-1 mt-1">
                    {indicators?.plannedCount ? (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0"
                        title={`${toPersianDigits(indicators.plannedCount)} تسک یا یادداشت`}
                      />
                    ) : null}

                    {indicators?.dueCount ? (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                        title={`${toPersianDigits(indicators.dueCount)} مهلت تحویل`}
                      />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Calendar Legend */}
          <div className="flex items-center gap-4 pt-3 mt-2 border-t border-[#232532] text-[11px] text-gray-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-400" />
              <span>روز انجام (برنامه‌ریزی)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>مهلت تحویل (ددلاین)</span>
            </div>
          </div>
        </div>

        {/* Selected-Day Agenda (Desktop 5 cols, Mobile below grid) */}
        <div className="lg:col-span-5 bg-[#15161D] border border-[#232532] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
          {/* Agenda Header */}
          <div className="border-b border-[#232532] pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-violet-400" />
                <h4 className="text-sm font-bold text-white">برنامه روز انتخاب‌شده</h4>
              </div>

              {isTodayDate(selectedDate, todayStr) && (
                <span className="text-[10px] text-violet-300 bg-violet-950/40 border border-violet-800/40 px-2 py-0.5 rounded-full font-medium">
                  امروز
                </span>
              )}
            </div>

            <div className="mt-1 text-xs text-gray-300 font-medium">
              {selectedDateFormatted}
            </div>
            <div className="text-[11px] text-gray-500 font-mono">
              {selectedDateGregorianFormatted}
            </div>
          </div>

          {/* Quick Add for this Selected Day */}
          <form
            onSubmit={handleQuickAddSubmit}
            className="p-2.5 bg-[#121318] rounded-xl border border-[#232532] space-y-2"
          >
            <div className="flex items-center gap-1.5">
              {/* Type toggle */}
              <div className="flex items-center p-0.5 bg-[#181920] rounded-lg border border-[#262835] shrink-0 text-xs">
                <button
                  type="button"
                  onClick={() => setQuickType('task')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    quickType === 'task' ? 'bg-[#29263E] text-violet-200' : 'text-gray-400'
                  }`}
                >
                  تسک
                </button>
                <button
                  type="button"
                  onClick={() => setQuickType('note')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    quickType === 'note' ? 'bg-[#29263E] text-violet-200' : 'text-gray-400'
                  }`}
                >
                  یادداشت
                </button>
              </div>

              <input
                type="text"
                dir="auto"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="افزودن مورد برای این روز..."
                className="flex-1 bg-transparent border-0 px-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-hidden"
              />

              <button
                type="submit"
                disabled={!quickTitle.trim()}
                className="p-1.5 text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-35 rounded-lg transition-colors cursor-pointer shrink-0"
                title="ثبت"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Agenda Items List */}
          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-0.5">
            {selectedDayItems.length > 0 ? (
              selectedDayItems.map(({ item, isPlanned, isDue }) => (
                <div key={item.id} className="relative group">
                  <TaskCard
                    item={item}
                    projects={projects}
                    isSimpleMode={isSimpleMode}
                    onToggleComplete={onToggleComplete}
                    onClick={onSelectItem}
                  />

                  {/* If item has both planned and due dates on this same day */}
                  {isPlanned && isDue && (
                    <div className="mt-1 px-3 py-1 bg-violet-950/25 border border-violet-800/30 rounded-lg text-[10px] text-violet-300 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3 text-violet-400" />
                        <span>هم روز انجام و هم مهلت تحویل در این روز است</span>
                      </span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="py-8 text-center rounded-xl border border-dashed border-[#232532] text-xs text-gray-500">
                هیچ تسک یا یادداشتی برای این تاریخ ثبت نشده است.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
