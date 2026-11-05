import React, { useState, useMemo } from 'react';
import { Item, Project, CalendarSystem, ItemType } from '../types';
import {
  getTehranTodayDateString,
  toPersianDigits,
  getMonthCalendarCells,
  getWeekDaysForDate,
  addDays,
  PERSIAN_MONTH_NAMES,
  GREGORIAN_MONTH_NAMES_FA,
  PERSIAN_WEEKDAY_SHORT,
  gregorianToJalali,
  parseDateString,
  formatJalaliDate,
  isTodayDate,
} from '../utils/date';
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Calendar as CalendarIcon,
  Plus,
  CheckCircle2,
  FileText,
  Clock,
  AlertCircle,
  Folder,
  Tag as TagIcon,
  Check,
  AlertTriangle,
  Repeat,
} from 'lucide-react';
import { expandAllItems } from '../utils/recurrence';

interface CalendarViewProps {
  items: Item[];
  projects: Project[];
  isSimpleMode: boolean;
  onSelectItem: (item: Item) => void;
  onToggleComplete: (id: string, e: React.MouseEvent) => void;
  onAddItem: (itemData: Omit<Item, 'id' | 'createdAt'>) => void;
  defaultProjectId?: string;
  disableProjectPicker?: boolean;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  items,
  projects,
  isSimpleMode,
  onSelectItem,
  onToggleComplete,
  onAddItem,
  defaultProjectId,
  disableProjectPicker = false,
}) => {
  const todayStr = getTehranTodayDateString();
  const todayJalali = gregorianToJalali(todayStr);
  const todayGreg = parseDateString(todayStr) || { year: 2026, month: 11, day: 5 };

  const [calendarSystem, setCalendarSystem] = useState<CalendarSystem>('jalali');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Month navigation state
  const [jYear, setJYear] = useState<number>(todayJalali.jy);
  const [jMonth, setJMonth] = useState<number>(todayJalali.jm);
  const [gYear, setGYear] = useState<number>(todayGreg.year);
  const [gMonth, setGMonth] = useState<number>(todayGreg.month);

  // Mobile full month expanded/collapsed state
  const [isMobileMonthExpanded, setIsMobileMonthExpanded] = useState(false);

  // Agenda completed section collapsed state
  const [isCompletedOpen, setIsCompletedOpen] = useState(false);

  // Collapsible Undated Items ("بدون تاریخ")
  const [isUndatedOpen, setIsUndatedOpen] = useState(false);

  // Capture draft state
  const [draftTitle, setDraftTitle] = useState('');
  const [draftType, setDraftType] = useState<ItemType>('task');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftProjectId, setDraftProjectId] = useState<string>(defaultProjectId || '');
  const [draftTags, setDraftTags] = useState('');
  const [isDraftExpanded, setIsDraftExpanded] = useState(false);

  // Keep draftProjectId in sync with defaultProjectId if prop changes
  React.useEffect(() => {
    if (defaultProjectId !== undefined) {
      setDraftProjectId(defaultProjectId || '');
    }
  }, [defaultProjectId]);

  // Draft protection state (when user tries to change date with unsaved title)
  const [pendingDateChange, setPendingDateChange] = useState<{
    previousDate: string;
    newDate: string;
  } | null>(null);

  const currentYear = calendarSystem === 'jalali' ? jYear : gYear;
  const currentMonth = calendarSystem === 'jalali' ? jMonth : gMonth;

  // Month grid cells
  const cells = useMemo(() => {
    return getMonthCalendarCells(currentYear, currentMonth, calendarSystem, todayStr);
  }, [currentYear, currentMonth, calendarSystem, todayStr]);

  // Mobile current week strip days (7 days from Saturday to Friday)
  const mobileWeekDays = useMemo(() => {
    return getWeekDaysForDate(selectedDate);
  }, [selectedDate]);

  // Expand recurring items for visible calendar date range (both month grid and week strip)
  const expandedCalendarItems = useMemo(() => {
    if (cells.length === 0) return items;
    const gridStart = cells[0].dateStr;
    const gridEnd = cells[cells.length - 1].dateStr;
    const weekStart = mobileWeekDays[0] || gridStart;
    const weekEnd = mobileWeekDays[mobileWeekDays.length - 1] || gridEnd;

    let rangeStart = gridStart < weekStart ? gridStart : weekStart;
    let rangeEnd = gridEnd > weekEnd ? gridEnd : weekEnd;
    if (selectedDate < rangeStart) rangeStart = selectedDate;
    if (selectedDate > rangeEnd) rangeEnd = selectedDate;

    return expandAllItems(items, rangeStart, rangeEnd, { todayStr });
  }, [items, cells, mobileWeekDays, selectedDate, todayStr]);

  // Pre-calculate items per date: map of dateStr -> unique items and unique open counts
  const itemsByDate = useMemo(() => {
    const map = new Map<
      string,
      {
        uniqueItems: Item[];
        eligiblePreviews: Item[];
        openTasksCount: number;
        notesCount: number;
        plannedTasks: Item[];
        dueTasks: Item[];
        notes: Item[];
        completedItems: Item[];
      }
    >();

    for (const item of expandedCalendarItems) {
      const datesToRecord = new Set<string>();
      if (item.plannedDate) datesToRecord.add(item.plannedDate);
      if (item.type === 'task' && item.dueDate) datesToRecord.add(item.dueDate);

      for (const d of datesToRecord) {
        let entry = map.get(d);
        if (!entry) {
          entry = {
            uniqueItems: [],
            eligiblePreviews: [],
            openTasksCount: 0,
            notesCount: 0,
            plannedTasks: [],
            dueTasks: [],
            notes: [],
            completedItems: [],
          };
          map.set(d, entry);
        }

        // Add to uniqueItems (for agenda complete view)
        if (!entry.uniqueItems.some((i) => i.id === item.id)) {
          entry.uniqueItems.push(item);
        }

        const isCompleted = item.completed || item.status === 'done';
        if (isCompleted) {
          if (!entry.completedItems.some((i) => i.id === item.id)) {
            entry.completedItems.push(item);
          }
        } else {
          // Incomplete item: add to eligiblePreviews once per date
          if (!entry.eligiblePreviews.some((i) => i.id === item.id)) {
            entry.eligiblePreviews.push(item);
          }

          if (item.type === 'task') {
            entry.openTasksCount++;
            if (item.dueDate === d) {
              entry.dueTasks.push(item);
            }
            if (item.plannedDate === d) {
              entry.plannedTasks.push(item);
            }
          } else if (item.type === 'note') {
            if (item.plannedDate === d) {
              entry.notesCount++;
              entry.notes.push(item);
            }
          }
        }
      }
    }

    return map;
  }, [items]);

  // Selected Day Items categorized into distinct groups:
  // 1. Due Today (مهلت‌های این روز)
  // 2. Planned Today (برنامه انجام - not in due)
  // 3. Notes (یادداشت‌ها)
  // 4. Completed (انجام‌شده‌ها)
  const selectedDayData = useMemo(() => {
    const entry = itemsByDate.get(selectedDate);
    if (!entry) {
      return {
        dueItems: [] as Item[],
        plannedItems: [] as Item[],
        noteItems: [] as Item[],
        completedItems: [] as Item[],
        totalUniqueCount: 0,
      };
    }

    const dueItems: Item[] = [];
    const plannedItems: Item[] = [];
    const noteItems: Item[] = [];
    const completedItems: Item[] = [];

    const processedIds = new Set<string>();

    for (const item of entry.uniqueItems) {
      if (processedIds.has(item.id)) continue;
      processedIds.add(item.id);

      const isDone = item.completed || item.status === 'done';
      if (isDone) {
        completedItems.push(item);
        continue;
      }

      if (item.type === 'note') {
        noteItems.push(item);
        continue;
      }

      // Task
      const isDue = item.dueDate === selectedDate;
      const isPlanned = item.plannedDate === selectedDate;

      if (isDue) {
        // Shown in deadlines group (with dual meaning badge if planned as well)
        dueItems.push(item);
      } else if (isPlanned) {
        plannedItems.push(item);
      }
    }

    return {
      dueItems,
      plannedItems,
      noteItems,
      completedItems,
      totalUniqueCount: processedIds.size,
    };
  }, [itemsByDate, selectedDate]);

  // Handlers for date selection with draft protection
  const handleSelectDate = (newDate: string) => {
    if (newDate === selectedDate) return;

    if (draftTitle.trim() || draftDescription.trim()) {
      // User has an active unfinished draft; prompt before discarding or switching
      setPendingDateChange({
        previousDate: selectedDate,
        newDate,
      });
      return;
    }

    setSelectedDate(newDate);
  };

  const handleConfirmDateChangeDiscardDraft = () => {
    if (pendingDateChange) {
      setSelectedDate(pendingDateChange.newDate);
      setDraftTitle('');
      setDraftDescription('');
      setDraftTags('');
      setDraftProjectId('');
      setIsDraftExpanded(false);
      setPendingDateChange(null);
    }
  };

  const handleCancelDateChangeKeepDraft = () => {
    setPendingDateChange(null);
  };

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
    const tG = parseDateString(todayStr) || { year: 2026, month: 11, day: 5 };
    setJYear(tJ.jy);
    setJMonth(tJ.jm);
    setGYear(tG.year);
    setGMonth(tG.month);
  };

  // Mobile week navigation
  const handlePrevWeek = () => {
    const newDate = addDays(selectedDate, -7);
    handleSelectDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = addDays(selectedDate, 7);
    handleSelectDate(newDate);
  };

  // Switch calendar system: NEVER alters the underlying selectedDate!
  const handleSwitchCalendarSystem = (newSystem: CalendarSystem) => {
    if (newSystem === calendarSystem) return;
    setCalendarSystem(newSystem);

    if (newSystem === 'jalali') {
      const j = gregorianToJalali(selectedDate);
      setJYear(j.jy);
      setJMonth(j.jm);
    } else {
      const g = parseDateString(selectedDate) || { year: 2026, month: 11, day: 5 };
      setGYear(g.year);
      setGMonth(g.month);
    }
  };

  const handleCaptureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftTitle.trim()) return;

    const finalProjectId = disableProjectPicker ? defaultProjectId : draftProjectId;
    const chosenProj = projects.find((p) => p.id === finalProjectId);
    const parsedTags = draftTags
      .split(/[,،]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    onAddItem({
      type: draftType,
      title: draftTitle.trim(),
      description: draftDescription.trim() || undefined,
      completed: false,
      status: draftType === 'task' ? 'todo' : undefined,
      projectId: finalProjectId || undefined,
      project: chosenProj?.name,
      tags: parsedTags,
      plannedDate: selectedDate, // Explicitly assigned to selected day!
      inToday: selectedDate === todayStr,
      destination: selectedDate === todayStr ? 'today' : undefined,
    });

    setDraftTitle('');
    setDraftDescription('');
    setDraftTags('');
    setDraftProjectId(defaultProjectId || '');
    setIsDraftExpanded(false);
  };

  const monthLabel =
    calendarSystem === 'jalali'
      ? `${PERSIAN_MONTH_NAMES[jMonth - 1]} ${toPersianDigits(jYear)}`
      : `${GREGORIAN_MONTH_NAMES_FA[gMonth - 1]} ${toPersianDigits(gYear)}`;

  const selectedDateFormatted = formatJalaliDate(selectedDate, 'full');

  const activeProjects = useMemo(() => projects.filter((p) => !p.archived), [projects]);

  // Items with neither plannedDate nor dueDate (for collapsible undated items section)
  const undatedItems = useMemo(() => {
    return items.filter((item) => !item.recurrence && !item.plannedDate && !item.dueDate);
  }, [items]);

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-150">
      {/* 1. CALENDAR TOOLBAR (Shared for both Desktop and Mobile) */}
      <div className="bg-[#15161D] border border-[#232532] rounded-2xl p-3 sm:p-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Month & Year Title with Navigation Buttons */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-[#111218] p-0.5 rounded-xl border border-[#242634]">
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#20222E] rounded-lg transition-colors cursor-pointer"
                aria-label="ماه بعد"
                title="ماه بعد"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#20222E] rounded-lg transition-colors cursor-pointer"
                aria-label="ماه قبل"
                title="ماه قبل"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {monthLabel}
            </h2>

            <button
              type="button"
              onClick={handleGoToToday}
              className="text-xs font-medium text-violet-300 hover:text-white bg-violet-950/40 hover:bg-violet-900/50 border border-violet-800/40 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              امروز
            </button>
          </div>

          {/* Compact Calendar System Switcher */}
          <div className="flex items-center self-start sm:self-auto gap-2">
            <span className="text-xs text-gray-400">تقویم:</span>
            <div className="flex items-center p-0.5 bg-[#111218] rounded-xl border border-[#242634]">
              <button
                type="button"
                onClick={() => handleSwitchCalendarSystem('jalali')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  calendarSystem === 'jalali'
                    ? 'bg-[#27243B] text-violet-200 border border-violet-500/30 shadow-xs'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                خورشیدی
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
                میلادی
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Draft Protection Banner */}
      {pendingDateChange && (
        <div className="p-3.5 bg-amber-950/30 border border-amber-800/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-300 animate-in fade-in duration-150">
          <div className="flex items-start sm:items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              یک پیش‌نویس ذخیره‌نشده برای تاریخ قبلی دارید. مایلید ادامه دهید یا پیش‌نویس را نادیده بگیرید؟
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleConfirmDateChangeDiscardDraft}
              className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors cursor-pointer font-medium"
            >
              حذف پیش‌نویس و تغییر روز
            </button>
            <button
              type="button"
              onClick={handleCancelDateChangeKeepDraft}
              className="px-3 py-1.5 bg-[#20222E] hover:bg-[#282B3A] text-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              ادامه برای روز قبلی
            </button>
          </div>
        </div>
      )}

      {/* 2. MOBILE COMPACT WEEK STRIP (Visible only on narrow screens) */}
      <div className="lg:hidden bg-[#15161D] border border-[#232532] rounded-2xl p-3 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          {/* Toggle Full Month button */}
          <button
            type="button"
            onClick={() => setIsMobileMonthExpanded(!isMobileMonthExpanded)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-200 hover:text-white cursor-pointer"
          >
            <span>{monthLabel}</span>
            {isMobileMonthExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-violet-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-violet-400" />
            )}
            <span className="text-[10px] text-gray-400 font-normal">
              ({isMobileMonthExpanded ? 'بستن تقویم ماه' : 'نمایش کل ماه'})
            </span>
          </button>

          {/* Week navigation buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleNextWeek}
              className="p-1 text-gray-400 hover:text-white hover:bg-[#20222E] rounded-md transition-colors cursor-pointer"
              title="هفته بعد"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handlePrevWeek}
              className="p-1 text-gray-400 hover:text-white hover:bg-[#20222E] rounded-md transition-colors cursor-pointer"
              title="هفته قبل"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 7-Day Week Strip */}
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {mobileWeekDays.map((dStr, idx) => {
            const isSelected = selectedDate === dStr;
            const isToday = isTodayDate(dStr, todayStr);
            const entry = itemsByDate.get(dStr);
            const j = gregorianToJalali(dStr);
            const g = parseDateString(dStr);
            const dayNum = calendarSystem === 'jalali' ? j.jd : g?.day || 1;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectDate(dStr)}
                className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-violet-600 text-white shadow-md'
                    : isToday
                      ? 'bg-[#1C1A27] border border-violet-500/50 text-violet-300'
                      : 'bg-[#181920] border border-[#252733] text-gray-300 hover:bg-[#1E1F29]'
                }`}
              >
                <span className="text-[10px] text-gray-400 font-medium">
                  {PERSIAN_WEEKDAY_SHORT[idx]}
                </span>
                <span className="text-xs font-bold">{toPersianDigits(dayNum)}</span>

                {/* Dots / Indicators */}
                <div className="flex items-center gap-1 h-2 mt-0.5">
                  {entry && entry.openTasksCount > 0 ? (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-violet-400'}`}
                      title={`${toPersianDigits(entry.openTasksCount)} تسک باز`}
                    />
                  ) : null}
                  {entry && entry.notesCount > 0 ? (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-blue-200' : 'bg-blue-400'}`}
                      title={`${toPersianDigits(entry.notesCount)} یادداشت`}
                    />
                  ) : null}
                  {entry && entry.dueTasks.length > 0 ? (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-200' : 'bg-amber-400'}`}
                      title="مهلت تحویل"
                    />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        {/* Collapsible Full Month Grid on Mobile */}
        {isMobileMonthExpanded && (
          <div className="pt-3 border-t border-[#232532] animate-in fade-in duration-150">
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-gray-400 pb-1.5">
              {PERSIAN_WEEKDAY_SHORT.map((wd, i) => (
                <span key={i} className={i === 6 ? 'text-amber-300/80' : ''}>
                  {wd}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((cell, idx) => {
                const isSelected = selectedDate === cell.dateStr;
                const isFriday = idx % 7 === 6;
                const entry = itemsByDate.get(cell.dateStr);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      handleSelectDate(cell.dateStr);
                      setIsMobileMonthExpanded(false);
                    }}
                    className={`h-10 rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-violet-600 text-white font-bold shadow-xs'
                        : cell.isToday
                          ? 'bg-[#1D1B28] border border-violet-500/50 text-violet-300'
                          : !cell.isCurrentMonth
                            ? 'text-gray-400 opacity-35'
                            : isFriday
                              ? 'text-amber-200/80 bg-[#181920]'
                              : 'text-gray-200 bg-[#181920]'
                    }`}
                  >
                    <span>{toPersianDigits(cell.dayNumber)}</span>
                    {entry && entry.eligiblePreviews.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. MAIN DESKTOP GRID (60% Month Grid on Right, 40% Agenda on Left in RTL) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* RIGHT COLUMN: MONTH GRID (Visible on desktop; ~60% of layout) */}
        <div className="hidden lg:block lg:col-span-7 bg-[#15161D] border border-[#232532] rounded-2xl p-4 shadow-xs">
          {/* Weekday headers: Saturday first */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-gray-400 pb-2 border-b border-[#232532] select-none">
            {PERSIAN_WEEKDAY_SHORT.map((wd, i) => (
              <span
                key={i}
                className={i === 6 ? 'text-amber-200/80' : 'text-gray-400'}
                title={wd}
              >
                {wd}
              </span>
            ))}
          </div>

          {/* Month Day Cells Grid (Natural cell height, no clipped weeks) */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 pt-2">
            {cells.map((cell, idx) => {
              const isSelected = selectedDate === cell.dateStr;
              const isFriday = idx % 7 === 6;
              const entry = itemsByDate.get(cell.dateStr);
              const eligiblePreviews = entry?.eligiblePreviews || [];
              const openCount = entry?.openTasksCount || 0;
              const noteCount = entry?.notesCount || 0;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDate(cell.dateStr)}
                  className={`group relative min-h-[56px] sm:min-h-[62px] p-1.5 sm:p-2 rounded-lg sm:rounded-xl border flex flex-col justify-between text-right transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-violet-950/50 border-violet-500 shadow-sm ring-1 ring-violet-500/40 z-10'
                      : cell.isToday
                        ? 'bg-[#1A1828] border-violet-500/50 hover:border-violet-400'
                        : !cell.isCurrentMonth
                          ? 'bg-[#121318]/30 border-transparent opacity-30 hover:opacity-60'
                          : isFriday
                            ? 'bg-[#161720] border-[#222432] hover:bg-[#1B1D28]'
                            : 'bg-[#161720] border-[#222432] hover:bg-[#1B1D28]'
                  }`}
                >
                  {/* Top Bar inside cell: Day number + Today Tag */}
                  <div className="w-full flex items-center justify-between">
                    <span
                      className={`text-xs font-bold leading-none ${
                        isSelected
                          ? 'text-white'
                          : cell.isToday
                            ? 'text-violet-300'
                            : isFriday
                              ? 'text-amber-200/80'
                              : 'text-gray-300'
                      }`}
                    >
                      {toPersianDigits(cell.dayNumber)}
                    </span>

                    {/* Today marker badge */}
                    {cell.isToday && (
                      <span className="text-[9px] font-medium bg-violet-600/30 text-violet-300 border border-violet-500/30 px-1 py-0.2 rounded-sm leading-none">
                        امروز
                      </span>
                    )}
                  </div>

                  {/* Cell Body: Desktop title previews (Max 2 incomplete titles, then +N) */}
                  {!isSimpleMode && cell.isCurrentMonth ? (
                    <div className="w-full mt-1 space-y-1">
                      {eligiblePreviews.slice(0, 2).map((item) => {
                        const isDue = item.dueDate === cell.dateStr;
                        const isNote = item.type === 'note';

                        return (
                          <div
                            key={item.id}
                            className={`flex items-center gap-1 text-[10px] truncate rounded px-1 py-0.5 ${
                              isDue
                                ? 'text-amber-300 bg-amber-950/40 border border-amber-800/30'
                                : isNote
                                  ? 'text-blue-300 bg-blue-950/40 border border-blue-800/30'
                                  : 'text-violet-200 bg-violet-950/40 border border-violet-800/30'
                            }`}
                            title={item.title}
                          >
                            {isDue ? (
                              <Clock className="w-2.5 h-2.5 shrink-0 text-amber-400" />
                            ) : isNote ? (
                              <FileText className="w-2.5 h-2.5 shrink-0 text-blue-400" />
                            ) : (
                              <CheckCircle2 className="w-2.5 h-2.5 shrink-0 text-violet-400" />
                            )}
                            <span className="truncate">{item.title}</span>
                          </div>
                        );
                      })}

                      {eligiblePreviews.length > 2 && (
                        <span className="text-[9px] text-gray-400 font-medium block pr-0.5">
                          +{toPersianDigits(eligiblePreviews.length - 2)} مورد
                        </span>
                      )}
                    </div>
                  ) : (
                    /* Simple mode or when counts preferred: distinctly labeled counts */
                    (openCount > 0 || noteCount > 0) && (
                      <div className="flex items-center gap-1 flex-wrap mt-auto pt-1">
                        {openCount > 0 && (
                          <span
                            className="inline-flex items-center gap-1 text-[9px] font-medium text-violet-300 bg-violet-950/60 border border-violet-800/40 px-1.5 py-0.5 rounded"
                            title={`${toPersianDigits(openCount)} تسک باز`}
                          >
                            <CheckCircle2 className="w-2.5 h-2.5 text-violet-400 shrink-0" />
                            <span>{toPersianDigits(openCount)} تسک</span>
                          </span>
                        )}
                        {noteCount > 0 && (
                          <span
                            className="inline-flex items-center gap-1 text-[9px] font-medium text-blue-300 bg-blue-950/60 border border-blue-800/40 px-1.5 py-0.5 rounded"
                            title={`${toPersianDigits(noteCount)} یادداشت`}
                          >
                            <FileText className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                            <span>{toPersianDigits(noteCount)} یادداشت</span>
                          </span>
                        )}
                      </div>
                    )
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 pt-3 mt-3 border-t border-[#232532] text-[11px] text-gray-400 select-none">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-violet-400" />
              <span>روز انجام</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>مهلت تحویل</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-blue-400" />
              <span>یادداشت</span>
            </div>
          </div>
        </div>

        {/* LEFT COLUMN: SELECTED-DAY AGENDA (~40% of layout, main page scroll) */}
        <div className="lg:col-span-5 bg-[#15161D] border border-[#232532] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
          {/* Agenda Header (Single Primary Persian Date + Small Gregorian) */}
          <div className="border-b border-[#232532] pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-violet-400 shrink-0" />
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {selectedDateFormatted}
                </h3>
              </div>

              {isTodayDate(selectedDate, todayStr) && (
                <span className="text-[10px] text-violet-300 bg-violet-950/40 border border-violet-800/40 px-2 py-0.5 rounded-full font-medium">
                  امروز
                </span>
              )}
            </div>

            <div className="text-[11px] text-gray-500 font-mono mt-1">
              {selectedDate}
            </div>
          </div>

          {/* Quick Capture Panel inside Agenda: Compact stacked layout preventing horizontal overflow */}
          <form
            onSubmit={handleCaptureSubmit}
            className="p-3 bg-[#121318] rounded-xl border border-[#232532] space-y-2.5"
          >
            {/* Row 1: Short Persian selected-date label + Task/note selector */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-gray-200">
                ثبت برای {formatJalaliDate(selectedDate, 'short')}
              </span>

              {/* Task/Note Selector */}
              <div className="inline-flex items-center p-0.5 bg-[#171820] rounded-lg border border-[#262835] text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setDraftType('task')}
                  className={`px-2.5 py-0.5 rounded cursor-pointer transition-colors ${
                    draftType === 'task'
                      ? 'bg-[#29263E] text-violet-200 font-medium'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  تسک
                </button>
                <button
                  type="button"
                  onClick={() => setDraftType('note')}
                  className={`px-2.5 py-0.5 rounded cursor-pointer transition-colors ${
                    draftType === 'note'
                      ? 'bg-[#29263E] text-violet-200 font-medium'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  یادداشت
                </button>
              </div>
            </div>

            {/* Row 2: Full-width title input */}
            <div className="w-full">
              <input
                type="text"
                dir="auto"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder={
                  draftType === 'task'
                    ? 'عنوان تسک جدید برای این روز...'
                    : 'عنوان یادداشت جدید...'
                }
                className="w-full bg-[#16171E] border border-[#262835] focus:border-violet-500 rounded-lg px-3 py-2 text-xs sm:text-sm text-gray-100 placeholder-gray-500 focus:outline-hidden transition-colors"
              />
            </div>

            {/* Row 3: Action row with Details toggle and Submit */}
            <div className="flex items-center justify-between gap-2">
              {!isSimpleMode ? (
                <button
                  type="button"
                  onClick={() => setIsDraftExpanded(!isDraftExpanded)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-gray-400 hover:text-gray-200 bg-[#16171E] hover:bg-[#1C1D27] border border-[#262835] rounded-lg cursor-pointer transition-colors"
                  title="افزودن توضیحات و پروژه"
                >
                  <span>جزئیات</span>
                  {isDraftExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-violet-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-violet-400" />
                  )}
                </button>
              ) : (
                <div />
              )}

              <button
                type="submit"
                disabled={!draftTitle.trim()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-35 rounded-lg transition-colors cursor-pointer shadow-xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ثبت</span>
              </button>
            </div>

            {/* Expandable secondary fields (Draft preserved when expanding/collapsing) */}
            {isDraftExpanded && !isSimpleMode && (
              <div className="pt-2.5 border-t border-[#20222D] space-y-2.5 animate-in fade-in duration-150">
                <textarea
                  dir="auto"
                  rows={2}
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  placeholder="توضیحات تکمیلی (اختیاری)..."
                  className="w-full px-3 py-1.5 bg-[#16171E] border border-[#252733] rounded-lg text-xs text-gray-200 placeholder-gray-500 outline-hidden focus:border-violet-500 resize-none leading-relaxed"
                />

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {/* Project selector */}
                  {!disableProjectPicker ? (
                    <select
                      value={draftProjectId}
                      onChange={(e) => setDraftProjectId(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-[#16171E] border border-[#252733] rounded-lg text-xs text-gray-300 outline-hidden focus:border-violet-500"
                    >
                      <option value="">بدون پروژه</option>
                      {activeProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex-1 px-2.5 py-1.5 bg-[#16171E] border border-[#252733] rounded-lg text-xs text-gray-400">
                      پروژه: {projects.find((p) => p.id === defaultProjectId)?.name || 'پروژه جاری'}
                    </div>
                  )}

                  {/* Tags */}
                  <input
                    type="text"
                    dir="auto"
                    value={draftTags}
                    onChange={(e) => setDraftTags(e.target.value)}
                    placeholder="برچسب‌ها (با کاما)"
                    className="flex-1 px-2.5 py-1.5 bg-[#16171E] border border-[#252733] rounded-lg text-xs text-gray-300 placeholder-gray-500 outline-hidden focus:border-violet-500"
                  />
                </div>
              </div>
            )}
          </form>

          {/* Agenda Grouped Content (No nested scrolling; flows naturally) */}
          <div className="space-y-4 pt-1">
            {/* GROUP 1: Deadlines for this Day (مهلت‌های این روز) */}
            {selectedDayData.dueItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    مهلت‌های این روز ({toPersianDigits(selectedDayData.dueItems.length)})
                  </span>
                </div>
                <div className="space-y-2">
                  {selectedDayData.dueItems.map((item) => {
                    const isAlsoPlannedToday = item.plannedDate === selectedDate;
                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectItem(item)}
                        className="group p-3 rounded-xl bg-[#181920] border border-amber-800/40 hover:bg-[#1E1F29] hover:border-amber-700/60 transition-all text-right cursor-pointer select-none"
                      >
                        <div className="flex items-start gap-2.5">
                          <button
                            type="button"
                            onClick={(e) => onToggleComplete(item.id, e)}
                            className="w-4 h-4 mt-0.5 rounded border border-gray-500/70 hover:border-violet-400 flex items-center justify-center cursor-pointer shrink-0"
                            aria-label="تکمیل تسک"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs sm:text-sm font-medium text-gray-100 group-hover:text-white leading-relaxed">
                              {item.title}
                            </h4>
                            {item.description && !isSimpleMode && (
                              <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                                {item.description}
                              </p>
                            )}
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.5 rounded">
                                <Clock className="w-2.5 h-2.5" />
                                <span>مهلت تحویل</span>
                              </span>
                              {isAlsoPlannedToday && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-violet-300 bg-violet-950/40 border border-violet-800/40 px-1.5 py-0.5 rounded">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  <span>روز انجام</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* GROUP 2: Planned Tasks for this Day (برنامه انجام) */}
            {selectedDayData.plannedItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
                  <span>
                    برنامه انجام ({toPersianDigits(selectedDayData.plannedItems.length)})
                  </span>
                </div>
                <div className="space-y-2">
                  {selectedDayData.plannedItems.map((item) => (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectItem(item)}
                      className="group p-3 rounded-xl bg-[#181920] border border-[#262834] hover:bg-[#1E1F29] hover:border-[#353748] transition-all text-right cursor-pointer select-none"
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={(e) => onToggleComplete(item.id, e)}
                          className="w-4 h-4 mt-0.5 rounded border border-gray-500/70 hover:border-violet-400 flex items-center justify-center cursor-pointer shrink-0"
                          aria-label="تکمیل تسک"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs sm:text-sm font-medium text-gray-100 group-hover:text-white leading-relaxed">
                            {item.title}
                          </h4>
                          {item.description && !isSimpleMode && (
                            <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                              {item.description}
                            </p>
                          )}
                          {item.project && !isSimpleMode && (
                            <span className="text-[10px] text-gray-400 mt-1 block">
                              {item.project}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* GROUP 3: Notes for this Day (یادداشت‌ها - No completion checkbox) */}
            {selectedDayData.noteItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-300">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>
                    یادداشت‌ها ({toPersianDigits(selectedDayData.noteItems.length)})
                  </span>
                </div>
                <div className="space-y-2">
                  {selectedDayData.noteItems.map((item) => (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectItem(item)}
                      className="group p-3 rounded-xl bg-[#181920] border border-[#262834] hover:bg-[#1E1F29] hover:border-[#353748] transition-all text-right cursor-pointer select-none"
                    >
                      <div className="flex items-start gap-2.5">
                        <FileText className="w-4 h-4 text-blue-400/80 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs sm:text-sm font-medium text-gray-100 group-hover:text-white leading-relaxed">
                            {item.title}
                          </h4>
                          {item.description && !isSimpleMode && (
                            <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* GROUP 4: Completed Items (انجام‌شده‌ها - Collapsed by default) */}
            {selectedDayData.completedItems.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#232532]">
                <button
                  type="button"
                  onClick={() => setIsCompletedOpen(!isCompletedOpen)}
                  className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-gray-200 transition-colors cursor-pointer py-1"
                >
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      انجام‌شده‌ها ({toPersianDigits(selectedDayData.completedItems.length)})
                    </span>
                  </div>
                  {isCompletedOpen ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {isCompletedOpen && (
                  <div className="space-y-2 animate-in fade-in duration-150">
                    {selectedDayData.completedItems.map((item) => (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectItem(item)}
                        className="p-2.5 rounded-xl bg-[#15161C]/70 border border-[#23242E] opacity-75 hover:opacity-100 transition-all text-right cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => onToggleComplete(item.id, e)}
                            className="w-4 h-4 rounded bg-violet-600 border border-violet-500 text-white flex items-center justify-center cursor-pointer shrink-0"
                            aria-label="بازگردانی به انجام نشده"
                          >
                            <Check className="w-3 h-3 stroke-[2.5]" />
                          </button>
                          <span className="text-xs text-gray-400 line-through truncate">
                            {item.title}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {selectedDayData.totalUniqueCount === 0 && (
              <div className="py-8 text-center rounded-xl border border-dashed border-[#232532] text-xs text-gray-400 space-y-1">
                <p>هیچ تسک یا یادداشتی برای این تاریخ وجود ندارد.</p>
                <p className="text-[11px] text-gray-400">
                  می‌توانید با کادر بالا اولین مورد را برای این روز ثبت کنید.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Undated Items Section ("کارهای بدون تاریخ") */}
      {undatedItems.length > 0 && (
        <div className="bg-[#15161D] border border-[#232532] rounded-2xl p-4 shadow-xs space-y-3">
          <button
            type="button"
            onClick={() => setIsUndatedOpen(!isUndatedOpen)}
            className="w-full flex items-center justify-between text-xs font-semibold text-gray-300 hover:text-white transition-colors cursor-pointer select-none"
            aria-expanded={isUndatedOpen}
          >
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-violet-400" />
              <span>کارهای بدون تاریخ ({toPersianDigits(undatedItems.length)})</span>
              <span className="text-[11px] text-gray-400 font-normal hidden sm:inline">
                (فاقد روز انجام و مهلت تحویل)
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <span className="text-[11px]">{isUndatedOpen ? 'بستن' : 'مشاهده'}</span>
              {isUndatedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {isUndatedOpen && (
            <div className="pt-2 border-t border-[#232532] space-y-2.5 animate-in fade-in duration-150">
              <p className="text-[11px] text-gray-400">
                برای زمان‌بندی هر مورد، روی آن کلیک کنید و در پنجره ویرایش «روز انجام» را مشخص نمایید.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {undatedItems.map((item) => (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectItem(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectItem(item);
                      }
                    }}
                    className="p-2.5 rounded-xl bg-[#181920] border border-[#262834] hover:bg-[#1E1F29] hover:border-[#353748] transition-all text-right cursor-pointer flex items-start justify-between gap-2 select-none"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      {item.type === 'task' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <h5 className="text-xs font-medium text-gray-200 truncate">{item.title}</h5>
                        {item.project && !isSimpleMode && (
                          <span className="text-[10px] text-gray-400 block truncate mt-0.5">
                            {item.project}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-violet-300 hover:text-violet-200 bg-violet-950/40 border border-violet-800/40 px-2 py-0.5 rounded-md shrink-0">
                      تنظیم تاریخ
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
