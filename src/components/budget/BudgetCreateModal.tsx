import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpsertBudget } from '../../hooks/useBudgets';
import { useAppStore } from '../../stores/useAppStore';
import { Category, Budget } from '../../types/database';

interface BudgetCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  categories: Category[];
  existingBudgetCategoryIds: string[];
  preselectedCategoryId?: string;
  existingTotalBudget?: Budget;
}

type BudgetType = 'total' | 'category';

const BudgetCreateModal: React.FC<BudgetCreateModalProps> = ({
  isOpen,
  onClose,
  groupId,
  categories,
  existingBudgetCategoryIds,
  preselectedCategoryId,
  existingTotalBudget,
}) => {
  const { t } = useTranslation('budget');
  const { showToast } = useAppStore();
  const upsertBudget = useUpsertBudget();

  // State
  const [budgetType, setBudgetType] = useState<BudgetType>(
    preselectedCategoryId ? 'category' : 'total'
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    preselectedCategoryId || ''
  );
  const [amount, setAmount] = useState('');
  const [carryOver, setCarryOver] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; category?: string }>({});

  // フィルタリングされたカテゴリ（予算未設定の支出カテゴリのみ）
  const availableCategories = categories.filter(
    (cat) =>
      (cat.type === 'expense' || cat.type === 'both') &&
      cat.isActive &&
      !existingBudgetCategoryIds.includes(cat.id)
  );

  // 初期化
  useEffect(() => {
    if (isOpen) {
      setBudgetType(preselectedCategoryId ? 'category' : 'total');
      setSelectedCategoryId(preselectedCategoryId || '');
      setAmount(existingTotalBudget && !preselectedCategoryId ? existingTotalBudget.amount.toString() : '');
      setCarryOver(existingTotalBudget?.carryOver || false);
      setErrors({});
    }
  }, [isOpen, preselectedCategoryId, existingTotalBudget]);

  // ESCキーで閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // 金額フォーマット（カンマ区切り）
  const formatAmountInput = (value: string): string => {
    const numbers = value.replace(/[^\d]/g, '');
    if (!numbers) return '';
    return parseInt(numbers, 10).toLocaleString();
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAmountInput(e.target.value);
    setAmount(formatted);
    if (errors.amount) {
      setErrors((prev) => ({ ...prev, amount: undefined }));
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategoryId(e.target.value);
    if (errors.category) {
      setErrors((prev) => ({ ...prev, category: undefined }));
    }
  };

  // バリデーション
  const validate = (): boolean => {
    const newErrors: { amount?: string; category?: string } = {};

    const numericAmount = parseInt(amount.replace(/,/g, ''), 10);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      newErrors.amount = t('create.validation.amountRequired');
    }

    if (budgetType === 'category' && !selectedCategoryId) {
      newErrors.category = t('create.validation.categoryRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 保存
  const handleSave = async () => {
    if (!validate()) return;

    const numericAmount = parseInt(amount.replace(/,/g, ''), 10);

    try {
      await upsertBudget.mutateAsync({
        groupId,
        categoryId: budgetType === 'total' ? null : selectedCategoryId,
        amount: numericAmount,
        carryOver,
      });
      showToast(t('messages.saved'), 'success');
      onClose();
    } catch (error) {
      showToast(t('messages.saved').replace('saved', 'failed'), 'error');
    }
  };

  // 背景クリックで閉じる
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="w-[90%] max-w-[400px] bg-white dark:bg-[#1a2e20] rounded-2xl shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h2 id="modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
            {t('create.title')}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-5">
          {/* Budget Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('create.budgetType')}
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="budgetType"
                  value="total"
                  checked={budgetType === 'total'}
                  onChange={() => setBudgetType('total')}
                  className="w-4 h-4 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-900 dark:text-white">
                  {t('create.totalBudget')}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="budgetType"
                  value="category"
                  checked={budgetType === 'category'}
                  onChange={() => setBudgetType('category')}
                  className="w-4 h-4 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-900 dark:text-white">
                  {t('create.categoryBudget')}
                </span>
              </label>
            </div>
          </div>

          {/* Category Select (only for category budget) */}
          {budgetType === 'category' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('create.selectCategory')}
              </label>
              <select
                value={selectedCategoryId}
                onChange={handleCategoryChange}
                className={`w-full px-4 py-3 rounded-xl border ${
                  errors.category
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-200 dark:border-gray-700 focus:ring-primary'
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2`}
              >
                <option value="">{t('create.selectCategory')}</option>
                {availableCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-xs text-red-500">{errors.category}</p>
              )}
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('create.amount')}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                ¥
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={handleAmountChange}
                placeholder={t('create.amountPlaceholder')}
                className={`w-full pl-8 pr-4 py-3 rounded-xl border ${
                  errors.amount
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-200 dark:border-gray-700 focus:ring-primary'
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2`}
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-xs text-red-500">{errors.amount}</p>
            )}
          </div>

          {/* Carry Over */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={carryOver}
              onChange={(e) => setCarryOver(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t('create.carryOver')}
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {t('create.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={upsertBudget.isPending}
            className="flex-1 py-3 px-4 rounded-xl bg-primary text-gray-900 font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {upsertBudget.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></span>
              </span>
            ) : (
              t('create.save')
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BudgetCreateModal;
