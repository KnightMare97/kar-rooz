/**
 * Centralized Recurrence Engine for KarRooz (کار روز)
 * Explicit, astronomical calendar math (Jalali & Gregorian)
 * Preserves anchor days, handles leap years and shorter months,
 * supports daily, weekly (Saturday-first), and monthly patterns.
 */
import {
  Item,
  RecurrenceRule,
  OccurrenceOverride,
  RecurrenceFrequency,
  MonthlyPolicy,
} from '../types';
import {
  getTehranTodayDateString,
  addDays,
  parseDateString,
  formatDateToYYYYMMDD,
  gregorianToJalali,
  jalaliToGregorian,
  formatJalaliDate,
  toPersianDigits,
  getDaysDifference,
  PERSIAN_WEEKDAY_NAMES,
} from './date';
import { jalaaliMonthLength } from 'jalaali-js';

export interface ExpansionOptions {
  includeOverdueUnresolved?: boolean;
  pastHorizonDays?: number; // default 60
  todayStr?: string;
}

/**
 * Calculates deadline offset in calendar days: dueDate - plannedDate
 */
export function calculateDeadlineOffset(plannedDate?: string, dueDate?: string): number | undefined {
  if (!plannedDate || !dueDate) return undefined;
  return getDaysDifference(dueDate, plannedDate);
}

/**
 * Returns weekday index where Saturday=0, Sunday=1, ..., Friday=6
 */
export function getSaturdayFirstWeekday(dateStr: string): number {
  const p = parseDateString(dateStr);
  if (!p) return 0;
  const d = new Date(p.year, p.month - 1, p.day);
  return (d.getDay() + 1) % 7;
}

/**
 * Generates an array of occurrence dates (YYYY-MM-DD) for a recurrence rule
 * within an inclusive [rangeStart, rangeEnd] window.
 * Avoids infinite series by capping at maxCount.
 */
export function generateOccurrenceDates(
  rule: RecurrenceRule,
  arg1: string,
  arg2: string,
  arg3?: string,
  maxCount = 365
): string[] {
  if (!rule || rule.interval < 1) return [];

  let startDate: string;
  let rangeStart: string;
  let rangeEnd: string;

  if (typeof arg3 === 'string') {
    startDate = arg1;
    rangeStart = arg2;
    rangeEnd = arg3;
  } else {
    startDate = (rule as any).startDate || arg1;
    rangeStart = arg1;
    rangeEnd = arg2;
  }

  if (!startDate || !rangeStart || !rangeEnd) return [];

  const results: string[] = [];
  const effectiveEnd = rule.endType === 'until' && rule.endDate
    ? (rule.endDate < rangeEnd ? rule.endDate : rangeEnd)
    : rangeEnd;

  // If rule is stopped, any occurrence on or after stoppedAt is cut off
  const cutoff = rule.stoppedAt;

  if (rangeStart > effectiveEnd) return [];

  // Helper check for date within [rangeStart, effectiveEnd] and before cutoff
  const isDateValid = (d: string): boolean => {
    if (d < startDate) return false;
    if (cutoff && d >= cutoff) return false;
    if (rule.endType === 'until' && rule.endDate && d > rule.endDate) return false;
    return true;
  };

  const isDateInRange = (d: string): boolean => {
    return isDateValid(d) && d >= rangeStart && d <= effectiveEnd;
  };

  if (rule.frequency === 'daily') {
    const stepDays = Math.max(1, rule.interval);
    let curr = startDate;
    let safetyCounter = 0;

    // Fast-forward to near rangeStart if rangeStart is far ahead
    if (curr < rangeStart) {
      const diff = getDaysDifference(rangeStart, curr);
      const stepsToSkip = Math.floor(diff / stepDays);
      if (stepsToSkip > 0) {
        curr = addDays(curr, stepsToSkip * stepDays);
      }
    }

    while (curr <= effectiveEnd && safetyCounter < maxCount) {
      safetyCounter++;
      if (cutoff && curr >= cutoff) break;
      if (isDateInRange(curr)) {
        results.push(curr);
      }
      curr = addDays(curr, stepDays);
    }
  } else if (rule.frequency === 'weekly') {
    const stepWeeks = Math.max(1, rule.interval);
    const rawDays = (rule as any).weekdays || (rule as any).weeklyDays;
    const selectedWeekdays = Array.isArray(rawDays) && rawDays.length > 0
      ? Array.from(new Set(rawDays.map(Number))).sort((a: number, b: number) => a - b)
      : [getSaturdayFirstWeekday(startDate)];

    // Find the Saturday of the week containing startDate
    const startWeekday = getSaturdayFirstWeekday(startDate);
    const saturday0 = addDays(startDate, -startWeekday);

    let weekSaturday = saturday0;
    let safetyCounter = 0;

    // Fast-forward weeks if rangeStart is far ahead
    if (rangeStart > addDays(saturday0, 7)) {
      const diffDays = getDaysDifference(rangeStart, saturday0);
      const weeksToSkip = Math.floor(diffDays / (7 * stepWeeks));
      if (weeksToSkip > 1) {
        weekSaturday = addDays(saturday0, (weeksToSkip - 1) * 7 * stepWeeks);
      }
    }

    while (weekSaturday <= effectiveEnd && safetyCounter < maxCount) {
      safetyCounter++;
      if (cutoff && weekSaturday >= cutoff) break;

      for (const wd of selectedWeekdays) {
        const candidate = addDays(weekSaturday, wd);
        if (candidate > effectiveEnd) break;
        if (isDateInRange(candidate)) {
          results.push(candidate);
        }
      }

      weekSaturday = addDays(weekSaturday, 7 * stepWeeks);
    }
  } else if (rule.frequency === 'monthly') {
    const stepMonths = Math.max(1, rule.interval);
    const basis = (rule as any).calendarBasis || (rule as any).monthlyBasis || 'jalali';
    const policy: MonthlyPolicy = rule.monthlyPolicy || 'last_day';

    if (basis === 'jalali') {
      const startJ = gregorianToJalali(startDate);
      const rawAnchor = (rule as any).monthDay ?? (rule as any).monthlyDay;
      const anchorDay = typeof rawAnchor === 'number' && rawAnchor >= 1 && rawAnchor <= 31
        ? rawAnchor
        : startJ.jd;

      let stepK = 0;
      let safetyCounter = 0;

      while (safetyCounter < maxCount) {
        safetyCounter++;
        const totalMonths = (startJ.jy * 12 + (startJ.jm - 1)) + stepK * stepMonths;
        const targetJy = Math.floor(totalMonths / 12);
        const targetJm = (totalMonths % 12) + 1;
        const maxDaysInMonth = jalaaliMonthLength(targetJy, targetJm);

        let targetJd: number | null = null;
        if (anchorDay <= maxDaysInMonth) {
          targetJd = anchorDay;
        } else {
          // Shorter month than anchor day (e.g. 31 in Shahrivar-Esfand)
          if (policy === 'last_day') {
            targetJd = maxDaysInMonth;
          } else {
            // 'skip' policy
            targetJd = null;
          }
        }

        if (targetJd !== null) {
          const gDate = jalaliToGregorian(targetJy, targetJm, targetJd);
          if (cutoff && gDate >= cutoff) break;
          if (gDate > effectiveEnd) {
            // If this month already exceeds effectiveEnd, we can stop
            break;
          }
          if (isDateInRange(gDate)) {
            results.push(gDate);
          }
        }

        stepK++;
      }
    } else {
      // Gregorian monthly
      const startP = parseDateString(startDate);
      if (startP) {
        const rawAnchor = (rule as any).monthDay ?? (rule as any).monthlyDay;
        const anchorDay = typeof rawAnchor === 'number' && rawAnchor >= 1 && rawAnchor <= 31
          ? rawAnchor
          : startP.day;

        let stepK = 0;
        let safetyCounter = 0;

        while (safetyCounter < maxCount) {
          safetyCounter++;
          const totalMonths = (startP.year * 12 + (startP.month - 1)) + stepK * stepMonths;
          const targetGy = Math.floor(totalMonths / 12);
          const targetGm = (totalMonths % 12) + 1;
          const maxDaysInMonth = new Date(targetGy, targetGm, 0).getDate();

          let targetGd: number | null = null;
          if (anchorDay <= maxDaysInMonth) {
            targetGd = anchorDay;
          } else {
            if (policy === 'last_day') {
              targetGd = maxDaysInMonth;
            } else {
              targetGd = null;
            }
          }

          if (targetGd !== null) {
            const gDate = formatDateToYYYYMMDD(targetGy, targetGm, targetGd);
            if (cutoff && gDate >= cutoff) break;
            if (gDate > effectiveEnd) break;
            if (isDateInRange(gDate)) {
              results.push(gDate);
            }
          }

          stepK++;
        }
      }
    }
  }

  // Sort and deduplicate dates
  return Array.from(new Set(results)).sort();
}

/**
 * Returns the next N upcoming occurrence dates starting from referenceDate
 */
export function generateNextOccurrences(
  rule: RecurrenceRule,
  startDate: string,
  count = 3,
  referenceDateStr?: string
): string[] {
  const ref = referenceDateStr || getTehranTodayDateString();
  const searchStart = ref < startDate ? startDate : ref;
  // Look ahead up to 3 years
  const horizonEnd = addDays(searchStart, 365 * 3);
  const occurrences = generateOccurrenceDates(rule, startDate, searchStart, horizonEnd, 200);
  return occurrences.slice(0, count);
}

/**
 * Returns a human-readable Persian description of the recurrence rule
 */
export function getRecurrenceSummaryFa(
  rule: RecurrenceRule,
  startDate?: string,
  dueDateOffsetDays?: number
): string {
  if (!rule) return '';

  let freqText = '';

  if (rule.frequency === 'daily') {
    if (rule.interval === 1) {
      freqText = 'هر روز';
    } else {
      freqText = `هر ${toPersianDigits(rule.interval)} روز یک‌بار`;
    }
  } else if (rule.frequency === 'weekly') {
    const rawDays = (rule as any).weekdays || (rule as any).weeklyDays;
    const weekdays = Array.isArray(rawDays) && rawDays.length > 0
      ? rawDays.map((w: number) => PERSIAN_WEEKDAY_NAMES[w]).join('، ')
      : 'شنبه';

    if (rule.interval === 1) {
      freqText = `هر هفته در روزهای ${weekdays}`;
    } else {
      freqText = `هر ${toPersianDigits(rule.interval)} هفته در روزهای ${weekdays}`;
    }
  } else if (rule.frequency === 'monthly') {
    const basisLabel = ((rule as any).calendarBasis || (rule as any).monthlyBasis) === 'gregorian' ? 'تقویم میلادی' : 'تقویم خورشیدی';
    const rawAnchor = (rule as any).monthDay ?? (rule as any).monthlyDay;
    const day = rawAnchor !== undefined ? toPersianDigits(rawAnchor) : 'روز شروع';
    const policyLabel = rule.monthlyPolicy === 'skip'
      ? 'با صرف‌نظر در ماه‌های کوتاه‌تر'
      : 'با انتقال به آخرین روز در ماه‌های کوتاه‌تر';

    if (rule.interval === 1) {
      freqText = `هر ماه در روز ${day} ماه (${basisLabel} - ${policyLabel})`;
    } else {
      freqText = `هر ${toPersianDigits(rule.interval)} ماه در روز ${day} ماه (${basisLabel} - ${policyLabel})`;
    }
  }

  let endText = '';
  if (rule.endType === 'until' && rule.endDate) {
    endText = `، تا ${formatJalaliDate(rule.endDate, 'full')}`;
  } else {
    endText = '، بدون پایان';
  }

  let offsetText = '';
  if (dueDateOffsetDays !== undefined && dueDateOffsetDays > 0) {
    offsetText = ` (مهلت هر نوبت: ${toPersianDigits(dueDateOffsetDays)} روز پس از انجام)`;
  }

  let stoppedText = '';
  if (rule.stoppedAt) {
    stoppedText = ` [متوقف‌شده از ${formatJalaliDate(rule.stoppedAt, 'full')}]`;
  }

  return `${freqText}${endText}${offsetText}${stoppedText}`;
}

/**
 * Checks whether a recurring series is still actively generating future occurrences
 */
export function isSeriesActive(rule?: RecurrenceRule, todayStr = getTehranTodayDateString()): boolean {
  if (!rule) return false;
  if (rule.stoppedAt && rule.stoppedAt <= todayStr) return false;
  if (rule.endType === 'until' && rule.endDate && rule.endDate < todayStr) return false;
  return true;
}

/**
 * Expands a single recurring series into in-memory Item objects for a date range
 */
export function expandSeriesOccurrences(
  seriesItem: Item,
  rangeStart: string,
  rangeEnd: string,
  options?: ExpansionOptions
): Item[] {
  if (!seriesItem.recurrence || seriesItem.type !== 'task') return [];

  const rule = seriesItem.recurrence;
  const startDate = seriesItem.plannedDate || seriesItem.createdAt.split('T')[0];
  const todayStr = options?.todayStr || getTehranTodayDateString();
  const pastHorizon = options?.pastHorizonDays || 60;
  const deadlineOffset = calculateDeadlineOffset(seriesItem.plannedDate, seriesItem.dueDate);

  // 1. Determine dates to generate:
  // Base date range: [rangeStart, rangeEnd]
  let effectiveRangeStart = rangeStart;

  // If includeOverdueUnresolved is enabled, extend start date backwards to cover unresolved past occurrences
  if (options?.includeOverdueUnresolved && startDate < todayStr) {
    const pastHorizonDate = addDays(todayStr, -pastHorizon);
    const earliestPast = startDate > pastHorizonDate ? startDate : pastHorizonDate;
    if (earliestPast < effectiveRangeStart) {
      effectiveRangeStart = earliestPast;
    }
  }

  const generatedDates = generateOccurrenceDates(rule, startDate, effectiveRangeStart, rangeEnd);
  const overrides = seriesItem.occurrenceOverrides || {};
  const occurrences: Item[] = [];

  for (const originalDate of generatedDates) {
    const override = overrides[originalDate];

    // Check if skipped
    if (override?.skipped) {
      continue;
    }

    // Determine target planned date: if rescheduled, use override.plannedDate
    const actualPlannedDate = override?.plannedDate || originalDate;

    // Determine target due date:
    // If override explicitly has dueDate, use it.
    // Otherwise if series had a deadline offset, apply it to actualPlannedDate!
    let actualDueDate: string | undefined = undefined;
    if (override?.dueDate !== undefined) {
      actualDueDate = override.dueDate || undefined;
    } else if (deadlineOffset !== undefined) {
      actualDueDate = addDays(actualPlannedDate, deadlineOffset);
    }

    const isCompleted = override?.completed ?? false;
    const itemStatus = override?.status ?? (isCompleted ? 'done' : 'todo');

    // Past unresolved filter:
    // If originalDate < rangeStart (was fetched only for overdue resolution):
    // only include if it is indeed incomplete!
    if (originalDate < rangeStart) {
      if (isCompleted || itemStatus === 'done') {
        // Completed past occurrence outside rangeStart: do not include in active overdue
        continue;
      }
    }

    const occurrenceItem: Item = {
      id: `${seriesItem.id}__${originalDate}`,
      type: 'task',
      title: override?.title ?? seriesItem.title,
      description: override?.description ?? seriesItem.description,
      completed: isCompleted,
      status: itemStatus,
      completedAt: override?.completedAt,
      projectId: override?.projectId ?? seriesItem.projectId,
      project: seriesItem.project,
      legacyProjectLabel: seriesItem.legacyProjectLabel,
      tags: override?.tags ?? seriesItem.tags ?? [],
      createdAt: seriesItem.createdAt,
      plannedDate: actualPlannedDate,
      dueDate: actualDueDate,
      inToday: actualPlannedDate === todayStr,
      destination: actualPlannedDate === todayStr ? 'today' : undefined,

      // Independent steps per recurrence occurrence
      steps: override?.steps !== undefined
        ? override.steps
        : (seriesItem.steps ? seriesItem.steps.map((s) => ({ ...s, completed: false })) : undefined),

      // Recurrence metadata
      isRecurringOccurrence: true,
      recurringSeriesId: seriesItem.id,
      originalScheduledDate: originalDate,
      isOccurrenceSkipped: false,
    };

    occurrences.push(occurrenceItem);
  }

  return occurrences;
}

/**
 * Expands all items (ordinary non-recurring + recurring occurrences)
 * across an inclusive date range [rangeStart, rangeEnd].
 */
export function expandAllItems(
  items: Item[],
  rangeStart: string,
  rangeEnd: string,
  options?: ExpansionOptions
): Item[] {
  const result: Item[] = [];

  for (const item of items) {
    if (item.recurrence && item.type === 'task') {
      // Recurring series: expand occurrences
      const seriesOccurrences = expandSeriesOccurrences(item, rangeStart, rangeEnd, options);
      result.push(...seriesOccurrences);
    } else {
      // Ordinary item: include directly
      result.push(item);
    }
  }

  return result;
}
