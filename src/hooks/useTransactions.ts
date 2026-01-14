/**
 * 取引関連のTanStack Queryフック
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTransactions,
  getTransaction,
  createTransaction,
  createTransactionWithSplits,
  createTransactionWithBeneficiaries,
  updateTransaction,
  updateTransactionWithBeneficiaries,
  deleteTransaction,
  saveBeneficiaries,
  TransactionFilters,
} from '../services/transactionService';
import { TransactionWithDetails } from '../services/transactionService';
import { queryKeys, filterToParams } from '../lib/queryKeys';
import { useFilterStore } from '../stores/useFilterStore';
import { useAuthStore } from '../stores/useAuthStore';

/**
 * 取引一覧を取得（フィルタ対応）
 */
export function useTransactions(groupId: string) {
  const filterState = useFilterStore();

  const filters: TransactionFilters = {
    groupId,
    dateRange: filterState.dateRange.start || filterState.dateRange.end
      ? {
          start: filterState.dateRange.start || '',
          end: filterState.dateRange.end || '',
        }
      : undefined,
    categoryIds: filterState.categoryIds.length > 0 ? filterState.categoryIds : undefined,
    type: filterState.transactionType !== 'all' ? filterState.transactionType : undefined,
    isShared:
      filterState.sharedType !== 'all'
        ? filterState.sharedType === 'shared'
        : undefined,
    memo: filterState.searchQuery || undefined,
    amountRange:
      filterState.amountRange.min !== undefined || filterState.amountRange.max !== undefined
        ? {
            min: filterState.amountRange.min,
            max: filterState.amountRange.max,
          }
        : undefined,
  };

  const queryKey = queryKeys.transactions.list(groupId, filterToParams(filterState));

  return useQuery({
    queryKey: queryKey,
    queryFn: () => getTransactions(filters),
    enabled: !!groupId,
  });
}

/**
 * 取引詳細を取得
 */
export function useTransaction(transactionId: string) {
  return useQuery({
    queryKey: queryKeys.transactions.detail(transactionId),
    queryFn: () => getTransaction(transactionId),
    enabled: !!transactionId,
  });
}

/**
 * 取引を作成（楽観的更新付き）
 */
export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: ({
      transaction,
      splits,
      beneficiaryIds,
    }: {
      transaction: Omit<Parameters<typeof createTransaction>[0], 'isShared'> & { isShared?: boolean };
      splits?: Parameters<typeof createTransactionWithSplits>[1];
      beneficiaryIds?: string[];
    }) => {
      const currentUserId = user?.id || transaction.paidBy;
      
      // beneficiaryIds が指定されている場合は新しい関数を使用
      if (beneficiaryIds && beneficiaryIds.length > 0) {
        return createTransactionWithBeneficiaries(
          {
            groupId: transaction.groupId,
            categoryId: transaction.categoryId,
            type: transaction.type,
            amount: transaction.amount,
            date: transaction.date,
            memo: transaction.memo,
            paidBy: transaction.paidBy,
            receiptUrl: transaction.receiptUrl,
          },
          beneficiaryIds,
          currentUserId
        );
      }
      
      // 従来の処理（後方互換性）
      const txWithShared = {
        ...transaction,
        isShared: transaction.isShared ?? true,
      };
      
      if (splits && splits.length > 0) {
        return createTransactionWithSplits(txWithShared, splits);
      }
      return createTransaction(txWithShared);
    },
    onMutate: async (variables) => {
      // 楽観的更新: 一時的にキャッシュに追加
      const queryKey = queryKeys.transactions.list(variables.transaction.groupId);
      await queryClient.cancelQueries({ queryKey });

      const previousTransactions = queryClient.getQueryData<TransactionWithDetails[]>(queryKey);

      // 楽観的な取引データを作成
      const optimisticTransaction: TransactionWithDetails = {
        id: `temp-${Date.now()}`,
        ...variables.transaction,
        isShared: variables.transaction.isShared ?? true,
        createdBy: user?.id || variables.transaction.paidBy,
        receiptUrl: variables.transaction.receiptUrl || null,
        category: {} as any, // 後で実際のデータで置き換えられる
        paidByUser: {} as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<TransactionWithDetails[]>(queryKey, (old) => [
        optimisticTransaction,
        ...(old || []),
      ]);

      return { previousTransactions };
    },
    onError: (err, variables, context) => {
      // エラー時はロールバック
      if (context?.previousTransactions) {
        queryClient.setQueryData(
          queryKeys.transactions.list(variables.transaction.groupId),
          context.previousTransactions
        );
      }
    },
    onSuccess: (data, variables) => {
      const groupId = variables.transaction.groupId;
      
      // 取引リストを無効化（フィルタ付きクエリも含む）
      queryClient.invalidateQueries({
        queryKey: ['transactions', 'list', groupId],
      });
      // 統計データを無効化（Home画面の集計に反映）
      queryClient.invalidateQueries({
        queryKey: ['stats'],
        predicate: (query) => query.queryKey[2] === groupId,
      });
      // 精算残高を無効化（Home画面のSettlementカードに反映）
      queryClient.invalidateQueries({
        queryKey: queryKeys.settlement.balance(groupId),
      });
      // 取引詳細もキャッシュ
      queryClient.setQueryData(queryKeys.transactions.detail(data.id), data);
    },
  });
}

/**
 * 取引を更新
 */
export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: ({
      transactionId,
      updates,
      groupId,
      beneficiaryIds,
    }: {
      transactionId: string;
      updates: Parameters<typeof updateTransaction>[1];
      groupId: string;
      beneficiaryIds?: string[];
    }) => {
      const currentUserId = user?.id || updates.paidBy || '';
      
      // beneficiaryIds が指定されている場合は新しい関数を使用
      if (beneficiaryIds && beneficiaryIds.length > 0) {
        return updateTransactionWithBeneficiaries(
          transactionId,
          updates,
          beneficiaryIds,
          currentUserId
        );
      }
      
      // 従来の処理（後方互換性）
      return updateTransaction(transactionId, updates);
    },
    onSuccess: (data, variables) => {
      const groupId = variables.groupId;
      
      // 取引リストを無効化（フィルタ付きクエリも含む）
      queryClient.invalidateQueries({
        queryKey: ['transactions', 'list', groupId],
      });
      // 統計データを無効化（Home画面の集計に反映）
      queryClient.invalidateQueries({
        queryKey: ['stats'],
        predicate: (query) => query.queryKey[2] === groupId,
      });
      // 精算残高を無効化（Home画面のSettlementカードに反映）
      queryClient.invalidateQueries({
        queryKey: queryKeys.settlement.balance(groupId),
      });
      // 取引詳細を更新
      queryClient.setQueryData(queryKeys.transactions.detail(variables.transactionId), data);
    },
  });
}

/**
 * 取引を削除
 */
export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transactionId, groupId }: { transactionId: string; groupId: string }) =>
      deleteTransaction(transactionId),
    onSuccess: (_, variables) => {
      const groupId = variables.groupId;
      
      // 取引リストを無効化（フィルタ付きクエリも含む）
      queryClient.invalidateQueries({
        queryKey: ['transactions', 'list', groupId],
      });
      // 統計データを無効化（Home画面の集計に反映）
      queryClient.invalidateQueries({
        queryKey: ['stats'],
        predicate: (query) => query.queryKey[2] === groupId,
      });
      // 精算残高を無効化（Home画面のSettlementカードに反映）
      queryClient.invalidateQueries({
        queryKey: queryKeys.settlement.balance(groupId),
      });
      // 取引詳細を削除
      queryClient.removeQueries({ queryKey: queryKeys.transactions.detail(variables.transactionId) });
    },
  });
}
