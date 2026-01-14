/**
 * 予算サービス
 * Supabase APIを使用した予算のCRUD操作
 * 
 * 注意: 予算は全期間共通（year_month = "0000-00" 固定）
 */

import { supabase } from '../lib/supabase';
import { Budget, Category } from '../types/database';

export interface BudgetWithCategory extends Budget {
  category?: Category;
}

/**
 * 全期間共通予算を表す固定値
 */
export const BUDGET_YEAR_MONTH_ALL = '0000-00';

/**
 * 予算一覧を取得（全期間共通）
 */
export async function getBudgets(
  groupId: string
): Promise<BudgetWithCategory[]> {
  const { data, error } = await supabase
    .from('budgets')
    .select('*, categories(*)')
    .eq('group_id', groupId)
    .eq('year_month', BUDGET_YEAR_MONTH_ALL)
    .order('category_id', { ascending: true, nullsFirst: true });

  if (error) {
    throw new Error(`Failed to fetch budgets: ${error.message}`);
  }

  return (data || []).map((item: Record<string, unknown>) => ({
    ...mapBudgetFromDB(item),
    category: item.categories ? mapCategoryFromDB(item.categories as Record<string, unknown>) : undefined,
  }));
}

/**
 * 予算を設定（Upsert）- 全期間共通
 */
export async function upsertBudget(
  budget: {
    groupId: string;
    categoryId: string | null; // null = 全体予算
    amount: number;
    carryOver?: boolean;
  }
): Promise<Budget> {
  const { data, error } = await supabase
    .from('budgets')
    .upsert(
      {
        group_id: budget.groupId,
        category_id: budget.categoryId,
        year_month: BUDGET_YEAR_MONTH_ALL,
        amount: budget.amount,
        carry_over: budget.carryOver ?? false,
      },
      {
        onConflict: 'group_id,category_id,year_month',
      }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upsert budget: ${error.message}`);
  }

  return mapBudgetFromDB(data);
}

/**
 * 予算を削除
 */
export async function deleteBudget(budgetId: string): Promise<void> {
  const { error } = await supabase.from('budgets').delete().eq('id', budgetId);

  if (error) {
    throw new Error(`Failed to delete budget: ${error.message}`);
  }
}

/**
 * 予算を翌月へコピー
 * @deprecated 予算は全期間共通になったため、この関数は不要です
 */
export async function copyBudgetsToNextMonth(
  _groupId: string,
  _sourceMonth: string,
  _targetMonth: string
): Promise<void> {
  // 予算は全期間共通のため、コピー不要
  console.warn('copyBudgetsToNextMonth is deprecated. Budgets are now shared across all periods.');
}

/**
 * データベースのスネークケース形式をキャメルケースに変換
 */
function mapBudgetFromDB(data: Record<string, unknown>): Budget {
  return {
    id: data.id as string,
    groupId: data.group_id as string,
    categoryId: data.category_id as string | null,
    yearMonth: data.year_month as string,
    amount: data.amount as number,
    carryOver: data.carry_over as boolean,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapCategoryFromDB(data: Record<string, unknown>): Category {
  return {
    id: data.id as string,
    groupId: data.group_id as string,
    name: data.name as string,
    icon: data.icon as string,
    color: data.color as string,
    type: data.type as 'expense' | 'income' | 'both',
    sortOrder: data.sort_order as number,
    isDefault: data.is_default as boolean,
    isActive: data.is_active as boolean,
    createdAt: data.created_at as string,
  };
}
