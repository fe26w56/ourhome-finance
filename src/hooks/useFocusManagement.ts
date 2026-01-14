/**
 * フォーカス管理カスタムフック
 * モーダル/ボトムシートのフォーカストラップとフォーカス復元を管理
 */

import { useRef, useCallback, useEffect } from 'react';

const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

interface UseFocusManagementOptions {
  /** トラップが有効かどうか */
  isActive?: boolean;
  /** 自動的に最初の要素にフォーカスするか */
  autoFocus?: boolean;
  /** 閉じる時に元のフォーカスに戻すか */
  restoreFocus?: boolean;
}

export function useFocusManagement(options: UseFocusManagementOptions = {}) {
  const { isActive = true, autoFocus = true, restoreFocus = true } = options;
  
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // フォーカス可能な要素を取得
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    ).filter((el) => el.offsetParent !== null); // 表示されている要素のみ
  }, []);

  // 最初のフォーカス可能要素にフォーカス
  const focusFirst = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length > 0) {
      elements[0].focus();
    }
  }, [getFocusableElements]);

  // 最後のフォーカス可能要素にフォーカス
  const focusLast = useCallback(() => {
    const elements = getFocusableElements();
    if (elements.length > 0) {
      elements[elements.length - 1].focus();
    }
  }, [getFocusableElements]);

  // モーダル/ボトムシートが開いた時
  const handleOpen = useCallback(() => {
    // 現在のフォーカス要素を保存
    previousFocusRef.current = document.activeElement as HTMLElement;
    
    // 自動フォーカス
    if (autoFocus) {
      // 少し遅延させてDOMが確実にレンダリングされるのを待つ
      requestAnimationFrame(() => {
        focusFirst();
      });
    }
  }, [autoFocus, focusFirst]);

  // モーダル/ボトムシートが閉じた時
  const handleClose = useCallback(() => {
    if (restoreFocus && previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [restoreFocus]);

  // フォーカストラップのキーボードハンドラ
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isActive || e.key !== 'Tab') return;

      const elements = getFocusableElements();
      if (elements.length === 0) return;

      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];

      // Shift + Tab
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    },
    [isActive, getFocusableElements]
  );

  // Escape キーでの閉じる処理用
  const handleEscape = useCallback(
    (onClose: () => void) => (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isActive) {
        onClose();
      }
    },
    [isActive]
  );

  // キーボードイベントの登録
  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, handleKeyDown]);

  return {
    containerRef,
    handleOpen,
    handleClose,
    handleEscape,
    focusFirst,
    focusLast,
    getFocusableElements,
  };
}

/**
 * シンプルなフォーカストラップコンポーネント用フック
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = container.querySelectorAll<HTMLElement>(
        FOCUSABLE_SELECTORS
      );
      const visibleElements = Array.from(focusableElements).filter(
        (el) => el.offsetParent !== null
      );

      if (visibleElements.length === 0) return;

      const firstElement = visibleElements[0];
      const lastElement = visibleElements[visibleElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return containerRef;
}
