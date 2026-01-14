/**
 * 統計サービス
 * Supabase RPC関数を使用した統計情報の取得
 */

import { supabase } from '../lib/supabase';

export interface MonthlySummary {
  totalExpense: number;
  totalIncome: number;
  totalBudget: number;
  budgetRemaining: number;
  transactionCount: number;
  prevMonthExpense: number;
  expenseDiffPercent: number;
}

export interface CategoryStat {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  amount: number;
  budgetAmount: number | null;
  count: number;
}

export interface DailyTrend {
  date: string; // YYYY-MM-DD
  expense: number;
  income: number;
}

/**
 * 月次サマリーを取得
 */
export async function getMonthlySummary(
  groupId: string,
  yearMonth: string // YYYY-MM
): Promise<MonthlySummary> {
  // まずRPC関数を試す
  const { data, error } = await supabase.rpc('get_monthly_summary', {
    group_uuid: groupId,
    year_month_param: yearMonth,
  });

  // RPC関数が存在しない場合はフォールバック
  if (error) {
    return getMonthlySummaryFallback(groupId, yearMonth);
  }

  console.log('getMonthlySummary raw data:', data);

  // RETURNS TABLE なので配列として返される
  const result = Array.isArray(data) ? data[0] : data;
  
  if (!result) {
    return {
      totalExpense: 0,
      totalIncome: 0,
      totalBudget: 0,
      budgetRemaining: 0,
      transactionCount: 0,
      prevMonthExpense: 0,
      expenseDiffPercent: 0,
    };
  }

  return {
    totalExpense: (result.total_expense as number) || 0,
    totalIncome: (result.total_income as number) || 0,
    totalBudget: (result.total_budget as number) || 0,
    budgetRemaining: (result.budget_remaining as number) || 0,
    transactionCount: (result.transaction_count as number) || 0,
    prevMonthExpense: (result.prev_month_expense as number) || 0,
    expenseDiffPercent: (result.expense_diff_percent as number) || 0,
  };
}

/**
 * RPC関数が存在しない場合のフォールバック
 */
async function getMonthlySummaryFallback(
  groupId: string,
  yearMonth: string
): Promise<MonthlySummary> {
  const startDate = `${yearMonth}-01`;
  const [year, month] = yearMonth.split('-').map(Number);
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  // 取引を取得
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('group_id', groupId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (txError) {
    console.error('Fallback transactions error:', txError);
    return {
      totalExpense: 0,
      totalIncome: 0,
      totalBudget: 0,
      budgetRemaining: 0,
      transactionCount: 0,
      prevMonthExpense: 0,
      expenseDiffPercent: 0,
    };
  }

  // 予算を取得（全期間共通）
  const { data: budgets } = await supabase
    .from('budgets')
    .select('amount, category_id')
    .eq('group_id', groupId)
    .eq('year_month', '0000-00');

  const totalBudget = budgets?.find(b => b.category_id === null)?.amount || 0;

  // 集計
  let totalExpense = 0;
  let totalIncome = 0;
  (transactions || []).forEach((tx: { type: string; amount: number }) => {
    if (tx.type === 'expense') {
      totalExpense += tx.amount;
    } else {
      totalIncome += tx.amount;
    }
  });

  return {
    totalExpense,
    totalIncome,
    totalBudget,
    budgetRemaining: totalBudget > 0 ? totalBudget - totalExpense : 0,
    transactionCount: transactions?.length || 0,
    prevMonthExpense: 0,
    expenseDiffPercent: 0,
  };
}

/**
 * カテゴリ別統計を取得
 */
export async function getCategoryStats(
  groupId: string,
  yearMonth: string // YYYY-MM
): Promise<CategoryStat[]> {
  const { data, error } = await supabase.rpc('get_category_stats', {
    group_uuid: groupId,
    year_month_param: yearMonth,
  });

  // RPC関数が存在しない場合はフォールバック
  if (error) {
    return getCategoryStatsFallback(groupId, yearMonth);
  }

  return (data || []).map((item: Record<string, unknown>) => ({
    categoryId: item.category_id as string,
    categoryName: item.category_name as string,
    categoryIcon: item.category_icon as string,
    categoryColor: item.category_color as string,
    amount: (item.total_amount as number) || 0,
    budgetAmount: (item.budget_amount as number) || null,
    count: (item.transaction_count as number) || 0,
  }));
}

/**
 * カテゴリ別統計のフォールバック
 */
async function getCategoryStatsFallback(
  groupId: string,
  yearMonth: string
): Promise<CategoryStat[]> {
  const startDate = `${yearMonth}-01`;
  const [year, month] = yearMonth.split('-').map(Number);
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  // カテゴリと取引を取得
  const { data: transactions } = await supabase
    .from('transactions')
    .select('category_id, amount, type')
    .eq('group_id', groupId)
    .eq('type', 'expense')
    .gte('date', startDate)
    .lte('date', endDate);

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, icon, color')
    .eq('group_id', groupId);

  const { data: budgets } = await supabase
    .from('budgets')
    .select('category_id, amount')
    .eq('group_id', groupId)
    .eq('year_month', '0000-00');

  // カテゴリ別に集計
  const categoryTotals = new Map<string, { amount: number; count: number }>();
  (transactions || []).forEach((tx: { category_id: string; amount: number }) => {
    const current = categoryTotals.get(tx.category_id) || { amount: 0, count: 0 };
    categoryTotals.set(tx.category_id, {
      amount: current.amount + tx.amount,
      count: current.count + 1,
    });
  });

  // 結果を構築
  const result: CategoryStat[] = [];
  categoryTotals.forEach((totals, categoryId) => {
    const category = categories?.find(c => c.id === categoryId);
    const budget = budgets?.find(b => b.category_id === categoryId);
    if (category) {
      result.push({
        categoryId,
        categoryName: category.name,
        categoryIcon: category.icon,
        categoryColor: category.color,
        amount: totals.amount,
        budgetAmount: budget?.amount || null,
        count: totals.count,
      });
    }
  });

  return result.sort((a, b) => b.amount - a.amount);
}

/**
 * 日別推移を取得
 */
export async function getDailyTrend(
  groupId: string,
  yearMonth: string // YYYY-MM
): Promise<DailyTrend[]> {
  // 年月から日付範囲を計算
  const startDate = `${yearMonth}-01`;
  const endDate = new Date(
    parseInt(yearMonth.split('-')[0]),
    parseInt(yearMonth.split('-')[1]),
    0
  ).toISOString().split('T')[0]; // 月末日を取得

  const { data, error } = await supabase.rpc('get_daily_trend', {
    group_uuid: groupId,
    start_date_param: startDate,
    end_date_param: endDate,
  });

  // RPC関数が存在しない場合はフォールバック
  if (error) {
    return getDailyTrendFallback(groupId, startDate, endDate);
  }

  return (data || []).map((item: Record<string, unknown>) => ({
    date: item.date as string,
    expense: (item.expense as number) || 0,
    income: (item.income as number) || 0,
  }));
}

/**
 * 日別推移のフォールバック
 */
async function getDailyTrendFallback(
  groupId: string,
  startDate: string,
  endDate: string
): Promise<DailyTrend[]> {
  const { data: transactions } = await supabase
    .from('transactions')
    .select('date, type, amount')
    .eq('group_id', groupId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  // 日付別に集計
  const dailyTotals = new Map<string, { expense: number; income: number }>();
  (transactions || []).forEach((tx: { date: string; type: string; amount: number }) => {
    const current = dailyTotals.get(tx.date) || { expense: 0, income: 0 };
    if (tx.type === 'expense') {
      current.expense += tx.amount;
    } else {
      current.income += tx.amount;
    }
    dailyTotals.set(tx.date, current);
  });

  // 配列に変換
  const result: DailyTrend[] = [];
  dailyTotals.forEach((totals, date) => {
    result.push({
      date,
      expense: totals.expense,
      income: totals.income,
    });
  });

  return result.sort((a, b) => a.date.localeCompare(b.date));
}
