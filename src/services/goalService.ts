/**
 * 目標サービス
 * Supabase APIを使用した目標のCRUD操作
 */

import { supabase } from '../lib/supabase';
import { Goal, GoalContribution, Category } from '../types/database';

export interface GoalWithCategory extends Goal {
  category?: Category;
}

/**
 * 目標一覧を取得
 */
export async function getGoals(
  groupId: string,
  includeAchieved: boolean = false
): Promise<GoalWithCategory[]> {
  let query = supabase
    .from('goals')
    .select('*, categories(*)')
    .eq('group_id', groupId);

  if (!includeAchieved) {
    query = query.eq('is_achieved', false);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch goals: ${error.message}`);
  }

  return (data || []).map((item: Record<string, unknown>) => ({
    ...mapGoalFromDB(item),
    category: item.categories ? mapCategoryFromDB(item.categories as Record<string, unknown>) : undefined,
  }));
}

/**
 * 目標を作成
 */
export async function createGoal(
  goal: {
    groupId: string;
    name: string;
    type: 'savings' | 'spending_limit';
    targetAmount: number;
    categoryId?: string | null;
    startDate: string; // YYYY-MM-DD
    endDate?: string | null;
    isRecurring?: boolean;
  }
): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .insert({
      group_id: goal.groupId,
      name: goal.name,
      type: goal.type,
      target_amount: goal.targetAmount,
      current_amount: 0,
      category_id: goal.categoryId || null,
      start_date: goal.startDate,
      end_date: goal.endDate || null,
      is_recurring: goal.isRecurring ?? false,
      is_achieved: false,
      achieved_at: null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create goal: ${error.message}`);
  }

  return mapGoalFromDB(data);
}

/**
 * 目標を更新
 */
export async function updateGoal(
  goalId: string,
  updates: {
    name?: string;
    targetAmount?: number;
    currentAmount?: number;
    categoryId?: string | null;
    endDate?: string | null;
    isRecurring?: boolean;
    isAchieved?: boolean;
    achievedAt?: string | null;
  }
): Promise<Goal> {
  const updateData: Record<string, unknown> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.targetAmount !== undefined) updateData.target_amount = updates.targetAmount;
  if (updates.currentAmount !== undefined) updateData.current_amount = updates.currentAmount;
  if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
  if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
  if (updates.isRecurring !== undefined) updateData.is_recurring = updates.isRecurring;
  if (updates.isAchieved !== undefined) updateData.is_achieved = updates.isAchieved;
  if (updates.achievedAt !== undefined) updateData.achieved_at = updates.achievedAt;

  const { data, error } = await supabase
    .from('goals')
    .update(updateData)
    .eq('id', goalId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update goal: ${error.message}`);
  }

  return mapGoalFromDB(data);
}

/**
 * 目標への入金を追加
 */
export async function addContribution(
  contribution: {
    goalId: string;
    userId: string;
    amount: number;
    date: string; // YYYY-MM-DD
    note?: string;
  }
): Promise<{ contribution: GoalContribution; goal: Goal }> {
  // 1. 入金レコードを作成
  const { data: contributionData, error: contributionError } = await supabase
    .from('goal_contributions')
    .insert({
      goal_id: contribution.goalId,
      user_id: contribution.userId,
      amount: contribution.amount,
      date: contribution.date,
      note: contribution.note || null,
    })
    .select()
    .single();

  if (contributionError) {
    throw new Error(`Failed to add contribution: ${contributionError.message}`);
  }

  // 2. 現在の目標を取得して金額を加算
  const { data: currentGoal, error: goalError } = await supabase
    .from('goals')
    .select('current_amount, target_amount')
    .eq('id', contribution.goalId)
    .single();

  if (goalError) {
    throw new Error(`Failed to fetch goal: ${goalError.message}`);
  }

  const newCurrentAmount = (currentGoal?.current_amount || 0) + contribution.amount;
  const targetAmount = currentGoal?.target_amount || 0;
  const isAchieved = newCurrentAmount >= targetAmount;

  const updatedGoal = await updateGoal(contribution.goalId, {
    currentAmount: newCurrentAmount,
    isAchieved,
    achievedAt: isAchieved ? new Date().toISOString().split('T')[0] : null,
  });

  return {
    contribution: mapGoalContributionFromDB(contributionData),
    goal: updatedGoal,
  };
}

/**
 * データベースのスネークケース形式をキャメルケースに変換
 */
function mapGoalFromDB(data: Record<string, unknown>): Goal {
  return {
    id: data.id as string,
    groupId: data.group_id as string,
    name: data.name as string,
    type: data.type as 'savings' | 'spending_limit',
    targetAmount: data.target_amount as number,
    currentAmount: data.current_amount as number,
    categoryId: data.category_id as string | null,
    startDate: data.start_date as string,
    endDate: data.end_date as string | null,
    isRecurring: data.is_recurring as boolean,
    isAchieved: data.is_achieved as boolean,
    achievedAt: data.achieved_at as string | null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapGoalContributionFromDB(data: Record<string, unknown>): GoalContribution {
  return {
    id: data.id as string,
    goalId: data.goal_id as string,
    userId: data.user_id as string,
    amount: data.amount as number,
    date: data.date as string,
    note: data.note as string | null,
    createdAt: data.created_at as string,
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
