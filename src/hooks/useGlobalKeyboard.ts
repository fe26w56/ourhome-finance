/**
 * グローバルキーボードショートカットフック
 */

import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/useAppStore';

interface ShortcutHandler {
  key: string;
  description: string;
  handler: () => void;
  /** 入力フィールド内でも有効にするか */
  allowInInput?: boolean;
}

export function useGlobalKeyboard() {
  const navigate = useNavigate();
  const { openBottomSheet } = useAppStore();
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);

  // ショートカットヘルプを開く
  const openShortcutsHelp = useCallback(() => {
    setIsShortcutsHelpOpen(true);
  }, []);

  // ショートカットヘルプを閉じる
  const closeShortcutsHelp = useCallback(() => {
    setIsShortcutsHelpOpen(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 入力フィールドでは特定のショートカットを無効化
      const isInputField =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable);

      // Escape はどこでも有効
      if (e.key === 'Escape') {
        closeShortcutsHelp();
        return;
      }

      // 入力フィールド内では他のショートカットを無効化
      if (isInputField) {
        return;
      }

      // Meta/Ctrl キーが押されている場合はブラウザデフォルトを優先
      if (e.metaKey || e.ctrlKey) {
        return;
      }

      switch (e.key) {
        case '?':
          e.preventDefault();
          openShortcutsHelp();
          break;
        case 'n':
          e.preventDefault();
          navigate('/add');
          break;
        case 'h':
          e.preventDefault();
          navigate('/');
          break;
        case 'c':
          e.preventDefault();
          navigate('/calendar');
          break;
        case 'r':
          e.preventDefault();
          navigate('/reports');
          break;
        case 's':
          e.preventDefault();
          navigate('/settings');
          break;
        case 'b':
          e.preventDefault();
          navigate('/budget');
          break;
        case 'g':
          e.preventDefault();
          navigate('/goals');
          break;
        case '/':
          e.preventDefault();
          // 検索入力にフォーカス
          const searchInput = document.getElementById('search-input');
          if (searchInput) {
            searchInput.focus();
          } else {
            navigate('/history');
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, openBottomSheet, openShortcutsHelp, closeShortcutsHelp]);

  return {
    isShortcutsHelpOpen,
    openShortcutsHelp,
    closeShortcutsHelp,
  };
}

/**
 * キーボードショートカット一覧
 */
export const KEYBOARD_SHORTCUTS = [
  { key: '?', description: 'ショートカット一覧を表示' },
  { key: 'n', description: '新規取引を追加' },
  { key: 'h', description: 'ホームへ移動' },
  { key: 'c', description: 'カレンダーへ移動' },
  { key: 'r', description: 'レポートへ移動' },
  { key: 'b', description: '予算へ移動' },
  { key: 'g', description: '目標へ移動' },
  { key: 's', description: '設定へ移動' },
  { key: '/', description: '検索にフォーカス' },
  { key: 'Escape', description: 'モーダルを閉じる' },
] as const;

/**
 * 電卓キーパッド用キーボードフック
 */
export function useCalculatorKeyboard(
  onDigit: (digit: string) => void,
  onBackspace: () => void,
  onClear: () => void,
  onSubmit?: () => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 他の入力フィールドでは無効化
      if (
        e.target instanceof HTMLInputElement &&
        (e.target as HTMLInputElement).type !== 'button'
      ) {
        return;
      }

      // 数字キー
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        onDigit(e.key);
        return;
      }

      switch (e.key) {
        case 'Backspace':
          e.preventDefault();
          onBackspace();
          break;
        case 'Delete':
          e.preventDefault();
          onClear();
          break;
        case 'Enter':
          if (onSubmit) {
            e.preventDefault();
            onSubmit();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onDigit, onBackspace, onClear, onSubmit]);
}

/**
 * カレンダーグリッド用キーボードフック
 */
export function useCalendarKeyboard(
  selectedDate: Date,
  onSelectDate: (date: Date) => void,
  onSelectMonth?: (direction: 'prev' | 'next') => void
) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const newDate = new Date(selectedDate);

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          newDate.setDate(newDate.getDate() - 1);
          onSelectDate(newDate);
          break;
        case 'ArrowRight':
          e.preventDefault();
          newDate.setDate(newDate.getDate() + 1);
          onSelectDate(newDate);
          break;
        case 'ArrowUp':
          e.preventDefault();
          newDate.setDate(newDate.getDate() - 7);
          onSelectDate(newDate);
          break;
        case 'ArrowDown':
          e.preventDefault();
          newDate.setDate(newDate.getDate() + 7);
          onSelectDate(newDate);
          break;
        case 'Home':
          e.preventDefault();
          newDate.setDate(1);
          onSelectDate(newDate);
          break;
        case 'End':
          e.preventDefault();
          newDate.setMonth(newDate.getMonth() + 1);
          newDate.setDate(0); // 前月の最終日
          onSelectDate(newDate);
          break;
        case 'PageUp':
          e.preventDefault();
          if (e.shiftKey) {
            newDate.setFullYear(newDate.getFullYear() - 1);
          } else {
            newDate.setMonth(newDate.getMonth() - 1);
          }
          onSelectDate(newDate);
          onSelectMonth?.('prev');
          break;
        case 'PageDown':
          e.preventDefault();
          if (e.shiftKey) {
            newDate.setFullYear(newDate.getFullYear() + 1);
          } else {
            newDate.setMonth(newDate.getMonth() + 1);
          }
          onSelectDate(newDate);
          onSelectMonth?.('next');
          break;
      }
    },
    [selectedDate, onSelectDate, onSelectMonth]
  );

  return handleKeyDown;
}
