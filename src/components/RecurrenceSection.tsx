import React, { useState } from 'react';
import {
  RecurrenceRule,
  RecurrenceFrequency,
  MonthlyPolicy,
  RecurrenceCalendarBasis,
  RecurrenceEndType,
} from '../types';
import {
  Repeat,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  AlertTriangle,
  Info,
  Check,
} from 'lucide-react';
import {
  getTehranTodayDateString,
  formatJalaliDate,
  formatGregorianDate,
  toPersianDigits,
  parseDateString,
  gregorianToJalali,
  addDays,
  PERSIAN_WEEKDAY_NAMES,
} from '../utils/date';
import {
  getRecurrenceSummaryFa,
  generateNextOccurrences,
  calculateDeadlineOffset,
  getSaturdayFirstWeekday,
} from '../utils/recurrence';
import { DatePickerModal } from './DatePickerModal';

interface RecurrenceSectionProps {
  rule: RecurrenceRule | undefined;
  onChange: (rule: RecurrenceRule | undefined) => void;
  plannedDate: string | undefined;
  dueDate: string | undefined;
  onSetPlannedDate: (dateStr: string) => void;
  isOccurrence?: boolean;
}

export const RecurrenceSection: React.FC<RecurrenceSectionProps> = ({
  rule,
  onChange,
  plannedDate,
  dueDate,
  onSetPlannedDate,
  isOccurrence = false,
}) => {
  const isEnabled = Boolean(rule);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isEndDateModalOpen, setIsEndDateModalOpen] = useState(false);

  const todayStr = getTehranTodayDateString();
  const effectiveStartDate = plannedDate || todayStr;
  const startJalali = gregorianToJalali(effectiveStartDate);
  const startGregorian = parseDateString(effectiveStartDate) || { year: 2026, month: 1, day: 1 };

  const handleToggleEnable = () => {
    if (isEnabled) {
      onChange(undefined);
    } else {
      if (!plannedDate) {
        onSetPlannedDate(todayStr);
      }
      const initialWeekday = getSaturdayFirstWeekday(effectiveStartDate);
      const defaultRule: RecurrenceRule = {
        frequency: 'weekly',
        interval: 1,
        weekdays: [initialWeekday],
        calendarBasis: 'jalali',
        monthDay: startJalali.jd,
        monthlyPolicy: 'last_day',
        endType: 'never',
      };
      onChange(defaultRule);
      setIsExpanded(true);
    }
  };

  const updateRule = (patch: Partial<RecurrenceRule>) => {
    if (!rule) return;
    onChange({ ...rule, ...patch });
  };

  const deadlineOffset = calculateDeadlineOffset(plannedDate, dueDate);

  const nextThree = rule && plannedDate
    ? generateNextOccurrences(rule, plannedDate, 3)
    : [];

  return (
    <div className="p-3.5 bg-[#14151C] rounded-xl border border-[#262835] space-y-3 select-none">
      {/* Header & Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-violet-950/40 border border-violet-800/40 flex items-center justify-center text-violet-400">
            <Repeat className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-200 block">تکرار کار (Recurring)</span>
            <span className="text-[10px] text-gray-500">
              {isEnabled ? 'الگوی تکرار فعال است' : 'این تسک به صورت خودکار تکرار نمی‌شود'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEnabled && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              aria-label={isExpanded ? 'جمع کردن تنظیمات' : 'باز کردن تنظیمات'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleEnable}
            className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              isEnabled
                ? 'bg-violet-950/50 text-violet-300 border-violet-600/50 shadow-xs'
                : 'bg-[#181920] text-gray-400 border-[#2B2D3A] hover:text-gray-200 hover:bg-[#20222D]'
            }`}
          >
            {isEnabled ? 'فعال (خاموش کردن)' : 'تنظیم تکرار'}
          </button>
        </div>
      </div>

      {/* Recurrence Configuration Panel */}
      {isEnabled && rule && isExpanded && (
        <div className="pt-2 border-t border-[#20222D] space-y-3.5 text-xs text-gray-300">
          {/* Missing Planned Date Warning */}
          {!plannedDate && (
            <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 flex items-center justify-between gap-2 text-xs text-amber-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>برای شروع تکرار، تعیین «روز انجام» الزامی است.</span>
              </div>
              <button
                type="button"
                onClick={() => onSetPlannedDate(todayStr)}
                className="px-2.5 py-1 text-[11px] font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-md shrink-0 cursor-pointer"
              >
                تنظیم برای امروز
              </button>
            </div>
          )}

          {/* 1. Frequency Selector */}
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1.5">الگوی تکرار</label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#121318] rounded-xl border border-[#262835]">
              {(['daily', 'weekly', 'monthly'] as RecurrenceFrequency[]).map((freq) => {
                const isSelected = rule.frequency === freq;
                const labels: Record<RecurrenceFrequency, string> = {
                  daily: 'روزانه',
                  weekly: 'هفتگی',
                  monthly: 'ماهانه',
                };
                return (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => {
                      if (freq === 'weekly' && (!rule.weekdays || rule.weekdays.length === 0)) {
                        updateRule({ frequency: freq, weekdays: [getSaturdayFirstWeekday(effectiveStartDate)] });
                      } else if (freq === 'monthly' && rule.monthDay === undefined) {
                        updateRule({
                          frequency: freq,
                          calendarBasis: rule.calendarBasis || 'jalali',
                          monthDay: rule.calendarBasis === 'gregorian' ? startGregorian.day : startJalali.jd,
                          monthlyPolicy: rule.monthlyPolicy || 'last_day',
                        });
                      } else {
                        updateRule({ frequency: freq });
                      }
                    }}
                    className={`py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#27243B] text-white border border-violet-500/40 shadow-xs'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {labels[freq]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Interval Input */}
          <div className="flex items-center justify-between p-2.5 bg-[#121318] rounded-xl border border-[#262835]">
            <span className="text-gray-300">فاصله تکرار:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateRule({ interval: Math.max(1, rule.interval - 1) })}
                className="w-7 h-7 rounded-lg bg-[#1C1E28] border border-[#2C2E3C] text-gray-300 hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer"
                disabled={rule.interval <= 1}
              >
                -
              </button>
              <span className="w-16 text-center font-mono font-semibold text-violet-300">
                {rule.frequency === 'daily' && `هر ${toPersianDigits(rule.interval)} روز`}
                {rule.frequency === 'weekly' && `هر ${toPersianDigits(rule.interval)} هفته`}
                {rule.frequency === 'monthly' && `هر ${toPersianDigits(rule.interval)} ماه`}
              </span>
              <button
                type="button"
                onClick={() => updateRule({ interval: Math.min(99, rule.interval + 1) })}
                className="w-7 h-7 rounded-lg bg-[#1C1E28] border border-[#2C2E3C] text-gray-300 hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* 3. Weekly Options: Selected Weekdays (Saturday-first) */}
          {rule.frequency === 'weekly' && (
            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1.5">
                روزهای هفته (شنبه تا جمعه)
              </label>
              <div className="grid grid-cols-7 gap-1">
                {PERSIAN_WEEKDAY_NAMES.map((name, index) => {
                  const isChecked = rule.weekdays?.includes(index) ?? false;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        const current = rule.weekdays || [];
                        let next: number[];
                        if (current.includes(index)) {
                          next = current.filter((w) => w !== index);
                          if (next.length === 0) next = [index]; // Keep at least one
                        } else {
                          next = [...current, index].sort((a, b) => a - b);
                        }
                        updateRule({ weekdays: next });
                      }}
                      className={`py-1.5 px-0.5 rounded-lg text-[11px] font-medium border text-center transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-violet-950/60 text-violet-200 border-violet-600 shadow-xs'
                          : 'bg-[#121318] text-gray-400 border-[#262835] hover:text-gray-200'
                      }`}
                      title={name}
                    >
                      {name.replace('‌شنبه', '').replace('شنبه', 'ش')}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Monthly Options: Calendar Basis, Anchor Day, Nonexistent Day Policy */}
          {rule.frequency === 'monthly' && (
            <div className="space-y-3 p-3 bg-[#121318] rounded-xl border border-[#262835]">
              {/* Calendar Basis Toggle */}
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">مبنای تقویمی تکرار</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      updateRule({
                        calendarBasis: 'jalali',
                        monthDay: rule.monthDay || startJalali.jd,
                      });
                    }}
                    className={`py-1.5 px-2 text-xs rounded-lg border transition-colors cursor-pointer ${
                      rule.calendarBasis === 'jalali'
                        ? 'bg-[#27243B] text-violet-200 border-violet-500/50'
                        : 'bg-[#181920] text-gray-400 border-[#282A38] hover:text-gray-200'
                    }`}
                  >
                    تقویم خورشیدی (پیش‌فرض)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateRule({
                        calendarBasis: 'gregorian',
                        monthDay: rule.monthDay || startGregorian.day,
                      });
                    }}
                    className={`py-1.5 px-2 text-xs rounded-lg border transition-colors cursor-pointer ${
                      rule.calendarBasis === 'gregorian'
                        ? 'bg-[#27243B] text-violet-200 border-violet-500/50'
                        : 'bg-[#181920] text-gray-400 border-[#282A38] hover:text-gray-200'
                    }`}
                  >
                    تقویم میلادی
                  </button>
                </div>
              </div>

              {/* Anchor Day Selection */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-gray-300">روز ماه (لنگر تکرار):</span>
                <div className="flex items-center gap-1.5">
                  <select
                    value={rule.monthDay || (rule.calendarBasis === 'gregorian' ? startGregorian.day : startJalali.jd)}
                    onChange={(e) => updateRule({ monthDay: parseInt(e.target.value, 10) })}
                    className="bg-[#181920] border border-[#2D2F3E] text-violet-300 rounded-lg px-2.5 py-1 text-xs focus:border-violet-500 outline-hidden cursor-pointer"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        روز {toPersianDigits(d)} ماه
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nonexistent Days Policy (Explicitly Required) */}
              <div className="pt-2 border-t border-[#222432]">
                <label className="block text-[11px] font-medium text-gray-400 mb-1.5">
                  سیاست در ماه‌های کوتاه‌تر (مثلاً روز ۳۱ در ماه‌های ۳۰ روزه یا اسفند):
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-start gap-2 p-2 rounded-lg bg-[#181920] border border-[#262835] cursor-pointer">
                    <input
                      type="radio"
                      name="monthly-policy"
                      value="last_day"
                      checked={rule.monthlyPolicy !== 'skip'}
                      onChange={() => updateRule({ monthlyPolicy: 'last_day' })}
                      className="text-violet-600 focus:ring-violet-500 mt-0.5"
                    />
                    <div>
                      <span className="text-gray-200 font-medium block">
                        استفاده از آخرین روز معتبر ماه (پیش‌فرض)
                      </span>
                      <span className="text-[10px] text-gray-500 block leading-relaxed">
                        مثلاً اگر تکرار روی روز ۳۱ باشد، در نیمه دوم سال به روز ۳۰ (و در اسفند به ۲۹/۳۰) منتقل می‌شود اما لنگر اصلی ۳۱ برای سال بعد حفظ می‌گردد.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-2 rounded-lg bg-[#181920] border border-[#262835] cursor-pointer">
                    <input
                      type="radio"
                      name="monthly-policy"
                      value="skip"
                      checked={rule.monthlyPolicy === 'skip'}
                      onChange={() => updateRule({ monthlyPolicy: 'skip' })}
                      className="text-violet-600 focus:ring-violet-500 mt-0.5"
                    />
                    <div>
                      <span className="text-gray-200 font-medium block">
                        صرف‌نظر از تکرار در آن ماه
                      </span>
                      <span className="text-[10px] text-gray-500 block leading-relaxed">
                        در ماه‌هایی که این روز را ندارند، هیچ نوبتی ایجاد نمی‌شود.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 5. End Options */}
          <div className="p-3 bg-[#121318] rounded-xl border border-[#262835] space-y-2">
            <label className="block text-[11px] font-medium text-gray-400 mb-1">شرط پایان تکرار</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => updateRule({ endType: 'never', endDate: undefined })}
                className={`py-1.5 px-2 text-xs rounded-lg border transition-colors cursor-pointer ${
                  rule.endType === 'never'
                    ? 'bg-[#27243B] text-violet-200 border-violet-500/50'
                    : 'bg-[#181920] text-gray-400 border-[#282A38] hover:text-gray-200'
                }`}
              >
                بدون تاریخ پایان (نامحدود)
              </button>
              <button
                type="button"
                onClick={() => {
                  const defaultEnd = addDays(effectiveStartDate, 90);
                  updateRule({ endType: 'until', endDate: defaultEnd });
                }}
                className={`py-1.5 px-2 text-xs rounded-lg border transition-colors cursor-pointer ${
                  rule.endType === 'until'
                    ? 'bg-[#27243B] text-violet-200 border-violet-500/50'
                    : 'bg-[#181920] text-gray-400 border-[#282A38] hover:text-gray-200'
                }`}
              >
                تا تاریخ مشخص
              </button>
            </div>

            {rule.endType === 'until' && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-gray-300 text-[11px]">پایان تکرار در:</span>
                <button
                  type="button"
                  onClick={() => setIsEndDateModalOpen(true)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-[#181920] text-violet-300 border border-[#2D2F3E] hover:border-violet-500 cursor-pointer"
                >
                  {rule.endDate ? formatJalaliDate(rule.endDate, 'full') : 'انتخاب تاریخ پایان...'}
                </button>
              </div>
            )}
          </div>

          {/* 6. Deadline Offset Preview & Explanation (Requirement 5) */}
          {deadlineOffset !== undefined && deadlineOffset > 0 && (
            <div className="p-2.5 rounded-lg bg-[#181924] border border-violet-800/30 flex items-start gap-2 text-xs text-violet-300 leading-relaxed">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-violet-200 mb-0.5">فاصله مهلت تحویل:</span>
                مهلت این تسک <strong>{toPersianDigits(deadlineOffset)} روز</strong> پس از روز انجام تعیین شده است. همین فاصله تقویمی برای تمام نوبت‌های آینده محاسبه و اعمال خواهد شد.
              </div>
            </div>
          )}

          {/* 7. Human-Readable Persian Summary */}
          <div className="p-2.5 rounded-lg bg-[#181920] border border-[#262835] text-xs">
            <span className="text-gray-400 block text-[11px] mb-1 font-medium">خلاصه الگوی تکرار:</span>
            <span className="text-violet-200 font-semibold leading-relaxed block">
              {getRecurrenceSummaryFa(rule, plannedDate, deadlineOffset)}
            </span>
          </div>

          {/* 8. Preview Next Three Occurrence Dates */}
          {nextThree.length > 0 && (
            <div className="p-2.5 rounded-lg bg-[#13141B] border border-[#222430] space-y-1 text-xs">
              <span className="text-gray-400 block text-[11px] mb-1 font-medium">پیش‌نمایش سه نوبت آینده:</span>
              <div className="space-y-1 font-mono text-[11px]">
                {nextThree.map((dateStr, idx) => {
                  const occDue = deadlineOffset !== undefined ? addDays(dateStr, deadlineOffset) : undefined;
                  return (
                    <div key={dateStr} className="flex items-center justify-between text-gray-300">
                      <span className="flex items-center gap-1.5">
                        <span className="text-gray-500">{toPersianDigits(idx + 1)}.</span>
                        <span>{formatJalaliDate(dateStr, 'full')}</span>
                      </span>
                      {occDue && (
                        <span className="text-amber-400/80 text-[10px]">
                          (مهلت: {formatJalaliDate(occDue, 'short')})
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* End Date Picker Modal */}
      {isEndDateModalOpen && (
        <DatePickerModal
          isOpen={isEndDateModalOpen}
          title="انتخاب تاریخ پایان تکرار"
          selectedDate={rule?.endDate}
          onSelectDate={(newDate) => {
            updateRule({ endDate: newDate });
            setIsEndDateModalOpen(false);
          }}
          onClearDate={() => {
            updateRule({ endDate: undefined, endType: 'never' });
            setIsEndDateModalOpen(false);
          }}
          onClose={() => setIsEndDateModalOpen(false)}
        />
      )}
    </div>
  );
};
