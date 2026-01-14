/**
 * オフラインキュー管理ストア
 * オフライン時の操作を保存し、オンライン復帰時に同期する
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: 'transactions' | 'transaction_splits' | 'settlements' | 'budgets' | 'goals' | 'goal_contributions';
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

interface OfflineState {
  // オフライン状態
  isOnline: boolean;
  
  // 保留中の操作
  pendingOperations: PendingOperation[];
  
  // 同期中フラグ
  isSyncing: boolean;
  
  // アクション
  setOnlineStatus: (isOnline: boolean) => void;
  addPendingOperation: (op: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>) => void;
  removePendingOperation: (id: string) => void;
  incrementRetryCount: (id: string) => void;
  setIsSyncing: (isSyncing: boolean) => void;
  clearAllPending: () => void;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      pendingOperations: [],
      isSyncing: false,

      setOnlineStatus: (isOnline) => set({ isOnline }),

      addPendingOperation: (op) => {
        set((state) => ({
          pendingOperations: [
            ...state.pendingOperations,
            {
              ...op,
              id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              timestamp: Date.now(),
              retryCount: 0,
            },
          ],
        }));
      },

      removePendingOperation: (id) => {
        set((state) => ({
          pendingOperations: state.pendingOperations.filter((op) => op.id !== id),
        }));
      },

      incrementRetryCount: (id) => {
        set((state) => ({
          pendingOperations: state.pendingOperations.map((op) =>
            op.id === id ? { ...op, retryCount: op.retryCount + 1 } : op
          ),
        }));
      },

      setIsSyncing: (isSyncing) => set({ isSyncing }),

      clearAllPending: () => set({ pendingOperations: [] }),
    }),
    {
      name: 'ourhome-offline-store',
      partialize: (state) => ({
        pendingOperations: state.pendingOperations,
      }),
    }
  )
);
