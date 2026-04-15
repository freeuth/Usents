import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

// ─── Number formatting ───────────────────────────────

export function formatCurrency(amount: number, showSign = false): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat('ko-KR').format(abs);
  if (showSign && amount > 0) return `+${formatted}원`;
  if (amount < 0) return `-${formatted}원`;
  return `${formatted}원`;
}

export function formatCurrencyShort(amount: number): string {
  if (Math.abs(amount) >= 100_000_000) {
    return `${(amount / 100_000_000).toFixed(1)}억원`;
  }
  if (Math.abs(amount) >= 10_000) {
    return `${(amount / 10_000).toFixed(0)}만원`;
  }
  return `${new Intl.NumberFormat('ko-KR').format(amount)}원`;
}

// ─── Date formatting ─────────────────────────────────

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'M월 d일 (EEE)', { locale: ko });
}

export function formatDateShort(dateStr: string): string {
  return format(parseISO(dateStr), 'M/d', { locale: ko });
}

export function formatMonth(dateStr: string): string {
  return format(parseISO(dateStr + '-01'), 'yyyy년 M월', { locale: ko });
}

export function formatYearMonth(date: Date = new Date()): string {
  return format(date, 'yyyy-MM');
}

export function getMonthStart(yearMonth: string): string {
  return `${yearMonth}-01`;
}

export function getMonthEnd(yearMonth: string): string {
  const d = endOfMonth(parseISO(`${yearMonth}-01`));
  return format(d, 'yyyy-MM-dd');
}

export function isToday(dateStr: string): boolean {
  return dateStr === format(new Date(), 'yyyy-MM-dd');
}

export function isThisMonth(yearMonth: string): boolean {
  return yearMonth === format(new Date(), 'yyyy-MM');
}

export function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// Generate day_of_month date for given year-month
// Handles edge cases like month end (e.g. day 31 in February → 28/29)
export function getDayInMonth(yearMonth: string, dayOfMonth: number): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const lastDay = getLastDayOfMonth(year, month);
  const actualDay = Math.min(dayOfMonth, lastDay);
  return `${yearMonth}-${String(actualDay).padStart(2, '0')}`;
}

// ─── Misc ─────────────────────────────────────────────

export function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}
