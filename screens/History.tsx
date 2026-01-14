import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactions } from '../src/hooks/useTransactions';
import { useFilterStore } from '../src/stores/useFilterStore';
import { useAppStore } from '../src/stores/useAppStore';
import { useCategories } from '../src/hooks/useCategories';
import { useMembers } from '../src/hooks/useMembers';
import { useBudgets } from '../src/hooks/useBudgets';
import { formatAmount, parseDate, getMonthRange } from '../src/lib/utils';
import { TransactionWithDetails } from '../src/services/transactionService';
import { motion, AnimatePresence } from 'framer-motion';
import { FilteredSummaryCard, FixedFilterFooter, CategoryBreakdown } from '../src/components/history';

import Header from '../src/components/ui/Header';

const History: React.FC = () => {
  const { currentGroupId, selectedMonth, openBottomSheet, closeBottomSheet, isBottomSheetOpen, bottomSheetContent } = useAppStore();
  const filterStore = useFilterStore();
  const [searchQuery, setSearchQuery] = useState(filterStore.searchQuery);

  // データ取得
  const { data: transactions = [], isLoading } = useTransactions(currentGroupId || '');
  const { data: categories = [] } = useCategories(currentGroupId || '');
  const { data: members = [] } = useMembers(currentGroupId || '');
  const { data: budgets = [] } = useBudgets(currentGroupId || '');

  // 全体予算を取得
  const totalBudget = budgets.find((b) => b.categoryId === null);

  // 検索クエリの適用（デバウンスなし、即時反映）
  React.useEffect(() => {
    filterStore.setSearchQuery(searchQuery);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // 日付範囲の設定（選択された月）
  React.useEffect(() => {
    if (selectedMonth) {
      const { start, end } = getMonthRange(selectedMonth);
      filterStore.setDateRange(start, end);
    }
  }, [selectedMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  // 取引を日付でグループ化
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, TransactionWithDetails[]> = {};
    transactions.forEach((tx) => {
      const dateKey = tx.date;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(tx);
    });
    return groups;
  }, [transactions]);

  // 日付順にソート
  const sortedDates = useMemo(() => {
    return Object.keys(groupedTransactions).sort((a, b) => {
      if (filterStore.sortOrder === 'asc') {
        return a.localeCompare(b);
      }
      return b.localeCompare(a);
    });
  }, [groupedTransactions, filterStore.sortOrder]);

  // 日付フォーマット
  const formatDateLabel = (dateStr: string): string => {
    const date = parseDate(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }
  };

  // 支出の合計金額の計算
  const expenseTotal = useMemo(() => {
    return transactions
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions]);

  // カテゴリ別集計
  const categoryBreakdown: CategoryBreakdown[] = useMemo(() => {
    const categoryTotals = new Map<string, number>();

    transactions
      .filter((tx) => tx.type === 'expense')
      .forEach((tx) => {
        const current = categoryTotals.get(tx.categoryId) || 0;
        categoryTotals.set(tx.categoryId, current + tx.amount);
      });

    const total = Array.from(categoryTotals.values()).reduce((a, b) => a + b, 0);

    return Array.from(categoryTotals.entries())
      .map(([categoryId, amount]) => {
        const category = categories.find((c) => c.id === categoryId);
        return {
          categoryId,
          categoryName: category?.name || 'Unknown',
          amount,
          percent: total > 0 ? (amount / total) * 100 : 0,
          color: category?.color || 'gray',
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, categories]);

  // 予算使用率の計算
  const usagePercent = useMemo(() => {
    if (!totalBudget || totalBudget.amount === 0) return 0;
    return Math.round((expenseTotal / totalBudget.amount) * 100);
  }, [expenseTotal, totalBudget]);

  // アクティブなフィルター数
  const activeFilterCount = useMemo(() => {
    return [
      filterStore.categoryIds.length,
      filterStore.memberIds.length,
      filterStore.transactionType !== 'all' ? 1 : 0,
      filterStore.sharedType !== 'all' ? 1 : 0,
    ].reduce((a, b) => a + b, 0);
  }, [filterStore.categoryIds.length, filterStore.memberIds.length, filterStore.transactionType, filterStore.sharedType]);

  const handleFilterClick = () => {
    openBottomSheet('filter');
  };

  const handleDateFilterClick = () => {
    // 日付フィルタのボトムシートを開く（簡易実装）
    openBottomSheet('filter');
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark pb-52">
      {/* Header - シンプルなタイトルのみ */}
      <Header 
        variant="sub" 
        title="History"
      />

      {/* Filtered Summary Card - ヘッダー下、スクロール可能 */}
      <div className="px-0 py-4">
        <FilteredSummaryCard
          totalAmount={expenseTotal}
          budgetAmount={totalBudget?.amount || null}
          usagePercent={usagePercent}
          categoryBreakdown={categoryBreakdown}
        />
      </div>

      <main className="flex-1 overflow-y-auto relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">Loading...</div>
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 px-4">
            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">receipt_long</span>
            <p className="text-gray-500 dark:text-gray-400 text-center">No transactions found</p>
            {searchQuery && <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Try adjusting your search or filters</p>}
          </div>
        ) : (
          sortedDates.map((dateKey) => (
            <React.Fragment key={dateKey}>
              <div className="sticky top-0 z-10 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm px-5 py-3 border-b border-gray-50 dark:border-gray-800/50">
                <h4 className="text-primary text-xs font-bold uppercase tracking-wider">{formatDateLabel(dateKey)}</h4>
              </div>
              <div className="px-2 pb-2 space-y-1">
                {groupedTransactions[dateKey]
                  .sort((a, b) => {
                    if (filterStore.sortBy === 'amount') {
                      return filterStore.sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
                    } else if (filterStore.sortBy === 'category') {
                      return filterStore.sortOrder === 'asc'
                        ? a.category.name.localeCompare(b.category.name)
                        : b.category.name.localeCompare(a.category.name);
                    } else {
                      // date sort
                      return filterStore.sortOrder === 'asc'
                        ? a.createdAt.localeCompare(b.createdAt)
                        : b.createdAt.localeCompare(a.createdAt);
                    }
                  })
                  .map((tx) => (
                    <TransactionItem key={tx.id} transaction={tx} members={members} />
                  ))}
              </div>
            </React.Fragment>
          ))
        )}
      </main>

      {/* Fixed Filter Footer - 検索・フィルターのみ */}
      <FixedFilterFooter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedMonth={selectedMonth}
        onMonthClick={handleDateFilterClick}
        onFilterClick={handleFilterClick}
        activeFilterCount={activeFilterCount}
        transactionCount={transactions.length}
      />

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        isOpen={isBottomSheetOpen && bottomSheetContent === 'filter'}
        onClose={closeBottomSheet}
        categories={categories}
        members={members}
      />
    </div>
  );
};

const TransactionItem: React.FC<{
  transaction: TransactionWithDetails;
  members: Array<{ userId: string; user: { displayName: string } }>;
}> = ({ transaction, members }) => {
  const navigate = useNavigate();
  const paidByMember = members.find((m) => m.userId === transaction.paidBy);
  const paidByName = paidByMember?.user.displayName || 'Unknown';
  const initial = paidByName.charAt(0).toUpperCase();
  const isPositive = transaction.type === 'income';
  const time = new Date(transaction.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  // カテゴリの色を取得（簡易実装）
  const colorMap: Record<string, string> = {
    orange: 'orange',
    blue: 'blue',
    emerald: 'emerald',
    purple: 'purple',
    red: 'red',
    gray: 'gray',
  };
  const color = colorMap[transaction.category.color] || 'gray';

  return (
    <div 
      onClick={() => navigate(`/add?edit=${transaction.id}`)}
      className="group flex items-center justify-between p-3 rounded-xl hover:bg-surface-light dark:hover:bg-surface-dark/50 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <div
          className={`relative flex items-center justify-center shrink-0 size-12 rounded-2xl bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400`}
        >
          <span className="material-symbols-outlined">{transaction.category.icon || 'receipt'}</span>
          <div className="absolute -bottom-1 -right-1 size-5 bg-white dark:bg-background-dark rounded-full flex items-center justify-center p-0.5 shadow-sm">
            <div className="w-full h-full rounded-full bg-indigo-100 text-[8px] font-bold text-indigo-700 flex items-center justify-center">
              {initial}
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          <p className="text-slate-900 dark:text-white text-base font-bold leading-tight mb-0.5">
            {transaction.memo || transaction.category.name}
          </p>
          <div className="flex items-center gap-1.5">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">{transaction.category.name}</p>
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-base font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
          {isPositive ? '+' : '-'}
          {formatAmount(transaction.amount)}
        </p>
        <p className="text-slate-400 dark:text-slate-500 text-xs font-medium">{time}</p>
      </div>
    </div>
  );
};

const FilterBottomSheet: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  categories: Array<{ id: string; name: string; icon: string; color: string }>;
  members: Array<{ userId: string; user: { displayName: string } }>;
}> = ({ isOpen, onClose, categories, members }) => {
  const filterStore = useFilterStore();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl z-50 max-h-[80vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Filters</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">close</span>
              </button>
            </div>
            <div className="p-4 space-y-6">
              {/* Transaction Type */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Type</h3>
                <div className="flex gap-2">
                  {(['all', 'expense', 'income'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => filterStore.setTransactionType(type)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        filterStore.transactionType === type
                          ? 'bg-primary text-black'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {type === 'all' ? 'All' : type === 'expense' ? 'Expense' : 'Income'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shared Type */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Shared</h3>
                <div className="flex gap-2">
                  {(['all', 'shared', 'personal'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => filterStore.setSharedType(type)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        filterStore.sharedType === type
                          ? 'bg-primary text-black'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {type === 'all' ? 'All' : type === 'shared' ? 'Shared' : 'Personal'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => filterStore.toggleCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                        filterStore.categoryIds.includes(cat.id)
                          ? 'bg-primary text-black'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">{cat.icon}</span>
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Members */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Members</h3>
                <div className="flex flex-wrap gap-2">
                  {members.map((member) => (
                    <button
                      key={member.userId}
                      onClick={() => filterStore.toggleMember(member.userId)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        filterStore.memberIds.includes(member.userId)
                          ? 'bg-primary text-black'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {member.user.displayName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Sort By</h3>
                <div className="flex gap-2 mb-2">
                  {(['date', 'amount', 'category'] as const).map((sortBy) => (
                    <button
                      key={sortBy}
                      onClick={() => filterStore.setSortBy(sortBy)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        filterStore.sortBy === sortBy
                          ? 'bg-primary text-black'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {sortBy === 'date' ? 'Date' : sortBy === 'amount' ? 'Amount' : 'Category'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => filterStore.setSortOrder('desc')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      filterStore.sortOrder === 'desc'
                        ? 'bg-primary text-black'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Descending
                  </button>
                  <button
                    onClick={() => filterStore.setSortOrder('asc')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      filterStore.sortOrder === 'asc'
                        ? 'bg-primary text-black'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Ascending
                  </button>
                </div>
              </div>

              {/* Reset */}
              <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => {
                    filterStore.reset();
                    onClose();
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium"
                >
                  Reset
                </button>
                <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl bg-primary text-black font-medium">
                  Apply
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default History;
