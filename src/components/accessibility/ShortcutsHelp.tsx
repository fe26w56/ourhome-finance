/**
 * キーボードショートカットヘルプモーダル
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FocusTrap } from './FocusTrap';
import { KEYBOARD_SHORTCUTS } from '../../hooks/useGlobalKeyboard';

interface ShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsHelp: React.FC<ShortcutsHelpProps> = ({ 
  isOpen, 
  onClose 
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* オーバーレイ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* モーダル */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <FocusTrap isActive={isOpen} onEscape={onClose}>
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="shortcuts-title"
                className="bg-white dark:bg-surface-dark rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden"
              >
                {/* ヘッダー */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 
                    id="shortcuts-title" 
                    className="text-lg font-bold"
                  >
                    キーボードショートカット
                  </h2>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    aria-label="閉じる"
                  >
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>

                {/* コンテンツ */}
                <div className="p-4 overflow-y-auto max-h-[60vh]">
                  <div className="space-y-2">
                    {KEYBOARD_SHORTCUTS.map((shortcut) => (
                      <div
                        key={shortcut.key}
                        className="flex items-center justify-between py-2"
                      >
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {shortcut.description}
                        </span>
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono min-w-[32px] text-center">
                          {shortcut.key}
                        </kbd>
                      </div>
                    ))}
                  </div>

                  {/* 補足説明 */}
                  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      入力フィールドにフォーカスがある場合、ショートカットは無効になります。
                    </p>
                  </div>
                </div>

                {/* フッター */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={onClose}
                    className="w-full py-3 bg-primary text-black font-medium rounded-xl hover:bg-primary-dark transition-colors"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </FocusTrap>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
