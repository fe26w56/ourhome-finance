import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatAmount } from '../../lib/utils';

interface UnbudgetedCategoryCardProps {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  spentAmount: number;
  onSetBudget: (categoryId: string) => void;
}

const UnbudgetedCategoryCard: React.FC<UnbudgetedCategoryCardProps> = ({
  categoryId,
  categoryName,
  categoryIcon,
  categoryColor,
  spentAmount,
  onSetBudget,
}) => {
  const { t } = useTranslation('budget');

  return (
    <div className="flex flex-col gap-2 p-4 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500">
            <span className="material-symbols-outlined text-[20px]">{categoryIcon}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-gray-500 dark:text-gray-400">{categoryName}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {t('unbudgeted.label')}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formatAmount(spentAmount)}
          </p>
          <button
            onClick={() => onSetBudget(categoryId)}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {t('unbudgeted.setBudget')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnbudgetedCategoryCard;
