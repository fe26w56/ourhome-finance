/**
 * オフライン時に表示するバナーコンポーネント
 */

import React from 'react';
import { useOfflineStore } from '../../stores/useOfflineStore';

export const OfflineBanner: React.FC = () => {
  const { isOnline, pendingOperations, isSyncing } = useOfflineStore();

  if (isOnline && pendingOperations.length === 0) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium transition-colors ${
        isOnline
          ? 'bg-blue-500 text-white'
          : 'bg-amber-500 text-black'
      }`}
    >
      {!isOnline ? (
        <div className="flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-base">cloud_off</span>
          <span>オフラインモード</span>
          {pendingOperations.length > 0 && (
            <span className="bg-black/20 px-2 py-0.5 rounded-full text-xs">
              {pendingOperations.length}件の保留中
            </span>
          )}
        </div>
      ) : isSyncing ? (
        <div className="flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-base animate-spin">sync</span>
          <span>{pendingOperations.length}件のデータを同期中...</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-base">sync_problem</span>
          <span>{pendingOperations.length}件の同期待ち</span>
        </div>
      )}
    </div>
  );
};
