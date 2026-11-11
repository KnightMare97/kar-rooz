import { StickyColor } from '../types';

export interface StickyColorTheme {
  id: StickyColor;
  label: string;
  dotColor: string;
  bgClass: string;
  borderClass: string;
  barClass: string;
  accentText: string;
}

export const STICKY_COLOR_THEMES: Record<StickyColor, StickyColorTheme> = {
  default: {
    id: 'default',
    label: 'بنفش کلاسیک',
    dotColor: '#8B5CF6',
    bgClass: 'bg-[#151620]',
    borderClass: 'border-[#26283C]',
    barClass: 'bg-violet-500',
    accentText: 'text-violet-400',
  },
  amber: {
    id: 'amber',
    label: 'کهربایی آرام',
    dotColor: '#F59E0B',
    bgClass: 'bg-[#191712]',
    borderClass: 'border-[#362E20]',
    barClass: 'bg-amber-500',
    accentText: 'text-amber-400',
  },
  emerald: {
    id: 'emerald',
    label: 'سبز نعنایی',
    dotColor: '#10B981',
    bgClass: 'bg-[#121915]',
    borderClass: 'border-[#1E3628]',
    barClass: 'bg-emerald-500',
    accentText: 'text-emerald-400',
  },
  blue: {
    id: 'blue',
    label: 'آبی اقیانوسی',
    dotColor: '#38BDF8',
    bgClass: 'bg-[#121722]',
    borderClass: 'border-[#1E293D]',
    barClass: 'bg-sky-500',
    accentText: 'text-sky-400',
  },
  rose: {
    id: 'rose',
    label: 'گلبهی ملایم',
    dotColor: '#F43F5E',
    bgClass: 'bg-[#1B1317]',
    borderClass: 'border-[#3A1E28]',
    barClass: 'bg-rose-500',
    accentText: 'text-rose-400',
  },
};

export const STICKY_COLOR_LIST: StickyColorTheme[] = [
  STICKY_COLOR_THEMES.default,
  STICKY_COLOR_THEMES.amber,
  STICKY_COLOR_THEMES.emerald,
  STICKY_COLOR_THEMES.blue,
  STICKY_COLOR_THEMES.rose,
];
