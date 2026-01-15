import React from 'react';
import { formatAmount } from '../../lib/utils';

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  amount: number;
  percent: number;
  color: string; // HEX color code (#RRGGBB)
}

interface FilteredSummaryCardProps {
  totalAmount: number;
  budgetAmount: number | null;
  usagePercent: number;
  categoryBreakdown: CategoryBreakdown[];
  currency?: string;
}

const FilteredSummaryCard: React.FC<FilteredSummaryCardProps> = ({
  totalAmount,
  budgetAmount,
  usagePercent,
  categoryBreakdown,
  currency = 'JPY',
}) => {
  // 使用率に応じたテキストカラー
  const usageTextColor =
    usagePercent >= 100
      ? 'text-red-500'
      : usagePercent >= 80
      ? 'text-orange-500'
      : 'text-primary';

  return (
    <div className="bg-white dark:bg-surface-dark rounded-2xl p-4 mx-4 shadow-soft">
      {/* ヘッダー部分 */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Filtered Total
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {currency}
          </p>
        </div>
        <p className="text-2xl font-bold" style={{ color: 'rgba(17, 24, 18, 1)' }}>
          {formatAmount(totalAmount)}
        </p>
      </div>

      {/* プログレスバー */}
      <div 
        className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex"
        role="progressbar"
        aria-label="Category breakdown"
      >
        {categoryBreakdown.map((cat, index) => {
          // デフォルト色（カテゴリ色がない場合）
          const bgColor = cat.color || '#73F590';
          // 最小幅を設定して小さいセグメントも見えるようにする
          const minWidth = cat.percent > 0 && cat.percent < 2 ? 2 : cat.percent;
          
          return (
            <div
              key={cat.categoryId}
              className={`h-full ${index > 0 ? 'ml-0.5' : ''}`}
              style={{ 
                width: `${minWidth}%`,
                backgroundColor: bgColor,
              }}
              title={`${cat.categoryName}: ${formatAmount(cat.amount)} (${cat.percent.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* フッター部分 */}
      <div className="mt-3 flex justify-between items-center">
        <p className="text-sm font-medium text-gray-400 dark:text-gray-500">
          Monthly Budget
        </p>
        <p className={`text-sm font-bold ${usageTextColor}`}>
          {budgetAmount ? `${usagePercent}% Used` : 'No budget set'}
        </p>
      </div>
    </div>
  );
};

export default FilteredSummaryCard;
