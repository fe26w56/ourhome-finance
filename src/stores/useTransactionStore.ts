/**
 * 取引入力フォームストア
 */

import { create } from 'zustand';
import type { Transaction, TransactionSplit } from '../types/database';
import type { TransactionSplitForm } from '../types/domain';
import { getToday } from '../lib/utils';
import { parseAmount } from '../lib/utils';

interface TransactionFormState {
  // フォーム値
  type: 'expense' | 'income';
  amount: string; // 文字列で管理（電卓入力のため）
  date: string; // YYYY-MM-DD
  categoryId: string | null;
  memo: string;

  // 支払者と受益者
  paidBy: string | null; // ユーザーID
  beneficiaryIds: string[]; // 受益者のユーザーID配列

  // 割り勘設定
  splitType: 'equal' | 'percentage' | 'amount' | 'none';
  splits: TransactionSplitForm[];

  // 編集モード
  editingId: string | null;

  // バリデーション
  errors: Record<string, string>;
  isValid: boolean;

  // アクション
  setType: (type: 'expense' | 'income') => void;
  setAmount: (amount: string) => void;
  appendAmount: (digit: string) => void;
  deleteLastDigit: () => void;
  clearAmount: () => void;
  setDate: (date: string) => void;
  setCategory: (categoryId: string) => void;
  setMemo: (memo: string) => void;
  setPaidBy: (userId: string) => void;
  setBeneficiaryIds: (ids: string[]) => void;
  toggleBeneficiary: (userId: string) => void;
  selectAllBeneficiaries: (memberIds: string[]) => void;
  setSplitType: (splitType: 'equal' | 'percentage' | 'amount' | 'none') => void;
  setSplits: (splits: TransactionSplitForm[]) => void;
  updateSplit: (userId: string, value: string) => void;

  // is_shared の算出
  getIsShared: (currentUserId: string) => boolean;

  // 編集
  loadTransaction: (transaction: Transaction, splits: TransactionSplit[], beneficiaryIds?: string[]) => void;

  // バリデーション
  validate: () => boolean;

  // リセット
  reset: () => void;
}

const initialState = {
  type: 'expense' as const,
  amount: '0',
  date: getToday(),
  categoryId: null,
  memo: '',
  paidBy: null,
  beneficiaryIds: [] as string[],
  splitType: 'none' as const,
  splits: [],
  editingId: null,
  errors: {},
  isValid: false,
};

export const useTransactionStore = create<TransactionFormState>((set, get) => ({
  ...initialState,

  setType: (type) => set({ type }),

  setAmount: (amount) => set({ amount }),

  appendAmount: (digit) => {
    const state = get();
    if (state.amount === '0' && digit !== '.') {
      set({ amount: digit });
      return;
    }
    if (digit === '.' && state.amount.includes('.')) {
      return; // 小数点は1つまで
    }
    // 小数点以下2桁まで
    const parts = state.amount.split('.');
    if (parts[1] && parts[1].length >= 2) {
      return;
    }
    set({ amount: state.amount + digit });
  },

  deleteLastDigit: () => {
    const state = get();
    set({
      amount: state.amount.length > 1 ? state.amount.slice(0, -1) : '0',
    });
  },

  clearAmount: () => set({ amount: '0' }),

  setDate: (date) => set({ date }),

  setCategory: (categoryId) => set({ categoryId }),

  setMemo: (memo) => set({ memo }),

  setPaidBy: (paidBy) => set({ paidBy }),

  setBeneficiaryIds: (beneficiaryIds) => set({ beneficiaryIds }),

  toggleBeneficiary: (userId) => {
    const state = get();
    const beneficiaryIds = state.beneficiaryIds.includes(userId)
      ? state.beneficiaryIds.filter((id) => id !== userId)
      : [...state.beneficiaryIds, userId];
    // 少なくとも1人は選択されている必要がある
    if (beneficiaryIds.length > 0) {
      set({ beneficiaryIds });
    }
  },

  selectAllBeneficiaries: (memberIds) => set({ beneficiaryIds: memberIds }),

  getIsShared: (currentUserId) => {
    const state = get();
    // 1人のみ選択かつ自分自身の場合 → false (Personal)
    if (state.beneficiaryIds.length === 1 && state.beneficiaryIds[0] === currentUserId) {
      return false;
    }
    // それ以外はすべて true (Shared)
    return true;
  },

  setSplitType: (splitType) => set({ splitType }),

  setSplits: (splits) => set({ splits }),

  updateSplit: (userId, value) => {
    const state = get();
    const splits = state.splits.map((split) =>
      split.userId === userId ? { ...split, amount: value } : split
    );
    set({ splits });
  },

  loadTransaction: (transaction, splits, beneficiaryIds) => {
    set({
      type: transaction.type,
      amount: transaction.amount.toString(),
      date: transaction.date,
      categoryId: transaction.categoryId,
      memo: transaction.memo || '',
      paidBy: transaction.paidBy,
      beneficiaryIds: beneficiaryIds || [],
      splitType: splits.length > 0 ? 'amount' : 'none',
      splits: splits.map((split) => ({
        userId: split.userId,
        amount: split.amount.toString(),
        percentage: split.percentage,
      })),
      editingId: transaction.id,
    });
  },

  validate: () => {
    const state = get();
    const errors: Record<string, string> = {};

    // 金額チェック
    const amount = parseAmount(state.amount);
    if (isNaN(amount) || amount <= 0) {
      errors.amount = '金額を入力してください';
    }

    // 割り勘チェック（受益者が複数人の場合）
    if (state.beneficiaryIds.length > 1 && state.splitType !== 'none' && state.splits.length > 0) {
      const totalSplit = state.splits.reduce(
        (sum, s) => sum + parseAmount(s.amount),
        0
      );
      if (Math.abs(totalSplit - amount) > 0.01) {
        errors.splits = '負担額の合計が一致しません';
      }
    }

    set({ errors, isValid: Object.keys(errors).length === 0 });
    return Object.keys(errors).length === 0;
  },

  reset: () => set(initialState),
}));
