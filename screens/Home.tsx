import React, { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../src/stores/useAppStore';
import { useAuthStore } from '../src/stores/useAuthStore';
import { useMonthlySummary, useCategoryStats } from '../src/hooks/useStats';
import { useBudgets } from '../src/hooks/useBudgets';
import { useSettlementBalance } from '../src/hooks/useSettlement';
import { useTransactions } from '../src/hooks/useTransactions';
import { formatRelativeDate, formatMonthDisplay, formatCurrency } from '../src/lib/utils';
import Header from '../src/components/ui/Header';
import GroupSelector from '../src/components/ui/GroupSelector';
import MonthSelector from '../src/components/ui/MonthSelector';

const Home: React.FC = () => {
  const navigate = useNavigate();
  
  // ストアからの状態取得
  const { currentGroupId, currentGroup, selectedMonth } = useAppStore();
  const { user } = useAuthStore();
  
  // グループセレクターの状態
  const [isGroupSelectorOpen, setIsGroupSelectorOpen] = useState(false);
  const groupButtonRef = useRef<HTMLButtonElement>(null);
  
  // 月セレクターの状態
  const [isMonthSelectorOpen, setIsMonthSelectorOpen] = useState(false);
  
  // データ取得
  const { data: summary, isLoading: isSummaryLoading, error: summaryError } = useMonthlySummary(
    currentGroupId || '', 
    selectedMonth
  );
  const { data: settlementBalances, isLoading: isSettlementLoading } = useSettlementBalance(
    currentGroupId || ''
  );
  const { data: categoryStats, isLoading: isCategoryLoading } = useCategoryStats(
    currentGroupId || '', 
    selectedMonth
  );
  const { data: budgets = [] } = useBudgets(currentGroupId || '');
  const { data: transactions, isLoading: isTransactionsLoading } = useTransactions(
    currentGroupId || ''
  );
  
  // 最新5件の取引を取得
  const recentTransactions = useMemo(() => {
    return transactions?.slice(0, 5) || [];
  }, [transactions]);
  
  // 精算表示ロジック
  const settlementDisplay = useMemo(() => {
    if (!settlementBalances || !user?.id) return null;
    
    // 現在のユーザーが支払う必要がある残高
    const iOwe = settlementBalances.find(b => b.fromUserId === user.id);
    if (iOwe) {
      return {
        type: 'owe' as const,
        name: iOwe.toUserName,
        amount: iOwe.amount,
      };
    }
    
    // 現在のユーザーが受け取る残高
    const owedToMe = settlementBalances.find(b => b.toUserId === user.id);
    if (owedToMe) {
      return {
        type: 'owed' as const,
        name: owedToMe.fromUserName,
        amount: owedToMe.amount,
      };
    }
    
    // 精算済み
    return { type: 'settled' as const, name: '', amount: 0 };
  }, [settlementBalances, user?.id]);
  
  // 予算アラート（Reports.tsxと同じくuseBudgetsを使用）
  const budgetAlerts = useMemo(() => {
    if (!categoryStats) return [];
    
    return categoryStats
      .map(stat => {
        const budget = budgets.find(b => b.categoryId === stat.categoryId);
        if (!budget || budget.amount <= 0 || stat.amount === 0) return null;
        
        const usagePercent = (stat.amount / budget.amount) * 100;
        if (usagePercent >= 100) {
          return {
            categoryName: stat.categoryName,
            categoryIcon: stat.categoryIcon,
            usagePercent,
            type: 'danger' as const,
          };
        }
        if (usagePercent >= 80) {
          return {
            categoryName: stat.categoryName,
            categoryIcon: stat.categoryIcon,
            usagePercent,
            type: 'warning' as const,
          };
        }
        return null;
      })
      .filter((alert): alert is { categoryName: string; categoryIcon: string; usagePercent: number; type: 'warning' | 'danger' } => alert !== null)
      .sort((a, b) => b.usagePercent - a.usagePercent);
  }, [categoryStats, budgets]);
  
  // プログレスバーの幅を計算
  const progressWidth = useMemo(() => {
    if (!summary || !summary.totalBudget || summary.totalBudget === 0) return 0;
    return Math.min((summary.totalExpense / summary.totalBudget) * 100, 100);
  }, [summary]);
  
  // グループ未選択時の表示
  if (!currentGroupId) {
    return (
      <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark pb-28">
        <Header
          variant="main"
          homeButtonProps={{
            groupName: 'Select Group',
            showDropdown: true,
            onClick: () => setIsGroupSelectorOpen(!isGroupSelectorOpen),
          }}
        title={
          <button 
            className="flex items-center gap-1"
            onClick={() => setIsMonthSelectorOpen(true)}
          >
            <span className="text-lg font-bold tracking-tight">
              {formatMonthDisplay(selectedMonth)}
            </span>
            <span className="material-symbols-outlined text-slate-400 text-[18px]">expand_more</span>
          </button>
        }
        rightElement={
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/history')} className="p-2 text-slate-900 dark:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined text-[24px]">search</span>
            </button>
            <button className="p-2 text-slate-900 dark:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative">
              <span className="material-symbols-outlined text-[24px]">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-background-dark"></span>
            </button>
          </div>
        }
      />
      
      {/* グループセレクター */}
      <GroupSelector
        isOpen={isGroupSelectorOpen}
        onClose={() => setIsGroupSelectorOpen(false)}
        anchorElement={groupButtonRef.current}
      />
      
      {/* 月セレクター */}
      <MonthSelector
        isOpen={isMonthSelectorOpen}
        onClose={() => setIsMonthSelectorOpen(false)}
      />
      
      <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4">
              group
            </span>
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">グループを選択してください</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              上部のボタンからグループを選択すると、データが表示されます
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark pb-28">
      {/* Header */}
      <Header
        variant="main"
        homeButtonProps={{
          showDropdown: true,
          onClick: () => setIsGroupSelectorOpen(!isGroupSelectorOpen),
        }}
        title={
          <button 
            className="flex items-center gap-1"
            onClick={() => setIsMonthSelectorOpen(true)}
          >
            <span className="text-lg font-bold tracking-tight">
              {formatMonthDisplay(selectedMonth)}
            </span>
            <span className="material-symbols-outlined text-slate-400 text-[18px]">expand_more</span>
          </button>
        }
        rightElement={
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/history')} className="p-2 text-slate-900 dark:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined text-[24px]">search</span>
            </button>
            <button className="p-2 text-slate-900 dark:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative">
              <span className="material-symbols-outlined text-[24px]">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-background-dark"></span>
            </button>
          </div>
        }
      />
      
      {/* グループセレクター */}
      <GroupSelector
        isOpen={isGroupSelectorOpen}
        onClose={() => setIsGroupSelectorOpen(false)}
        anchorElement={groupButtonRef.current}
      />
      
      {/* 月セレクター */}
      <MonthSelector
        isOpen={isMonthSelectorOpen}
        onClose={() => setIsMonthSelectorOpen(false)}
      />

      <main className="flex-1 px-4 space-y-4">
        {/* Total Expenses Card */}
        {isSummaryLoading ? (
          <div className="w-full bg-surface-light dark:bg-surface-dark rounded-2xl p-6 border border-gray-100 dark:border-white/5 shadow-soft animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          </div>
        ) : summary ? (
          <div className="w-full bg-surface-light dark:bg-surface-dark rounded-2xl p-6 border border-gray-100 dark:border-white/5 shadow-soft relative overflow-hidden group">
            <div className="flex justify-between items-start mb-2">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Expenses</p>
              <button className="text-slate-400 hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[20px]">more_horiz</span>
              </button>
            </div>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-bold font-mono tracking-tighter text-slate-900 dark:text-white">
                {formatCurrency(summary.totalExpense)}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-end text-sm">
                <span className="text-slate-500 dark:text-slate-400">Remaining Budget</span>
                <span className="font-bold font-mono text-slate-700 dark:text-slate-200">
                  {formatCurrency(summary.budgetRemaining)}
                </span>
              </div>
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-50 dark:border-slate-700">
                <div 
                  className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(117,245,145,0.4)] relative overflow-hidden transition-all duration-300"
                  style={{ width: `${progressWidth}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 skew-x-12 -translate-x-full animate-[shimmer_2s_infinite]"></div>
                </div>
              </div>
            </div>
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-blue-400/5 rounded-full blur-2xl pointer-events-none"></div>
          </div>
        ) : (
          <div className="w-full bg-surface-light dark:bg-surface-dark rounded-2xl p-6 border border-gray-100 dark:border-white/5 shadow-soft text-center">
            <p className="text-slate-500 dark:text-slate-400">データの取得に失敗しました</p>
          </div>
        )}

        {/* Settlement Card */}
        {isSettlementLoading ? (
          <div className="w-full bg-surface-light dark:bg-surface-dark rounded-2xl p-1 border border-gray-100 dark:border-white/5 shadow-soft animate-pulse">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          </div>
        ) : settlementDisplay && settlementDisplay.type !== 'settled' ? (
          <div onClick={() => navigate('/settlement')} className="cursor-pointer w-full bg-surface-light dark:bg-surface-dark rounded-2xl p-1 border border-gray-100 dark:border-white/5 shadow-soft flex items-stretch">
            <div className="flex-1 p-4 flex flex-col justify-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Settlement</p>
              {settlementDisplay.type === 'owe' ? (
                <p className="text-slate-900 dark:text-slate-100 font-medium">
                  You owe <span className="font-bold border-b border-primary/50">{settlementDisplay.name}</span>
                </p>
              ) : settlementDisplay.type === 'owed' ? (
                <p className="text-slate-900 dark:text-slate-100 font-medium">
                  <span className="font-bold border-b border-primary/50">{settlementDisplay.name}</span> owes you
                </p>
              ) : (
                <p className="text-slate-900 dark:text-slate-100 font-medium">All settled!</p>
              )}
              {settlementDisplay.type !== 'settled' && (
                <p className="text-xl font-bold font-mono mt-1 text-slate-900 dark:text-white">
                  {formatCurrency(settlementDisplay.amount)}
                </p>
              )}
            </div>
            <div className="flex items-center pr-1">
              <button className="h-full bg-primary hover:bg-[#62e07d] text-slate-900 px-6 rounded-xl font-bold text-sm transition-all active:scale-95 flex flex-col items-center justify-center gap-1 min-h-[80px]">
                <span className="material-symbols-outlined text-[20px]">handshake</span>
                Settle Up
              </button>
            </div>
          </div>
        ) : null}

        {/* Alerts / Chips */}
        {(budgetAlerts.length > 0 || summary?.expenseDiffPercent) && (
          <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 -mx-4 px-4">
            {budgetAlerts.map((alert, idx) => (
              <div 
                key={idx}
                className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full ${
                  alert.type === 'danger'
                    ? 'bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30'
                    : 'bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30'
                }`}
              >
                <span className={`material-symbols-outlined text-[18px] ${
                  alert.type === 'danger' ? 'text-red-600' : 'text-amber-600'
                }`}>
                  warning
                </span>
                <span className={`text-xs font-semibold ${
                  alert.type === 'danger'
                    ? 'text-red-800 dark:text-red-200'
                    : 'text-amber-800 dark:text-amber-200'
                }`}>
                  {alert.categoryName}: {Math.round(alert.usagePercent)}% of budget
                </span>
              </div>
            ))}
            {summary?.expenseDiffPercent !== undefined && summary.expenseDiffPercent !== 0 && (
              <div className="shrink-0 flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3 py-1.5 rounded-full">
                <span className={`material-symbols-outlined text-[18px] ${
                  summary.expenseDiffPercent > 0 ? 'text-red-500' : 'text-green-500'
                }`}>
                  {summary.expenseDiffPercent > 0 ? 'trending_up' : 'trending_down'}
                </span>
                <span className="text-slate-600 dark:text-slate-300 text-xs font-medium">
                  {summary.expenseDiffPercent > 0 ? '+' : ''}{summary.expenseDiffPercent.toFixed(1)}% vs last month
                </span>
              </div>
            )}
          </div>
        )}

        {/* Recent Activity */}
        <div className="pt-2">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 px-1">Recent Activity</h3>
          {isTransactionsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex items-center gap-4 p-3 rounded-2xl bg-gray-200 dark:bg-gray-700">
                  <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24 mb-2"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
                  </div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {recentTransactions.map((transaction) => {
                const category = transaction.category || { name: '未分類', icon: 'category', color: '#73F590' };
                const dateStr = formatRelativeDate(transaction.date);
                const isToday = dateStr === 'Today';
                const categoryName = category.name || '未分類';
                const paidByName = transaction.paidByUser?.displayName || 'Unknown';
                const timeStr = new Date(transaction.createdAt).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                });
                
                return (
                  <div 
                    key={transaction.id} 
                    onClick={() => navigate(`/add?edit=${transaction.id}`)}
                    className="group flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ 
                          backgroundColor: `${category.color}20`,
                          color: category.color 
                        }}
                      >
                        <span className="material-symbols-outlined">{category.icon || 'category'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {transaction.memo || categoryName}
                        </span>
                        <span className="text-slate-400 text-xs">
                          {isToday ? timeStr : dateStr} • {categoryName}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {formatCurrency(transaction.amount, { 
                          showSign: true, 
                          type: transaction.type 
                        })}
                      </span>
                      <span className="text-xs text-slate-400">{paidByName}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600 mb-2">
                receipt_long
              </span>
              <p className="text-gray-500 dark:text-gray-400">まだ取引がありません</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                「+」ボタンから取引を追加しましょう
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Home;
