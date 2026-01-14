/**
 * アプリ全体のUI状態ストア
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Group } from '../types/database';
import type { Toast, BottomSheetContent } from '../types/domain';
import { getCurrentMonth } from '../lib/utils';

interface AppState {
  // 現在のグループ
  currentGroupId: string | null;
  currentGroup: Group | null;

  // 表示月
  selectedMonth: string; // YYYY-MM

  // カレンダーの選択日付
  selectedCalendarDate: string | null; // YYYY-MM-DD

  // UI状態
  isBottomSheetOpen: boolean;
  bottomSheetContent: BottomSheetContent;

  // トースト
  toast: Toast | null;

  // アクション
  setCurrentGroup: (groupId: string, group: Group) => void;
  clearCurrentGroup: () => void;
  setSelectedMonth: (month: string) => void;
  setSelectedCalendarDate: (date: string | null) => void;
  openBottomSheet: (content: BottomSheetContent) => void;
  closeBottomSheet: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  hideToast: () => void;
  reset: () => void;
}

const initialState = {
  currentGroupId: null,
  currentGroup: null,
  selectedMonth: getCurrentMonth(),
  selectedCalendarDate: null,
  isBottomSheetOpen: false,
  bottomSheetContent: null,
  toast: null,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,

      setCurrentGroup: (groupId, group) =>
        set({
          currentGroupId: groupId,
          currentGroup: group,
        }),

      clearCurrentGroup: () =>
        set({
          currentGroupId: null,
          currentGroup: null,
        }),

      setSelectedMonth: (selectedMonth) => set({ selectedMonth }),

      setSelectedCalendarDate: (selectedCalendarDate) => set({ selectedCalendarDate }),

      openBottomSheet: (bottomSheetContent) =>
        set({
          isBottomSheetOpen: true,
          bottomSheetContent,
        }),

      closeBottomSheet: () =>
        set({
          isBottomSheetOpen: false,
          bottomSheetContent: null,
        }),

      showToast: (message, type) =>
        set({
          toast: {
            message,
            type,
            id: Date.now().toString(),
          },
        }),

      hideToast: () => set({ toast: null }),

      reset: () => set(initialState),
    }),
    {
      name: 'ourhome-app-store',
      // 永続化する項目を限定（UI状態やトーストは永続化しない）
      partialize: (state) => ({
        currentGroupId: state.currentGroupId,
        currentGroup: state.currentGroup,
        selectedMonth: state.selectedMonth,
        selectedCalendarDate: state.selectedCalendarDate,
      }),
    }
  )
);
