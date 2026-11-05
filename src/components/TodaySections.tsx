import React, { useState } from 'react';
import { Item, Project, FilterType } from '../types';
import { TaskCard } from './TaskCard';
import { CompletedSection } from './CompletedSection';
import { EmptyState } from './EmptyState';
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  History,
  CalendarCheck,
} from 'lucide-react';
import { toPersianDigits } from '../utils/date';

interface TodaySectionsProps {
  overdueDeadlines: Item[];
  overduePlanned: Item[];
  todayActiveItems: Item[];
  todayCompletedItems: Item[];
  projects: Project[];
  isSimpleMode: boolean;
  filter: FilterType;
  searchQuery: string;
  onClearSearch: () => void;
  onResetFilter: () => void;
  onToggleComplete: (id: string, e: React.MouseEvent) => void;
  onSelectItem: (item: Item) => void;
  onMoveToToday: (item: Item, e: React.MouseEvent) => void;
  onOpenSeriesModal?: (seriesId: string) => void;
  onSkipOccurrence?: (item: Item, e: React.MouseEvent) => void;
}

export const TodaySections: React.FC<TodaySectionsProps> = ({
  overdueDeadlines,
  overduePlanned,
  todayActiveItems,
  todayCompletedItems,
  projects,
  isSimpleMode,
  filter,
  searchQuery,
  onClearSearch,
  onResetFilter,
  onToggleComplete,
  onSelectItem,
  onMoveToToday,
  onOpenSeriesModal,
  onSkipOccurrence,
}) => {
  const [isOverduePlannedOpen, setIsOverduePlannedOpen] = useState(true);
  const [isOverdueDeadlinesOpen, setIsOverdueDeadlinesOpen] = useState(true);

  const hasAnyItems =
    overdueDeadlines.length > 0 ||
    overduePlanned.length > 0 ||
    todayActiveItems.length > 0 ||
    todayCompletedItems.length > 0;

  return (
    <div className="space-y-5">
      {/* SECTION 1: Overdue Deadlines (مهلت‌های تحویل گذشته) */}
      {overdueDeadlines.length > 0 && (
        <section aria-label="مهلت‌های گذشته" className="space-y-2">
          <button
            type="button"
            onClick={() => setIsOverdueDeadlinesOpen(!isOverdueDeadlinesOpen)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-rose-950/20 border border-rose-900/30 text-rose-300 hover:bg-rose-950/30 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="text-xs font-semibold">
                مهلت‌های گذشته ({toPersianDigits(overdueDeadlines.length)} مورد)
              </span>
            </div>
            {isOverdueDeadlinesOpen ? (
              <ChevronUp className="w-4 h-4 text-rose-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-rose-400" />
            )}
          </button>

          {isOverdueDeadlinesOpen && (
            <div className="space-y-2 animate-in fade-in duration-150">
              {overdueDeadlines.map((item) => (
                <TaskCard
                  key={item.id}
                  item={item}
                  projects={projects}
                  isSimpleMode={isSimpleMode}
                  onToggleComplete={onToggleComplete}
                  onClick={onSelectItem}
                  onMoveToToday={onMoveToToday}
                  showMoveToTodayAction={!item.plannedDate || item.plannedDate < item.dueDate!}
                  onOpenSeriesModal={onOpenSeriesModal}
                  onSkipOccurrence={onSkipOccurrence}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* SECTION 2: Overdue Planned Tasks (برنامه‌های انجام‌نشده قبلی) */}
      {overduePlanned.length > 0 && (
        <section aria-label="برنامه‌های انجام‌نشده قبلی" className="space-y-2">
          <button
            type="button"
            onClick={() => setIsOverduePlannedOpen(!isOverduePlannedOpen)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-amber-950/20 border border-amber-900/30 text-amber-300 hover:bg-amber-950/30 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-semibold">
                برنامه‌های انجام‌نشده قبلی ({toPersianDigits(overduePlanned.length)} مورد)
              </span>
              <span className="text-[10px] text-amber-400/70 hidden sm:inline">
                (تاریخ انجام قبلاً سپری شده ولی تسک کامل نشده است)
              </span>
            </div>
            {isOverduePlannedOpen ? (
              <ChevronUp className="w-4 h-4 text-amber-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-amber-400" />
            )}
          </button>

          {isOverduePlannedOpen && (
            <div className="space-y-2 animate-in fade-in duration-150">
              {overduePlanned.map((item) => (
                <TaskCard
                  key={item.id}
                  item={item}
                  projects={projects}
                  isSimpleMode={isSimpleMode}
                  onToggleComplete={onToggleComplete}
                  onClick={onSelectItem}
                  onMoveToToday={onMoveToToday}
                  showMoveToTodayAction={true}
                  onOpenSeriesModal={onOpenSeriesModal}
                  onSkipOccurrence={onSkipOccurrence}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* SECTION 3: Main Today List (برنامه‌های امروز + مهلت‌های امروز) */}
      <section aria-label="کارهای امروز" className="space-y-2">
        {(overdueDeadlines.length > 0 || overduePlanned.length > 0) && (
          <div className="flex items-center gap-1.5 px-1 pt-1 text-xs font-semibold text-gray-300">
            <CalendarCheck className="w-4 h-4 text-violet-400" />
            <span>برنامه‌های امروز ({toPersianDigits(todayActiveItems.length)})</span>
          </div>
        )}

        {todayActiveItems.length > 0 ? (
          todayActiveItems.map((item) => (
            <TaskCard
              key={item.id}
              item={item}
              projects={projects}
              isSimpleMode={isSimpleMode}
              onToggleComplete={onToggleComplete}
              onClick={onSelectItem}
              onOpenSeriesModal={onOpenSeriesModal}
              onSkipOccurrence={onSkipOccurrence}
            />
          ))
        ) : !hasAnyItems ? (
          searchQuery ? (
            <EmptyState
              type="no-search-results"
              searchQuery={searchQuery}
              onClearSearch={onClearSearch}
            />
          ) : filter !== 'all' ? (
            <EmptyState type="no-filter-results" onResetFilter={onResetFilter} />
          ) : (
            <EmptyState type="no-items" />
          )
        ) : todayActiveItems.length === 0 && (overdueDeadlines.length > 0 || overduePlanned.length > 0) ? (
          <div className="py-6 text-center rounded-xl border border-dashed border-[#232532] text-xs text-gray-400">
            برای امروز کار زمان‌بندی‌شده دیگری باقی نمانده است.
          </div>
        ) : null}
      </section>

      {/* SECTION 4: Completed Tasks Section (Collapsible) */}
      <CompletedSection
        items={todayCompletedItems}
        isSimpleMode={isSimpleMode}
        onToggleComplete={onToggleComplete}
        onClickItem={onSelectItem}
      />
    </div>
  );
};
