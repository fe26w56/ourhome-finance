import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../src/stores/useAppStore';
import { useBudgets, useUpsertBudget } from '../src/hooks/useBudgets';
import { useCategories } from '../src/hooks/useCategories';
import { useTransactions } from '../src/hooks/useTransactions';
import { usePermissions } from '../src/hooks/usePermissions';
import { calculateBudgetStatus } from '../src/lib/budgetCalculator';
import { formatAmount } from '../src/lib/utils';
import { Budget as BudgetType } from '../src/types/database';

import Header from '../src/components/ui/Header';

const Budget: React.FC = () => {
  const navigate = useNavigate();
  const { currentGroupId, showToast } = useAppStore();

  const { data: budgets } = useBudgets(currentGroupId || '');
  const { data: categories } = useCategories(currentGroupId || '');
  const { data: transactions } = useTransactions(currentGroupId || '');
  const permissions = usePermissions(currentGroupId || '');
  const upsertBudget = useUpsertBudget();

  const [isEditingTotal, setIsEditingTotal] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState<string | null>(null);
  const [totalBudgetAmount, setTotalBudgetAmount] = useState('');
  const [categoryBudgetAmounts, setCategoryBudgetAmounts] = useState<Record<string, string>>({});
  const [carryOverEnabled, setCarryOverEnabled] = useState(true);

  // 全体予算を取得
  const totalBudget = budgets?.find((b) => b.categoryId === null);
  const categoryBudgets = budgets?.filter((b) => b.categoryId !== null) || [];

  // 全体予算の使用状況を計算
  const totalBudgetStatus = totalBudget
    ? calculateBudgetStatus(
        totalBudget,
        transactions?.filter((t) => t.type === 'expense') || []
      )
    : null;

  // カテゴリ別予算の使用状況を計算
  const categoryBudgetStatuses = categoryBudgets.map((budget) => {
    const categoryTransactions =
      transactions?.filter(
        (t) => t.type === 'expense' && t.categoryId === budget.categoryId
      ) || [];
    return {
      budget,
      status: calculateBudgetStatus(budget, categoryTransactions),
      category: categories?.find((c) => c.id === budget.categoryId),
    };
  });

  const handleSaveTotalBudget = async () => {
    if (!currentGroupId || !totalBudgetAmount) return;

    try {
      await upsertBudget.mutateAsync({
        groupId: currentGroupId,
        categoryId: null,
        amount: parseFloat(totalBudgetAmount.replace(/,/g, '')),
        carryOver: carryOverEnabled,
      });
      showToast('全体予算を更新しました', 'success');
      setIsEditingTotal(false);
      setTotalBudgetAmount('');
    } catch (error) {
      showToast('予算の更新に失敗しました', 'error');
    }
  };

  const handleSaveCategoryBudget = async (categoryId: string) => {
    if (!currentGroupId || !categoryBudgetAmounts[categoryId]) return;

    try {
      const budget = categoryBudgets.find((b) => b.categoryId === categoryId);
      await upsertBudget.mutateAsync({
        groupId: currentGroupId,
        categoryId,
        amount: parseFloat(categoryBudgetAmounts[categoryId].replace(/,/g, '')),
        carryOver: budget?.carryOver || false,
      });
      showToast('カテゴリ予算を更新しました', 'success');
      setIsEditingCategory(null);
      setCategoryBudgetAmounts({});
    } catch (error) {
      showToast('予算の更新に失敗しました', 'error');
    }
  };

  if (!permissions.canEditBudget) {
    return (
      <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark pb-28">
        <Header variant="sub" title="Budget" />
        <main className="flex-1 flex items-center justify-center p-6">
          <p className="text-gray-500">予算を編集する権限がありません</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark pb-28">
      <Header variant="sub" title="Budget" />

      <main className="flex flex-col gap-6 px-6 pt-2">
        {/* Total Budget Section */}
        <section className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#1a2e20] p-6 shadow-soft group">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-2xl dark:bg-primary/5"></div>
          <div className="relative flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Monthly Budget
              </p>
              {isEditingTotal ? (
                <input
                  type="text"
                  value={totalBudgetAmount}
                  onChange={(e) => setTotalBudgetAmount(e.target.value)}
                  placeholder={totalBudget?.amount.toString() || '0'}
                  className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mt-1 bg-transparent border-b-2 border-primary focus:outline-none w-48"
                  autoFocus
                  onBlur={handleSaveTotalBudget}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveTotalBudget();
                    }
                  }}
                />
              ) : (
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                    {totalBudget ? formatAmount(totalBudget.amount) : '¥0'}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setIsEditingTotal(true);
                setTotalBudgetAmount(totalBudget?.amount.toString() || '');
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-primary hover:text-black transition-all shadow-sm"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                edit
              </span>
            </button>
          </div>
          {totalBudgetStatus && (
            <div className="mt-6 flex items-center gap-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Left:{' '}
                <span
                  className={`font-bold ${
                    totalBudgetStatus.remainingAmount < 0
                      ? 'text-red-500'
                      : totalBudgetStatus.usagePercent >= 80
                      ? 'text-orange-500'
                      : 'text-primary'
                  }`}
                >
                  {formatAmount(totalBudgetStatus.remainingAmount)}
                </span>
              </p>
              <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-black/20 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    totalBudgetStatus.status === 'danger'
                      ? 'bg-red-500'
                      : totalBudgetStatus.status === 'warning'
                      ? 'bg-orange-500'
                      : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min(totalBudgetStatus.usagePercent, 100)}%` }}
                ></div>
              </div>
            </div>
          )}
        </section>

        {/* Category Budgets Section */}
        <section>
          <div className="flex items-center justify-between mb-4 mt-2">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Categories</h3>
            <button className="text-sm font-medium text-gray-400 hover:text-primary transition-colors">
              View All
            </button>
          </div>
          <div className="flex flex-col gap-4">
            {categoryBudgetStatuses.map(({ budget, status, category }) => {
              if (!category) return null;

              const isEditing = isEditingCategory === budget.categoryId;
              const amount = categoryBudgetAmounts[budget.categoryId] || '';

              return (
                <CategoryCard
                  key={budget.id}
                  title={category.name}
                  sub={
                    status.status === 'danger'
                      ? 'Over budget'
                      : status.status === 'warning'
                      ? `${Math.round(status.usagePercent)}% used`
                      : `${Math.round(status.usagePercent)}% used`
                  }
                  used={formatAmount(status.spentAmount)}
                  total={formatAmount(status.budgetAmount)}
                  percent={Math.min(status.usagePercent, 100)}
                  color={
                    status.status === 'danger'
                      ? 'alert'
                      : status.status === 'warning'
                      ? 'warning'
                      : 'primary'
                  }
                  icon={category.icon}
                  isAlert={status.status === 'danger'}
                  isEditing={isEditing}
                  editAmount={amount}
                  onEditClick={() => {
                    setIsEditingCategory(budget.categoryId);
                    setCategoryBudgetAmounts({
                      ...categoryBudgetAmounts,
                      [budget.categoryId]: budget.amount.toString(),
                    });
                  }}
                  onAmountChange={(value) =>
                    setCategoryBudgetAmounts({
                      ...categoryBudgetAmounts,
                      [budget.categoryId]: value,
                    })
                  }
                  onSave={() => handleSaveCategoryBudget(budget.categoryId)}
                  onCancel={() => {
                    setIsEditingCategory(null);
                    setCategoryBudgetAmounts({});
                  }}
                />
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
};

interface CategoryCardProps {
  title: string;
  sub: string;
  used: string;
  total: string;
  percent: number;
  color: string;
  icon: string;
  isAlert?: boolean;
  isEditing?: boolean;
  editAmount?: string;
  onEditClick?: () => void;
  onAmountChange?: (value: string) => void;
  onSave?: () => void;
  onCancel?: () => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  title,
  sub,
  used,
  total,
  percent,
  color,
  icon,
  isAlert,
  isEditing,
  editAmount,
  onEditClick,
  onAmountChange,
  onSave,
  onCancel,
}) => {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary text-gray-900',
    warning: 'bg-orange-500 text-white',
    alert: 'bg-red-500 text-white',
  };
  const barColorMap: Record<string, string> = {
    primary: 'bg-primary',
    warning: 'bg-orange-500',
    alert: 'bg-red-500',
  };
  const iconBgMap: Record<string, string> = {
    primary: 'bg-[#f0f4f1] dark:bg-white/5 text-gray-900 dark:text-primary',
    warning: 'bg-[#fff4e6] dark:bg-orange-500/10 text-orange-500',
    alert: 'bg-[#ffebee] dark:bg-red-500/10 text-red-500',
  };

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl bg-white dark:bg-[#1a2e20] p-4 shadow-soft ${
        isAlert ? 'ring-1 ring-red-500/10' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBgMap[color]}`}>
            <span className="material-symbols-outlined">{icon}</span>
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white leading-tight">{title}</p>
            <p
              className={`text-xs ${
                isAlert ? 'text-red-500 font-medium' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {sub}
            </p>
          </div>
        </div>
        <div className="text-right">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editAmount}
                onChange={(e) => onAmountChange?.(e.target.value)}
                className="w-24 text-sm font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-primary focus:outline-none"
                autoFocus
                onBlur={onSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onSave?.();
                  } else if (e.key === 'Escape') {
                    onCancel?.();
                  }
                }}
              />
            </div>
          ) : (
            <>
              <p
                className={`text-sm font-bold ${
                  isAlert ? 'text-red-500' : 'text-gray-900 dark:text-white'
                }`}
              >
                {used} <span className="text-gray-400 font-normal">/ {total}</span>
              </p>
              <button
                onClick={onEditClick}
                className="text-xs text-gray-400 hover:text-primary mt-1"
              >
                Edit
              </button>
            </>
          )}
        </div>
      </div>
      <div className="relative h-2 w-full rounded-full bg-gray-100 dark:bg-black/20 overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full rounded-full ${barColorMap[color]}`}
          style={{ width: `${percent}%` }}
        ></div>
      </div>
    </div>
  );
};

export default Budget;
