/**
 * 予算関連のTanStack Queryフック
 * 
 * 注意: 予算は全期間共通（月を跨いで同じ予算が適用される）
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBudgets,
  upsertBudget,
  deleteBudget,
} from '../services/budgetService';
import { queryKeys } from '../lib/queryKeys';

/**
 * 予算一覧を取得（全期間共通）
 */
export function useBudgets(groupId: string) {
  return useQuery({
    queryKey: queryKeys.budgets.list(groupId),
    queryFn: () => getBudgets(groupId),
    enabled: !!groupId,
  });
}

/**
 * 予算を設定（Upsert）- 全期間共通
 */
export function useUpsertBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (budget: Parameters<typeof upsertBudget>[0]) => upsertBudget(budget),
    onSuccess: (data, variables) => {
      // 予算一覧を再取得
      queryClient.invalidateQueries({
        queryKey: queryKeys.budgets.list(variables.groupId),
      });
    },
  });
}

/**
 * 予算を削除
 */
export function useDeleteBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      budgetId,
      groupId,
    }: {
      budgetId: string;
      groupId: string;
    }) => deleteBudget(budgetId),
    onSuccess: (_, variables) => {
      // 予算一覧を再取得
      queryClient.invalidateQueries({
        queryKey: queryKeys.budgets.list(variables.groupId),
      });
    },
  });
}
