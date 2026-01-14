/**
 * 精算フォームストア
 */

import { create } from 'zustand';

interface SettlementState {
  // 精算対象
  fromUserId: string | null;
  toUserId: string | null;
  amount: string; // 文字列として管理

  // 精算詳細
  settledAt: string; // YYYY-MM-DD
  method: string;
  note: string;

  // 関連取引
  relatedTransactionIds: string[];

  // アクション
  setFromUser: (userId: string) => void;
  setToUser: (userId: string) => void;
  setAmount: (amount: string) => void;
  setSettledAt: (date: string) => void;
  setMethod: (method: string) => void;
  setNote: (note: string) => void;
  setRelatedTransactions: (ids: string[]) => void;

  // リセット
  reset: () => void;
}

const initialState = {
  fromUserId: null,
  toUserId: null,
  amount: '0',
  settledAt: '', // 使用時に設定
  method: '',
  note: '',
  relatedTransactionIds: [],
};

export const useSettlementStore = create<SettlementState>((set) => ({
  ...initialState,

  setFromUser: (fromUserId) => set({ fromUserId }),

  setToUser: (toUserId) => set({ toUserId }),

  setAmount: (amount) => set({ amount }),

  setSettledAt: (settledAt) => set({ settledAt }),

  setMethod: (method) => set({ method }),

  setNote: (note) => set({ note }),

  setRelatedTransactions: (relatedTransactionIds) =>
    set({ relatedTransactionIds }),

  reset: () => set(initialState),
}));
