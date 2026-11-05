/**
 * Centralized Persian & Gregorian Date Utilities for KarRooz
 * Uses jalaali-js for accurate, leap-year aware astronomical Persian calendar math.
 * Standardizes all stored date-only values to Gregorian YYYY-MM-DD.
 * Timezone: Asia/Tehran for calendar day boundaries.
 */
import { toJalaali, toGregorian, jalaaliMonthLength, isLeapJalaaliYear } from 'jalaali-js';

export const PERSIAN_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export const GREGORIAN_MONTH_NAMES_FA = [
  'ژانویه',
  'فوریه',
  'مارس',
  'آوریل',
  'مه',
  'ژوئن',
  'ژوئیه',
  'اوت',
  'سپتامبر',
  'اکتبر',
  'نوامبر',
  'دسامبر',
];

export const PERSIAN_WEEKDAY_NAMES = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
];

export const PERSIAN_WEEKDAY_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

/**
 * Returns today's calendar date as a Gregorian 'YYYY-MM-DD' string
 * strictly in the 'Asia/Tehran' timezone.
 */
export function getTehranTodayDateString(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tehran',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(new Date());
    let year = '';
    let month = '';
    let day = '';
    for (const part of parts) {
      if (part.type === 'year') year = part.value;
      if (part.type === 'month') month = part.value;
      if (part.type === 'day') day = part.value;
    }
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } catch {
    // Fallback if Intl timeZone fails
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

/**
 * Convert Latin digits to Persian digits
 */
export function toPersianDigits(n: number | string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(n).replace(/[0-9]/g, (char) => persianDigits[parseInt(char, 10)]);
}

/**
 * Convert Persian/Arabic digits to English digits
 */
export function toEnglishDigits(str: string): string {
  const faDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arDigits = '٠١٢٣٤٥٦٧٨٩';
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(faDigits[i], 'g'), String(i));
    result = result.replace(new RegExp(arDigits[i], 'g'), String(i));
  }
  return result;
}

/**
 * Parses a YYYY-MM-DD string into year, month, day components
 */
export function parseDateString(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

/**
 * Formats numeric year, month, day into YYYY-MM-DD string
 */
export function formatDateToYYYYMMDD(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Add or subtract days from a YYYY-MM-DD string
 */
export function addDays(dateStr: string, days: number): string {
  const parsed = parseDateString(dateStr);
  if (!parsed) return dateStr;
  const date = new Date(parsed.year, parsed.month - 1, parsed.day);
  date.setDate(date.getDate() + days);
  return formatDateToYYYYMMDD(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/**
 * Returns tomorrow's date string based on Tehran today
 */
export function getTomorrowDateString(referenceDateStr?: string): string {
  const base = referenceDateStr || getTehranTodayDateString();
  return addDays(base, 1);
}

/**
 * Converts a Gregorian YYYY-MM-DD to Jalali { jy, jm, jd }
 */
export function gregorianToJalali(dateStr: string): { jy: number; jm: number; jd: number } {
  const parsed = parseDateString(dateStr);
  if (!parsed) {
    return { jy: 1403, jm: 1, jd: 1 };
  }
  const j = toJalaali(parsed.year, parsed.month, parsed.day);
  return j;
}

/**
 * Converts a Jalali date { jy, jm, jd } to Gregorian YYYY-MM-DD string
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): string {
  const g = toGregorian(jy, jm, jd);
  return formatDateToYYYYMMDD(g.gy, g.gm, g.gd);
}

/**
 * Formats a Gregorian YYYY-MM-DD into a Persian date display
 * 'full': "شنبه، ۱۴ آبان ۱۴۰۳"
 * 'short': "۱۴ آبان"
 * 'compact': "۱۴۰۳/۰۸/۱۴"
 */
export function formatJalaliDate(dateStr: string, format: 'full' | 'short' | 'compact' = 'short'): string {
  const parsed = parseDateString(dateStr);
  if (!parsed) return dateStr;

  const j = toJalaali(parsed.year, parsed.month, parsed.day);
  const monthName = PERSIAN_MONTH_NAMES[j.jm - 1] || '';

  if (format === 'compact') {
    return `${toPersianDigits(j.jy)}/${toPersianDigits(String(j.jm).padStart(2, '0'))}/${toPersianDigits(String(j.jd).padStart(2, '0'))}`;
  }

  if (format === 'short') {
    return `${toPersianDigits(j.jd)} ${monthName}`;
  }

  // 'full'
  // Calculate Persian weekday: Saturday=0 .. Friday=6
  const jsDate = new Date(parsed.year, parsed.month - 1, parsed.day);
  const weekdayIndex = (jsDate.getDay() + 1) % 7;
  const weekdayName = PERSIAN_WEEKDAY_NAMES[weekdayIndex] || '';

  return `${weekdayName}، ${toPersianDigits(j.jd)} ${monthName} ${toPersianDigits(j.jy)}`;
}

/**
 * Formats a Gregorian date for display
 */
export function formatGregorianDate(dateStr: string, format: 'full' | 'short' = 'short'): string {
  const parsed = parseDateString(dateStr);
  if (!parsed) return dateStr;
  const monthName = GREGORIAN_MONTH_NAMES_FA[parsed.month - 1] || '';
  if (format === 'short') {
    return `${toPersianDigits(parsed.day)} ${monthName}`;
  }
  return `${toPersianDigits(parsed.day)} ${monthName} ${toPersianDigits(parsed.year)} (${dateStr})`;
}

/**
 * Human readable header date string for today
 */
export function getTodayPersianDateString(): string {
  const todayStr = getTehranTodayDateString();
  return formatJalaliDate(todayStr, 'full');
}

/**
 * Compare two YYYY-MM-DD date strings
 */
export function compareDateStrings(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Checks if targetDate is before referenceDate (default: Tehran today)
 */
export function isPastDate(targetDateStr: string, referenceDateStr?: string): boolean {
  const ref = referenceDateStr || getTehranTodayDateString();
  return targetDateStr < ref;
}

/**
 * Checks if targetDate is equal to referenceDate (default: Tehran today)
 */
export function isTodayDate(targetDateStr: string, referenceDateStr?: string): boolean {
  const ref = referenceDateStr || getTehranTodayDateString();
  return targetDateStr === ref;
}

/**
 * Checks if targetDate is after referenceDate (default: Tehran today)
 */
export function isFutureDate(targetDateStr: string, referenceDateStr?: string): boolean {
  const ref = referenceDateStr || getTehranTodayDateString();
  return targetDateStr > ref;
}

/**
 * Calculates days difference: target - reference
 */
export function getDaysDifference(targetDateStr: string, referenceDateStr?: string): number {
  const ref = referenceDateStr || getTehranTodayDateString();
  const t = parseDateString(targetDateStr);
  const r = parseDateString(ref);
  if (!t || !r) return 0;
  const tTime = new Date(t.year, t.month - 1, t.day).getTime();
  const rTime = new Date(r.year, r.month - 1, r.day).getTime();
  return Math.round((tTime - rTime) / (1000 * 60 * 60 * 24));
}

/**
 * Returns a friendly relative label: "امروز", "فردا", "دیروز", or short date
 */
export function getRelativeDateLabel(dateStr: string, referenceDateStr?: string): string {
  const diff = getDaysDifference(dateStr, referenceDateStr);
  if (diff === 0) return 'امروز';
  if (diff === 1) return 'فردا';
  if (diff === -1) return 'دیروز';
  if (diff > 1 && diff <= 5) return `${toPersianDigits(diff)} روز بعد`;
  if (diff < -1 && diff >= -5) return `${toPersianDigits(Math.abs(diff))} روز پیش`;
  return formatJalaliDate(dateStr, 'short');
}

/**
 * Format relative time ago for timestamps
 */
export function formatTimeAgo(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 2) return 'همین الان';
    if (diffMinutes < 60) return `${toPersianDigits(diffMinutes)} دقیقه پیش`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${toPersianDigits(diffHours)} ساعت پیش`;
    const diffDays = Math.floor(diffHours / 24);
    return `${toPersianDigits(diffDays)} روز پیش`;
  } catch {
    return '';
  }
}

/**
 * Returns the 7 calendar dates (YYYY-MM-DD, Saturday to Friday) for the week containing dateStr.
 */
export function getWeekDaysForDate(dateStr: string): string[] {
  const parsed = parseDateString(dateStr);
  if (!parsed) return [dateStr];
  const d = new Date(parsed.year, parsed.month - 1, parsed.day);
  const saturdayOffset = (d.getDay() + 1) % 7;
  const saturday = addDays(dateStr, -saturdayOffset);
  const weekDays: string[] = [];
  for (let i = 0; i < 7; i++) {
    weekDays.push(addDays(saturday, i));
  }
  return weekDays;
}

export interface CalendarDayCell {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number; // day of month in current system (1..31)
  isCurrentMonth: boolean;
  isToday: boolean;
  jy: number;
  jm: number;
  jd: number;
  gy: number;
  gm: number;
  gd: number;
}

/**
 * Builds a 7-column month grid (Saturday-first) for either Jalali or Gregorian system.
 * Returns array of CalendarDayCell objects.
 */
export function getMonthCalendarCells(
  year: number,
  month: number, // 1-12
  system: 'jalali' | 'gregorian' = 'jalali',
  todayStr: string = getTehranTodayDateString()
): CalendarDayCell[] {
  const cells: CalendarDayCell[] = [];

  if (system === 'jalali') {
    const totalDays = jalaaliMonthLength(year, month);
    // Find what weekday the 1st of this Jalali month is
    const g1st = toGregorian(year, month, 1);
    const date1st = new Date(g1st.gy, g1st.gm - 1, g1st.gd);
    // JS getDay(): 0=Sun, 1=Mon, ..., 6=Sat
    // Saturday-first offset: Sat=0, Sun=1, Mon=2, Tue=3, Wed=4, Thu=5, Fri=6
    const firstDayOffset = (date1st.getDay() + 1) % 7;

    // Previous month filler cells
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonthDays = jalaaliMonthLength(prevYear, prevMonth);

    for (let i = firstDayOffset - 1; i >= 0; i--) {
      const jd = prevMonthDays - i;
      const g = toGregorian(prevYear, prevMonth, jd);
      const dateStr = formatDateToYYYYMMDD(g.gy, g.gm, g.gd);
      cells.push({
        dateStr,
        dayNumber: jd,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        jy: prevYear,
        jm: prevMonth,
        jd,
        gy: g.gy,
        gm: g.gm,
        gd: g.gd,
      });
    }

    // Current month cells
    for (let day = 1; day <= totalDays; day++) {
      const g = toGregorian(year, month, day);
      const dateStr = formatDateToYYYYMMDD(g.gy, g.gm, g.gd);
      cells.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        jy: year,
        jm: month,
        jd: day,
        gy: g.gy,
        gm: g.gm,
        gd: g.gd,
      });
    }

    // Next month filler cells to complete the grid (up to 35 or 42 cells)
    const remainder = cells.length % 7;
    const nextCellsCount = remainder === 0 ? 0 : 7 - remainder;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;

    for (let day = 1; day <= nextCellsCount; day++) {
      const g = toGregorian(nextYear, nextMonth, day);
      const dateStr = formatDateToYYYYMMDD(g.gy, g.gm, g.gd);
      cells.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        jy: nextYear,
        jm: nextMonth,
        jd: day,
        gy: g.gy,
        gm: g.gm,
        gd: g.gd,
      });
    }
  } else {
    // Gregorian system
    // Number of days in Gregorian month
    const totalDays = new Date(year, month, 0).getDate();
    const date1st = new Date(year, month - 1, 1);
    // Saturday-first offset
    const firstDayOffset = (date1st.getDay() + 1) % 7;

    // Previous month filler
    const prevMonthDate = new Date(year, month - 1, 0);
    const prevMonthDays = prevMonthDate.getDate();
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;

    for (let i = firstDayOffset - 1; i >= 0; i--) {
      const gd = prevMonthDays - i;
      const dateStr = formatDateToYYYYMMDD(prevYear, prevMonth, gd);
      const j = toJalaali(prevYear, prevMonth, gd);
      cells.push({
        dateStr,
        dayNumber: gd,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        jy: j.jy,
        jm: j.jm,
        jd: j.jd,
        gy: prevYear,
        gm: prevMonth,
        gd,
      });
    }

    // Current month cells
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = formatDateToYYYYMMDD(year, month, day);
      const j = toJalaali(year, month, day);
      cells.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        jy: j.jy,
        jm: j.jm,
        jd: j.jd,
        gy: year,
        gm: month,
        gd: day,
      });
    }

    // Next month filler
    const remainder = cells.length % 7;
    const nextCellsCount = remainder === 0 ? 0 : 7 - remainder;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;

    for (let day = 1; day <= nextCellsCount; day++) {
      const dateStr = formatDateToYYYYMMDD(nextYear, nextMonth, day);
      const j = toJalaali(nextYear, nextMonth, day);
      cells.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        jy: j.jy,
        jm: j.jm,
        jd: j.jd,
        gy: nextYear,
        gm: nextMonth,
        gd: day,
      });
    }
  }

  return cells;
}
