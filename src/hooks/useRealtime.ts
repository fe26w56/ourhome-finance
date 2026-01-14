/**
 * リアルタイム同期フック
 * Supabase Realtimeを使用したリアルタイム更新
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { useAppStore } from '../stores/useAppStore';
import { TransactionWithDetails } from '../services/transactionService';

/**
 * 取引のリアルタイム購読
 */
export function useRealtimeTransactions(groupId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useAppStore();

  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel(`transactions:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          console.log('Transaction change:', payload);

          // 取引一覧を無効化して再取得
          queryClient.invalidateQueries({
            queryKey: queryKeys.transactions.list(groupId),
          });

          // イベントに応じた通知
          if (payload.eventType === 'INSERT') {
            // 新しい取引が追加された場合
            const newTransaction = payload.new as any;
            supabase.auth.getUser().then(({ data: { user } }) => {
              if (newTransaction.created_by !== user?.id) {
                showToast('新しい取引が追加されました', 'info');
              }
            });
          } else if (payload.eventType === 'UPDATE') {
            // 自分以外の更新のみ通知
            const updatedTransaction = payload.new as any;
            supabase.auth.getUser().then(({ data: { user } }) => {
              if (updatedTransaction.updated_by !== user?.id) {
                showToast('取引が更新されました', 'info');
              }
            });
          } else if (payload.eventType === 'DELETE') {
            showToast('取引が削除されました', 'info');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, queryClient, showToast]);
}

/**
 * 取引分割のリアルタイム購読
 */
export function useRealtimeTransactionSplits(groupId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!groupId) return;

    // 取引分割は取引テーブルと一緒に更新されるため、取引の購読でカバー
    // 必要に応じて個別に購読することも可能
    const channel = supabase
      .channel(`transaction_splits:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transaction_splits',
        },
        () => {
          // 取引一覧を無効化（分割情報も含まれるため）
          queryClient.invalidateQueries({
            queryKey: queryKeys.transactions.list(groupId),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, queryClient]);
}

/**
 * 精算のリアルタイム購読
 */
export function useRealtimeSettlements(groupId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useAppStore();

  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel(`settlements:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'settlements',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          console.log('Settlement change:', payload);

          // 精算残高と履歴を無効化
          queryClient.invalidateQueries({
            queryKey: queryKeys.settlement.balance(groupId),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.settlement.history(groupId),
          });

          if (payload.eventType === 'INSERT') {
            showToast('精算が記録されました', 'info');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, queryClient, showToast]);
}

/**
 * 予算のリアルタイム購読
 */
export function useRealtimeBudgets(groupId: string, yearMonth: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!groupId || !yearMonth) return;

    const channel = supabase
      .channel(`budgets:${groupId}:${yearMonth}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budgets',
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          // 予算一覧を無効化
          queryClient.invalidateQueries({
            queryKey: queryKeys.budgets.list(groupId, yearMonth),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, yearMonth, queryClient]);
}

/**
 * カテゴリのリアルタイム購読
 */
export function useRealtimeCategories(groupId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel(`categories:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          // カテゴリ一覧を無効化
          queryClient.invalidateQueries({
            queryKey: queryKeys.categories.list(groupId),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, queryClient]);
}

/**
 * すべてのリアルタイム購読を設定
 */
export function useRealtime(groupId: string, yearMonth: string) {
  useRealtimeTransactions(groupId);
  useRealtimeTransactionSplits(groupId);
  useRealtimeSettlements(groupId);
  useRealtimeBudgets(groupId, yearMonth);
  useRealtimeCategories(groupId);
}
