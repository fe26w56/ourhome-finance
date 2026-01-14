/**
 * TanStack Query クエリキー設計
 */

import type { TransactionFilter } from '../types/domain';

/**
 * フィルターパラメータ型
 */
export interface FilterParams {
  q?: string;
  start_date?: string;
  end_date?: string;
  category_ids?: string[];
  member_ids?: string[];
  type?: 'expense' | 'income';
  shared?: boolean;
  min_amount?: number;
  max_amount?: number;
  sort_by?: 'date' | 'amount' | 'category';
  sort_order?: 'asc' | 'desc';
}

/**
 * クエリキーファクトリ
 */
export const queryKeys = {
  // ユーザー
  user: {
    detail: (userId: string) => ['user', userId] as const,
    settings: (userId: string) => ['user', userId, 'settings'] as const,
  },

  // グループ
  groups: {
    list: (userId: string) => ['groups', 'list', userId] as const,
    detail: (groupId: string) => ['groups', 'detail', groupId] as const,
  },

  // メンバー
  members: {
    list: (groupId: string) => ['members', 'list', groupId] as const,
  },

  // 取引
  transactions: {
    list: (groupId: string, filters?: FilterParams) =>
      ['transactions', 'list', groupId, filters] as const,
    detail: (id: string) => ['transactions', 'detail', id] as const,
  },

  // カテゴリ
  categories: {
    list: (groupId: string) => ['categories', 'list', groupId] as const,
    detail: (id: string) => ['categories', 'detail', id] as const,
  },

  // 予算（全期間共通）
  budgets: {
    list: (groupId: string) =>
      ['budgets', 'list', groupId] as const,
    detail: (id: string) => ['budgets', 'detail', id] as const,
  },

  // 目標
  goals: {
    list: (groupId: string) => ['goals', 'list', groupId] as const,
    detail: (id: string) => ['goals', 'detail', id] as const,
  },

  // 精算
  settlement: {
    balance: (groupId: string) => ['settlement', 'balance', groupId] as const,
    history: (groupId: string) => ['settlement', 'history', groupId] as const,
  },

  // 統計
  stats: {
    monthlySummary: (groupId: string, yearMonth: string) =>
      ['stats', 'monthly-summary', groupId, yearMonth] as const,
    categoryStats: (groupId: string, yearMonth: string) =>
      ['stats', 'category', groupId, yearMonth] as const,
    dailyTrend: (groupId: string, yearMonth: string) =>
      ['stats', 'daily-trend', groupId, yearMonth] as const,
    memberContribution: (groupId: string, yearMonth: string) =>
      ['stats', 'member-contribution', groupId, yearMonth] as const,
  },
};

/**
 * フィルター状態からパラメータを生成
 */
export function filterToParams(filter: TransactionFilter): FilterParams {
  return {
    q: filter.searchQuery || undefined,
    start_date: filter.dateRange.start || undefined,
    end_date: filter.dateRange.end || undefined,
    category_ids: filter.categoryIds.length > 0 ? filter.categoryIds : undefined,
    member_ids: filter.memberIds.length > 0 ? filter.memberIds : undefined,
    type: filter.transactionType !== 'all' ? filter.transactionType : undefined,
    shared:
      filter.sharedType !== 'all'
        ? filter.sharedType === 'shared'
        : undefined,
    min_amount: filter.amountRange.min ?? undefined,
    max_amount: filter.amountRange.max ?? undefined,
    sort_by: filter.sortBy,
    sort_order: filter.sortOrder,
  };
}
