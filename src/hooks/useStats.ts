/**
 * 統計関連のTanStack Queryフック
 */

import { useQuery } from '@tanstack/react-query';
import {
  getMonthlySummary,
  getCategoryStats,
  getDailyTrend,
} from '../services/statsService';
import { queryKeys } from '../lib/queryKeys';

/**
 * 月次サマリーを取得
 */
export function useMonthlySummary(groupId: string, yearMonth: string) {
  return useQuery({
    queryKey: queryKeys.stats.monthlySummary(groupId, yearMonth),
    queryFn: () => getMonthlySummary(groupId, yearMonth),
    enabled: !!groupId && !!yearMonth,
  });
}

/**
 * カテゴリ別統計を取得
 */
export function useCategoryStats(groupId: string, yearMonth: string) {
  return useQuery({
    queryKey: queryKeys.stats.categoryStats(groupId, yearMonth),
    queryFn: () => getCategoryStats(groupId, yearMonth),
    enabled: !!groupId && !!yearMonth,
  });
}

/**
 * 日別推移を取得
 */
export function useDailyTrend(groupId: string, yearMonth: string) {
  return useQuery({
    queryKey: queryKeys.stats.dailyTrend(groupId, yearMonth),
    queryFn: () => getDailyTrend(groupId, yearMonth),
    enabled: !!groupId && !!yearMonth,
  });
}
