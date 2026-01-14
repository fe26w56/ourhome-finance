/**
 * 目標関連のTanStack Queryフック
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGoals, createGoal, updateGoal, addContribution } from '../services/goalService';
import { queryKeys } from '../lib/queryKeys';

/**
 * 目標一覧を取得
 */
export function useGoals(groupId: string, includeAchieved: boolean = false) {
  return useQuery({
    queryKey: [...queryKeys.goals.list(groupId), includeAchieved],
    queryFn: () => getGoals(groupId, includeAchieved),
    enabled: !!groupId,
  });
}

/**
 * 目標を作成
 */
export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (goal: Parameters<typeof createGoal>[0]) => createGoal(goal),
    onSuccess: (_, variables) => {
      // 目標一覧を再取得
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.list(variables.groupId) });
    },
  });
}

/**
 * 目標を更新
 */
export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      goalId,
      updates,
      groupId,
    }: {
      goalId: string;
      updates: Parameters<typeof updateGoal>[1];
      groupId: string;
    }) => updateGoal(goalId, updates),
    onSuccess: (data, variables) => {
      // 目標一覧を更新
      queryClient.setQueryData(
        queryKeys.goals.list(variables.groupId),
        (old: any) => {
          if (!old) return old;
          return old.map((goal: any) => (goal.id === data.id ? data : goal));
        }
      );
    },
  });
}

/**
 * 目標への入金を追加
 */
export function useAddContribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contribution: Parameters<typeof addContribution>[0]) =>
      addContribution(contribution),
    onSuccess: (data, variables) => {
      // 目標一覧を更新
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.list(data.goal.groupId) });
    },
  });
}
