import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../src/stores/useAppStore';
import { useFilterStore } from '../src/stores/useFilterStore';
import { useMonthlySummary, useCategoryStats, useDailyTrend } from '../src/hooks/useStats';
import { useBudgets } from '../src/hooks/useBudgets';
import { useCategories } from '../src/hooks/useCategories';
import { useSettlementBalance } from '../src/hooks/useSettlement';
import { useAuthStore } from '../src/stores/useAuthStore';
import { formatAmount, getPreviousMonth, getNextMonth, formatMonth } from '../src/lib/utils';

import Header from '../src/components/ui/Header';
import GroupSelector from '../src/components/ui/GroupSelector';
import { BudgetCreateModal, UnbudgetedCategoryCard } from '../src/components/budget';

type TabType = 'summary' | 'budget' | 'trend';

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('budget');
  const { t: tReport } = useTranslation('report');
  const { currentGroupId, selectedMonth, setSelectedMonth } = useAppStore();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [isGroupSelectorOpen, setIsGroupSelectorOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [preselectedCategoryId, setPreselectedCategoryId] = useState<string | undefined>();
  
  const yearMonth = selectedMonth || formatMonth(new Date());
  
  // データ取得
  const { data: monthlySummary, isLoading: isLoadingSummary } = useMonthlySummary(currentGroupId || '', yearMonth);
  const { data: categoryStats = [], isLoading: isLoadingCategory } = useCategoryStats(currentGroupId || '', yearMonth);
  const { data: dailyTrend = [], isLoading: isLoadingTrend } = useDailyTrend(currentGroupId || '', yearMonth);
  const { data: budgets = [] } = useBudgets(currentGroupId || '');
  const { data: categories = [] } = useCategories(currentGroupId || '');
  const { data: balanceData } = useSettlementBalance(currentGroupId || '');

  // 前月比計算
  const prevMonth = getPreviousMonth(yearMonth);
  const { data: prevMonthlySummary } = useMonthlySummary(currentGroupId || '', prevMonth);

  const expenseDiff = useMemo(() => {
    if (!monthlySummary || !prevMonthlySummary) return null;
    const diff = monthlySummary.totalExpense - prevMonthlySummary.totalExpense;
    const percent = prevMonthlySummary.totalExpense > 0 
      ? ((diff / prevMonthlySummary.totalExpense) * 100)
      : 0;
    return { diff, percent };
  }, [monthlySummary, prevMonthlySummary]);

  // 円グラフ用データ
  const pieData = useMemo(() => {
    return categoryStats
      .filter((stat) => stat.amount > 0)
      .map((stat) => ({
        name: stat.categoryName,
        value: stat.amount,
        color: stat.categoryColor || '#73F590',
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // 上位6件
  }, [categoryStats]);

  // 予算vs実績データ
  const budgetVsActual = useMemo(() => {
    return categoryStats
      .map((stat) => {
        const budget = budgets.find((b) => b.categoryId === stat.categoryId);
        if (!budget || stat.amount === 0) return null;
        const percent = (stat.amount / budget.amount) * 100;
        return {
          categoryId: stat.categoryId,
          categoryName: stat.categoryName,
          categoryIcon: stat.categoryIcon,
          categoryColor: stat.categoryColor,
          used: stat.amount,
          total: budget.amount,
          percent: Math.round(percent),
          isOver: percent > 100,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.used - a.used);
  }, [categoryStats, budgets]);

  // 予算未設定カテゴリ（支出があるが予算がないカテゴリ）
  const unbudgetedCategories = useMemo(() => {
    const budgetedCategoryIds = new Set(
      budgets
        .filter((b) => b.categoryId !== null)
        .map((b) => b.categoryId)
    );

    return categoryStats
      .filter((stat) => {
        const hasExpense = stat.amount > 0;
        const noBudget = !budgetedCategoryIds.has(stat.categoryId);
        return hasExpense && noBudget;
      })
      .map((stat) => ({
        categoryId: stat.categoryId,
        categoryName: stat.categoryName,
        categoryIcon: stat.categoryIcon,
        categoryColor: stat.categoryColor || '#73F590',
        spentAmount: stat.amount,
      }));
  }, [budgets, categoryStats]);

  // 既存予算のカテゴリID一覧（モーダルで除外用）
  const existingBudgetCategoryIds = useMemo(() => {
    return budgets
      .filter((b) => b.categoryId !== null)
      .map((b) => b.categoryId as string);
  }, [budgets]);

  // 全体予算
  const totalBudget = useMemo(() => {
    return budgets.find((b) => b.categoryId === null);
  }, [budgets]);

  // 全体予算の進捗計算
  const totalBudgetProgress = useMemo(() => {
    if (!totalBudget || !monthlySummary) return null;
    const percent = (monthlySummary.totalExpense / totalBudget.amount) * 100;
    return {
      used: monthlySummary.totalExpense,
      total: totalBudget.amount,
      percent: Math.round(percent),
      isOver: percent > 100,
    };
  }, [totalBudget, monthlySummary]);

  // 予算残高の計算
  const budgetRemaining = useMemo(() => {
    if (!monthlySummary) return null;
    return monthlySummary.budgetRemaining;
  }, [monthlySummary]);

  // 未精算残高の計算（現在のユーザーに関連する残高の合計）
  const unsettledAmount = useMemo(() => {
    if (!balanceData || !user) return 0;
    const userBalances = balanceData.filter(
      (b) => b.fromUserId === user.id || b.toUserId === user.id
    );
    return userBalances.reduce((sum, balance) => sum + balance.amount, 0);
  }, [balanceData, user]);

  const handlePrevMonth = () => {
    if (selectedMonth) {
      setSelectedMonth(getPreviousMonth(selectedMonth));
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth) {
      setSelectedMonth(getNextMonth(selectedMonth));
    }
  };

  const handleOpenCreateModal = (categoryId?: string) => {
    setPreselectedCategoryId(categoryId);
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setPreselectedCategoryId(undefined);
  };

  // 予算項目タップでHistory画面に遷移
  const filterStore = useFilterStore();
  const handleBudgetItemClick = (categoryId: string | null) => {
    if (categoryId) {
      filterStore.setCategoryIds([categoryId]);
    } else {
      filterStore.setCategoryIds([]);
    }
    navigate('/history');
  };

  // タブごとに必要なデータのローディング状態
  const isSummaryLoading = isLoadingSummary || isLoadingCategory;
  const isBudgetLoading = isLoadingCategory;
  const isTrendLoading = isLoadingTrend;

  const monthLabel = new Date(yearMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark pb-28">
      <Header
        variant="main"
        title="Reports"
        homeButtonProps={{
          showDropdown: true,
          onClick: () => setIsGroupSelectorOpen(!isGroupSelectorOpen),
        }}
      />

      <GroupSelector
        isOpen={isGroupSelectorOpen}
        onClose={() => setIsGroupSelectorOpen(false)}
      />

      {/* Budget Create Modal */}
      <BudgetCreateModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        groupId={currentGroupId || ''}
        categories={categories}
        existingBudgetCategoryIds={existingBudgetCategoryIds}
        preselectedCategoryId={preselectedCategoryId}
        existingTotalBudget={totalBudget}
      />

      <div className="flex-1 flex flex-col gap-6 px-4 py-4">
        {/* Date & Tabs */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 p-1 rounded-full border border-gray-100 dark:border-gray-800">
              <button onClick={handlePrevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-gray-700 shadow-sm text-gray-500">
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>
              <span className="text-sm font-bold text-[#111812] dark:text-white min-w-[100px] text-center">{monthLabel}</span>
              <button onClick={handleNextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-gray-700 shadow-sm text-gray-500">
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
            </div>
          </div>
          <div className="flex p-1 bg-[#f4f6f5] dark:bg-gray-800 rounded-2xl">
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold transition-colors ${
                activeTab === 'summary'
                  ? 'bg-white dark:bg-surface-dark shadow-sm text-[#111812] dark:text-white'
                  : 'text-gray-500 hover:text-[#111812] dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setActiveTab('budget')}
              className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'budget'
                  ? 'bg-white dark:bg-surface-dark shadow-sm text-[#111812] dark:text-white'
                  : 'text-gray-500 hover:text-[#111812] dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              Budget
            </button>
            <button
              onClick={() => setActiveTab('trend')}
              className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'trend'
                  ? 'bg-white dark:bg-surface-dark shadow-sm text-[#111812] dark:text-white'
                  : 'text-gray-500 hover:text-[#111812] dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              Trend
            </button>
          </div>
        </div>

        {activeTab === 'summary' && (
          isSummaryLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-400">Loading...</div>
            </div>
          ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Expense</p>
                    <p className="text-2xl font-bold text-[#111812] dark:text-white">
                      {monthlySummary ? formatAmount(monthlySummary.totalExpense) : '¥0'}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Income</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {monthlySummary ? formatAmount(monthlySummary.totalIncome) : '¥0'}
                    </p>
                  </div>
                </div>

                {/* Chart */}
                {pieData.length > 0 && (
                  <div className="relative flex flex-col items-center justify-center p-6 rounded-[2rem] border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark shadow-sm">
                    <div className="relative size-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            innerRadius={80}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={10}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                          Total Spent
                        </span>
                        <span className="text-3xl font-bold text-[#111812] dark:text-white tracking-tight">
                          {monthlySummary ? formatAmount(monthlySummary.totalExpense) : '¥0'}
                        </span>
                      </div>
                    </div>
                    <div className="flex w-full justify-between px-2 mt-4 flex-wrap gap-2">
                      {pieData.slice(0, 4).map((item, i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <div className="w-8 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-center">
                            {item.name.length > 8 ? item.name.substring(0, 8) + '...' : item.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Insight */}
                {budgetRemaining !== null && budgetRemaining > 0 && (
                  <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#f0fdf4] dark:bg-green-900/20 border border-green-100 dark:border-green-800/50">
                    <div className="flex items-center justify-center shrink-0 w-10 h-10 rounded-full bg-white dark:bg-green-800 text-2xl shadow-sm">🎉</div>
                    <div>
                      <h3 className="text-sm font-bold text-green-900 dark:text-green-100 mb-0.5">{tReport('underBudget.title')}</h3>
                      <p className="text-sm text-green-700 dark:text-green-300 leading-snug">
                        {tReport('underBudget.message', { amount: formatAmount(budgetRemaining) })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Previous Month Comparison */}
                {expenseDiff && (
                  <div className="p-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Compared to last month</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${expenseDiff.diff >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {expenseDiff.diff >= 0 ? '+' : ''}
                        {formatAmount(Math.abs(expenseDiff.diff))}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ({expenseDiff.percent >= 0 ? '+' : ''}
                        {expenseDiff.percent.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                )}

                {/* Settlement History Link */}
                <button
                  onClick={() => navigate('/settlement')}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 shadow-sm active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500">
                      <span className="material-symbols-outlined">history</span>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-bold text-[#111812] dark:text-white">
                        Settlement History
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        未精算: {formatAmount(unsettledAmount)}
                      </span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                </button>
              </>
          )
        )}

        {activeTab === 'budget' && (
          isBudgetLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-400">Loading...</div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
                <div className="flex items-end justify-between px-1">
                  <h2 className="text-xl font-bold text-[#111812] dark:text-white">Budget vs Actual</h2>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Breakdown</span>
                </div>

                {/* 全体予算 */}
                {totalBudgetProgress && (
                  <BudgetBar
                    title={t('total.title')}
                    used={totalBudgetProgress.used}
                    total={totalBudgetProgress.total}
                    percent={totalBudgetProgress.percent}
                    icon="account_balance_wallet"
                    color="blue"
                    isOver={totalBudgetProgress.isOver}
                    onClick={() => handleBudgetItemClick(null)}
                  />
                )}
                
                {/* 予算設定済みカテゴリ */}
                {budgetVsActual.length > 0 && (
                  <div className="flex flex-col gap-3">
                    {budgetVsActual.map((item) => (
                      <BudgetBar
                        key={item.categoryId}
                        title={item.categoryName}
                        used={item.used}
                        total={item.total}
                        percent={item.percent}
                        icon={item.categoryIcon}
                        color={item.categoryColor}
                        isOver={item.isOver}
                        onClick={() => handleBudgetItemClick(item.categoryId)}
                      />
                    ))}
                  </div>
                )}

                {/* 予算未設定カテゴリ */}
                {unbudgetedCategories.length > 0 && (
                  <div className="flex flex-col gap-3 mt-2">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 px-1">
                      {t('unbudgeted.label')}
                    </h3>
                    {unbudgetedCategories.map((item) => (
                      <UnbudgetedCategoryCard
                        key={item.categoryId}
                        categoryId={item.categoryId}
                        categoryName={item.categoryName}
                        categoryIcon={item.categoryIcon}
                        categoryColor={item.categoryColor}
                        spentAmount={item.spentAmount}
                        onSetBudget={handleOpenCreateModal}
                      />
                    ))}
                  </div>
                )}

                {/* 予算データなし */}
                {budgetVsActual.length === 0 && unbudgetedCategories.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No budget data available
                  </div>
                )}

                {/* 予算を追加ボタン */}
              <button
                onClick={() => handleOpenCreateModal()}
                className="flex items-center justify-center gap-2 py-4 px-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-primary hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-xl">add</span>
                <span className="font-medium">{t('addBudget')}</span>
              </button>
            </div>
          )
        )}

        {activeTab === 'trend' && (
          isTrendLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-400">Loading...</div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
                <h2 className="text-xl font-bold text-[#111812] dark:text-white px-1">Daily Trend</h2>
                {dailyTrend.length > 0 ? (
                  <div className="p-4 rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 shadow-sm">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={dailyTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            return `${date.getMonth() + 1}/${date.getDate()}`;
                          }}
                          stroke="#9ca3af"
                        />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip
                          formatter={(value: number) => formatAmount(value)}
                          labelFormatter={(label) => {
                            const date = new Date(label);
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="expense"
                          stroke="#ef4444"
                          strokeWidth={2}
                          name="Expense"
                          dot={{ r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="income"
                          stroke="#10b981"
                          strokeWidth={2}
                          name="Income"
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No trend data available
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
};

const BudgetBar: React.FC<{
  title: string;
  used: number;
  total: number;
  percent: number;
  icon: string;
  color: string;
  isOver?: boolean;
  onClick?: () => void;
}> = ({ title, used, total, percent, icon, color, isOver, onClick }) => {
  // Tailwindの動的クラス名を避けるため、インラインスタイルを使用
  const colorMap: Record<string, { bg: string; text: string }> = {
    green: { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
    red: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
    orange: { bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
  };
  const colorClass = colorMap[color] || colorMap.green;

  return (
    <div
      onClick={onClick}
      className={`group flex flex-col gap-2 p-4 rounded-2xl border bg-white dark:bg-surface-dark shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] transition-all cursor-pointer ${
        isOver ? 'border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/10' : 'border-gray-100 dark:border-gray-800 hover:border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorClass.bg} ${colorClass.text}`}>
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-[#111812] dark:text-white">{title}</span>
            <span className={`text-xs font-medium ${isOver ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
              {percent}% spent
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-sm font-bold ${isOver ? 'text-red-600' : 'text-[#111812] dark:text-white'}`}>
            {formatAmount(used)}
          </p>
          <p className="text-xs text-gray-400">of {formatAmount(total)}</p>
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div
          className={`h-full rounded-full ${isOver ? 'bg-red-500' : 'bg-primary'}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        ></div>
      </div>
    </div>
  );
};

export default Reports;