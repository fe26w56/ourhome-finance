/**
 * ユーティリティ関数
 */

/**
 * 日付を YYYY-MM-DD 形式にフォーマット
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 日付を YYYY-MM 形式にフォーマット
 */
export function formatMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * YYYY-MM-DD 文字列を Date に変換
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString + 'T00:00:00');
}

/**
 * YYYY-MM 文字列から月の開始日と終了日を取得
 */
export function getMonthRange(yearMonth: string): { start: string; end: string } {
  const [year, month] = yearMonth.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // 月末日
  return {
    start: formatDate(start),
    end: formatDate(end),
  };
}

/**
 * 金額をフォーマット（カンマ区切り）
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * 金額文字列を数値に変換
 */
export function parseAmount(amountString: string): number {
  const cleaned = amountString.replace(/,/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * 今日の日付を YYYY-MM-DD 形式で取得
 */
export function getToday(): string {
  return formatDate(new Date());
}

/**
 * 今月を YYYY-MM 形式で取得
 */
export function getCurrentMonth(): string {
  return formatMonth(new Date());
}

/**
 * 前月を YYYY-MM 形式で取得
 */
export function getPreviousMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 2, 1); // month - 2 で前月
  return formatMonth(date);
}

/**
 * 次月を YYYY-MM 形式で取得
 */
export function getNextMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month, 1); // month で次月
  return formatMonth(date);
}

/**
 * 相対日付をフォーマット（Today, Yesterday, Jan 12, Jan 12, 2025）
 */
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // 日付のみで比較（時刻を無視）
  const isToday = isSameDay(date, today);
  const isYesterday = isSameDay(date, yesterday);
  const isThisYear = date.getFullYear() === today.getFullYear();
  
  if (isToday) {
    return 'Today';
  }
  if (isYesterday) {
    return 'Yesterday';
  }
  if (isThisYear) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    // "Jan 12"
  }
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
  // "Jan 12, 2025"
}

/**
 * 2つの日付が同じ日かどうかを判定
 */
function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

/**
 * 月表示をフォーマット（January 2026）
 */
export function formatMonthDisplay(yearMonth: string): string {
  // yearMonth: "2026-01"
  const [year, month] = yearMonth.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });
  // "January 2026"
}

/**
 * 金額をフォーマット（支出・収入・残高に対応）
 */
export function formatCurrency(
  amount: number, 
  options?: { 
    showSign?: boolean;
    type?: 'expense' | 'income' | 'balance';
  }
): string {
  const { showSign = false, type = 'balance' } = options || {};
  
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absAmount);
  
  if (showSign) {
    if (type === 'expense' || amount < 0) {
      return `-${formatted}`;
    }
    if (type === 'income' || amount > 0) {
      return `+${formatted}`;
    }
  }
  
  return amount < 0 ? `-${formatted}` : formatted;
}
