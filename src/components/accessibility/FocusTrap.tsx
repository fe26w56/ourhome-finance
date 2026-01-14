/**
 * フォーカストラップコンポーネント
 * モーダルやボトムシート内でフォーカスを閉じ込める
 */

import React, { useEffect, useRef, ReactNode } from 'react';

interface FocusTrapProps {
  children: ReactNode;
  /** トラップが有効かどうか */
  isActive: boolean;
  /** 最初のフォーカス可能要素に自動フォーカスするか */
  autoFocus?: boolean;
  /** 閉じる時に元のフォーカスに戻すか */
  restoreFocus?: boolean;
  /** ESCキーで閉じるハンドラ */
  onEscape?: () => void;
  /** 追加のクラス名 */
  className?: string;
}

const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export const FocusTrap: React.FC<FocusTrapProps> = ({
  children,
  isActive,
  autoFocus = true,
  restoreFocus = true,
  onEscape,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // アクティブになった時のフォーカス処理
  useEffect(() => {
    if (!isActive) return;

    // 現在のフォーカスを保存
    previousFocusRef.current = document.activeElement as HTMLElement;

    // 自動フォーカス
    if (autoFocus && containerRef.current) {
      const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
        FOCUSABLE_SELECTORS
      );
      const visibleElements = Array.from(focusableElements).filter(
        (el) => el.offsetParent !== null
      );
      
      if (visibleElements.length > 0) {
        requestAnimationFrame(() => {
          visibleElements[0].focus();
        });
      }
    }

    // クリーンアップ時にフォーカスを戻す
    return () => {
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive, autoFocus, restoreFocus]);

  // キーボードイベントハンドラ
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // ESCキー
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }

      // Tabキーでのフォーカストラップ
      if (e.key === 'Tab' && containerRef.current) {
        const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
          FOCUSABLE_SELECTORS
        );
        const visibleElements = Array.from(focusableElements).filter(
          (el) => el.offsetParent !== null
        );

        if (visibleElements.length === 0) return;

        const firstElement = visibleElements[0];
        const lastElement = visibleElements[visibleElements.length - 1];

        if (e.shiftKey) {
          // Shift + Tab
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
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onEscape]);

  return (
    <div ref={containerRef} className={`focus-trap ${className}`}>
      {children}
    </div>
  );
};
