/**
 * オンライン状態を監視するカスタムフック
 */

import { useEffect, useRef } from 'react';
import { useOfflineStore } from '../stores/useOfflineStore';
import { useAppStore } from '../stores/useAppStore';
import { queryClient } from '../lib/queryClient';

export function useOnlineStatus() {
  const { isOnline, setOnlineStatus, pendingOperations, setIsSyncing } = useOfflineStore();
  const { showToast } = useAppStore();
  const previousOnlineStatus = useRef(isOnline);

  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
    };

    const handleOffline = () => {
      setOnlineStatus(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 初期状態を設定
    setOnlineStatus(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStatus]);

  // オフライン → オンラインに変わった時の処理
  useEffect(() => {
    if (!previousOnlineStatus.current && isOnline) {
      // オンライン復帰
      if (pendingOperations.length > 0) {
        showToast(`オンラインに復帰しました。${pendingOperations.length}件のデータを同期中...`, 'info');
        // 同期処理は processPendingOperations で行う
      } else {
        showToast('オンラインに復帰しました', 'success');
      }

      // 最新データを取得
      queryClient.invalidateQueries();
    } else if (previousOnlineStatus.current && !isOnline) {
      // オフラインになった
      showToast('オフラインになりました。変更は後で同期されます', 'warning');
    }

    previousOnlineStatus.current = isOnline;
  }, [isOnline, pendingOperations.length, showToast]);

  return { isOnline, pendingOperations };
}

/**
 * 保留中の操作を処理するフック
 */
export function useProcessPendingOperations() {
  const { 
    pendingOperations, 
    removePendingOperation, 
    incrementRetryCount,
    isSyncing,
    setIsSyncing 
  } = useOfflineStore();
  const { showToast } = useAppStore();

  const processPendingOperations = async () => {
    if (isSyncing || pendingOperations.length === 0) return;

    setIsSyncing(true);

    // 古い順に処理
    const sorted = [...pendingOperations].sort((a, b) => a.timestamp - b.timestamp);
    let successCount = 0;
    let failCount = 0;

    for (const op of sorted) {
      // 最大リトライ回数を超えた操作はスキップ
      if (op.retryCount >= 3) {
        failCount++;
        continue;
      }

      try {
        // 動的インポートでサービスを取得
        const { supabase } = await import('../lib/supabase');
        
        switch (op.type) {
          case 'create':
            await supabase.from(op.table).insert(op.data);
            break;
          case 'update':
            await supabase.from(op.table).update(op.data).eq('id', op.data.id);
            break;
          case 'delete':
            await supabase.from(op.table).delete().eq('id', op.data.id);
            break;
        }
        
        removePendingOperation(op.id);
        successCount++;
      } catch (error) {
        console.error('[Offline] Failed to process operation:', op, error);
        incrementRetryCount(op.id);
        failCount++;
      }
    }

    setIsSyncing(false);

    if (successCount > 0) {
      showToast(`${successCount}件のデータを同期しました`, 'success');
    }
    if (failCount > 0) {
      showToast(`${failCount}件の同期に失敗しました`, 'error');
    }
  };

  return { processPendingOperations, isSyncing };
}
