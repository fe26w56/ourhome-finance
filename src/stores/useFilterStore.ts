/**
 * 検索・フィルターストア
 */

import { create } from 'zustand';
import type { TransactionFilter } from '../types/domain';
import { filterToParams } from '../lib/queryKeys';
import type { FilterParams } from '../lib/queryKeys';

interface FilterState extends TransactionFilter {
  // アクション
  setSearchQuery: (query: string) => void;
  setDateRange: (start: string | null, end: string | null) => void;
  toggleCategory: (categoryId: string) => void;
  setCategoryIds: (categoryIds: string[]) => void;
  toggleMember: (memberId: string) => void;
  setTransactionType: (type: 'expense' | 'income' | 'all') => void;
  setSharedType: (type: 'shared' | 'personal' | 'all') => void;
  setAmountRange: (min: number | null, max: number | null) => void;
  setSortBy: (sortBy: 'date' | 'amount' | 'category') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;

  // フィルター適用
  getFilterParams: () => FilterParams;

  // リセット
  reset: () => void;
  resetDateRange: () => void;
}

const initialState: TransactionFilter = {
  searchQuery: '',
  dateRange: {
    start: null,
    end: null,
  },
  categoryIds: [],
  memberIds: [],
  transactionType: 'all',
  sharedType: 'all',
  amountRange: {
    min: null,
    max: null,
  },
  sortBy: 'date',
  sortOrder: 'desc',
};

export const useFilterStore = create<FilterState>((set, get) => ({
  ...initialState,

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setDateRange: (start, end) =>
    set({
      dateRange: { start, end },
    }),

  toggleCategory: (categoryId) => {
    const state = get();
    const categoryIds = state.categoryIds.includes(categoryId)
      ? state.categoryIds.filter((id) => id !== categoryId)
      : [...state.categoryIds, categoryId];
    set({ categoryIds });
  },

  setCategoryIds: (categoryIds) => set({ categoryIds }),

  toggleMember: (memberId) => {
    const state = get();
    const memberIds = state.memberIds.includes(memberId)
      ? state.memberIds.filter((id) => id !== memberId)
      : [...state.memberIds, memberId];
    set({ memberIds });
  },

  setTransactionType: (transactionType) => set({ transactionType }),

  setSharedType: (sharedType) => set({ sharedType }),

  setAmountRange: (min, max) =>
    set({
      amountRange: { min, max },
    }),

  setSortBy: (sortBy) => set({ sortBy }),

  setSortOrder: (sortOrder) => set({ sortOrder }),

  getFilterParams: () => {
    const state = get();
    return filterToParams(state);
  },

  reset: () => set(initialState),

  resetDateRange: () =>
    set({
      dateRange: {
        start: null,
        end: null,
      },
    }),
}));
