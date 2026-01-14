/**
 * 予算計算ロジック
 */

import { Budget } from '../types/database';
import { TransactionWithDetails } from '../services/transactionService';

export interface BudgetStatus {
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  usagePercent: number;
  status: 'normal' | 'warning' | 'danger';
}

/**
 * 予算使用率を計算
 */
export function calculateBudgetStatus(
  budget: Budget,
  transactions: TransactionWithDetails[]
): BudgetStatus {
  const spentAmount = transactions
    .filter(
      (t) =>
        t.type === 'expense' &&
        (budget.categoryId === null || t.categoryId === budget.categoryId)
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const remainingAmount = budget.amount - spentAmount;
  const usagePercent = budget.amount > 0 ? (spentAmount / budget.amount) * 100 : 0;

  let status: 'normal' | 'warning' | 'danger';
  if (usagePercent >= 100) {
    status = 'danger';
  } else if (usagePercent >= 80) {
    status = 'warning';
  } else {
    status = 'normal';
  }

  return {
    budgetAmount: budget.amount,
    spentAmount,
    remainingAmount,
    usagePercent,
    status,
  };
}

export interface CarryOverResult {
  previousRemaining: number;
  newBudget: number;
  totalBudget: number;
}

/**
 * 繰越計算
 */
export function calculateCarryOver(
  previousBudget: Budget,
  previousSpent: number,
  newBudgetAmount: number
): CarryOverResult {
  const previousRemaining = previousBudget.amount - previousSpent;

  // 残額がマイナス（超過）の場合
  if (previousRemaining < 0 && !previousBudget.carryOver) {
    // 繰越OFFの場合はリセット
    return {
      previousRemaining: 0,
      newBudget: newBudgetAmount,
      totalBudget: newBudgetAmount,
    };
  }

  return {
    previousRemaining,
    newBudget: newBudgetAmount,
    totalBudget: newBudgetAmount + previousRemaining,
  };
}
