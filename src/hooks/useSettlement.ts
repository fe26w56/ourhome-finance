/**
 * 精算関連のTanStack Queryフック
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSettlementBalance,
  recordSettlement,
  getSettlementHistory,
} from '../services/settlementService';
import { queryKeys } from '../lib/queryKeys';

/**
 * 精算残高を取得
 */
export function useSettlementBalance(groupId: string) {
  return useQuery({
    queryKey: queryKeys.settlement.balance(groupId),
    queryFn: () => getSettlementBalance(groupId),
    enabled: !!groupId,
  });
}

/**
 * 精算を記録
 */
export function useRecordSettlement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settlement: Parameters<typeof recordSettlement>[0]) =>
      recordSettlement(settlement),
    onSuccess: (_, variables) => {
      // 精算残高と履歴を再取得
      queryClient.invalidateQueries({
        queryKey: queryKeys.settlement.balance(variables.groupId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.settlement.history(variables.groupId),
      });
    },
  });
}

/**
 * 精算履歴を取得
 */
export function useSettlementHistory(groupId: string) {
  return useQuery({
    queryKey: queryKeys.settlement.history(groupId),
    queryFn: () => getSettlementHistory(groupId),
    enabled: !!groupId,
  });
}
