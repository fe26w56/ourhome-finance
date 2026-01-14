import React from 'react';

interface FixedFilterFooterProps {
  // フィルターコントロール用
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedMonth: string;
  onMonthClick: () => void;
  onFilterClick: () => void;
  activeFilterCount: number;
  transactionCount: number;
}

const FixedFilterFooter: React.FC<FixedFilterFooterProps> = ({
  searchQuery,
  onSearchChange,
  selectedMonth,
  onMonthClick,
  onFilterClick,
  activeFilterCount,
  transactionCount,
}) => {
  // 月の表示フォーマット
  const formattedMonth = selectedMonth
    ? new Date(selectedMonth + '-01').toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : 'This Month';

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 pb-safe">
      <div className="bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-800">
        {/* フィルターコントロール */}
        <div className="px-4 py-3 space-y-3">
          {/* 検索ボックス */}
          <div className="group relative flex items-center w-full h-12 rounded-xl bg-surface-light dark:bg-surface-dark transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/20 focus-within:bg-white dark:focus-within:bg-gray-800 shadow-sm">
            <span className="material-symbols-outlined absolute left-4 text-gray-400 dark:text-gray-500 transition-colors group-focus-within:text-primary">
              search
            </span>
            <input
              className="w-full h-full pl-12 pr-4 bg-transparent border-none focus:ring-0 text-base font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500 text-slate-900 dark:text-white outline-none"
              placeholder="Search groceries, rent..."
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* 月選択 & フィルターボタン */}
          <div className="flex gap-2">
            <button
              onClick={onMonthClick}
              className="flex shrink-0 items-center justify-center gap-x-1.5 h-9 px-4 rounded-full bg-primary text-white shadow-lg shadow-primary/20 active:scale-95 transition-transform"
            >
              <span className="text-sm font-semibold text-black">
                {formattedMonth}
              </span>
              <span className="material-symbols-outlined text-[18px] text-black">
                expand_more
              </span>
            </button>

            <button
              onClick={onFilterClick}
              className={`flex shrink-0 items-center justify-center gap-x-1.5 h-9 px-4 rounded-full border transition-colors ${
                activeFilterCount > 0
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-surface-light dark:bg-surface-dark border-gray-100 dark:border-gray-700 text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span className="text-sm font-medium">Filters</span>
              {activeFilterCount > 0 && (
                <span className="text-xs font-bold bg-primary text-black rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* トランザクション数 */}
            {transactionCount > 0 && (
              <div className="flex items-center ml-auto">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {transactionCount} transaction{transactionCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FixedFilterFooter;
