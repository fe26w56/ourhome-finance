import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTransactionStore } from '../src/stores/useTransactionStore';
import { useAppStore } from '../src/stores/useAppStore';
import { useCategories } from '../src/hooks/useCategories';
import { useMembers } from '../src/hooks/useMembers';
import { useCreateTransaction, useUpdateTransaction, useDeleteTransaction, useTransaction } from '../src/hooks/useTransactions';
import { usePermissions } from '../src/hooks/usePermissions';
import { parseAmount, formatDate, formatMonth, getPreviousMonth, getNextMonth } from '../src/lib/utils';
import { calculateEqualSplit, validateAmountSplit } from '../src/lib/splitCalculator';
import { useAuthStore } from '../src/stores/useAuthStore';
import { WhoPaidSelector, ForWhomSelector } from '../src/components/transaction';

import Header from '../src/components/ui/Header';

interface AddTransactionProps {
  transactionId?: string; // 編集モード用
}

const AddTransaction: React.FC<AddTransactionProps> = ({ transactionId }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = transactionId || searchParams.get('edit');
  
  const { user } = useAuthStore();
  const { currentGroupId } = useAppStore();
  const { showToast } = useAppStore();
  
  const {
    type,
    amount,
    date,
    categoryId,
    memo,
    paidBy,
    beneficiaryIds,
    splitType,
    splits,
    errors,
    editingId,
    setType,
    appendAmount,
    deleteLastDigit,
    clearAmount,
    setDate,
    setCategory,
    setMemo,
    setPaidBy,
    setBeneficiaryIds,
    toggleBeneficiary,
    selectAllBeneficiaries,
    getIsShared,
    setSplitType,
    setSplits,
    loadTransaction,
    validate,
    reset,
  } = useTransactionStore();

  const { data: categories } = useCategories(currentGroupId || '');
  const { data: members } = useMembers(currentGroupId || '');
  const permissions = usePermissions(currentGroupId || '');
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();
  const { data: transactionData } = useTransaction(editId || '');

  const isEditMode = !!editId;

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [isSplitOpen, setIsSplitOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(() => formatMonth(new Date(date)));

  // 編集モード: 取引データを読み込む
  useEffect(() => {
    if (isEditMode && transactionData) {
      loadTransaction(transactionData, transactionData.splits || [], transactionData.beneficiaryIds || []);
    }
  }, [isEditMode, transactionData, loadTransaction]);

  // 初期化: 支払者を現在のユーザーに設定
  useEffect(() => {
    if (user && !paidBy && !isEditMode) {
      setPaidBy(user.id);
    }
  }, [user, paidBy, setPaidBy, isEditMode]);

  // 初期化: 受益者を全員に設定（新規作成時）
  useEffect(() => {
    if (!isEditMode && members && members.length > 0 && beneficiaryIds.length === 0) {
      selectAllBeneficiaries(members.map((m) => m.userId));
    }
  }, [isEditMode, members, beneficiaryIds.length, selectAllBeneficiaries]);

  // 受益者が1人の場合は割り勘設定をリセット
  useEffect(() => {
    if (beneficiaryIds.length <= 1 && splitType !== 'none') {
      setSplitType('none');
      setSplits([]);
    }
  }, [beneficiaryIds.length, splitType, setSplitType, setSplits]);

  // 割り勘タイプ変更時に自動計算
  useEffect(() => {
    if (beneficiaryIds.length <= 1 || !members || !paidBy) return;

    if (splitType === 'equal' && beneficiaryIds.length > 0) {
      const calculatedSplits = calculateEqualSplit(parseAmount(amount), beneficiaryIds);
      setSplits(
        calculatedSplits.map((s) => ({
          userId: s.userId,
          amount: s.amount.toString(),
          percentage: s.percentage,
        }))
      );
    }
  }, [splitType, amount, beneficiaryIds, paidBy, members, setSplits]);

  const handleSave = async () => {
    if (!currentGroupId || !categoryId || !paidBy || !user) {
      showToast('必須項目が入力されていません', 'error');
      return;
    }

    if (!validate()) {
      showToast('入力内容を確認してください', 'error');
      return;
    }

    // 権限チェック（編集モード）
    if (isEditMode && transactionData) {
      if (!permissions.canEditTransaction(transactionData.createdBy)) {
        showToast('この取引を編集する権限がありません', 'error');
        return;
      }
    }

    // 受益者が設定されていない場合はデフォルトで全員
    const finalBeneficiaryIds = beneficiaryIds.length > 0 
      ? beneficiaryIds 
      : members?.map((m) => m.userId) || [user.id];

    // is_shared を算出
    const isShared = getIsShared(user.id);

    // 割り勘の検証
    if (beneficiaryIds.length > 1 && splitType !== 'none' && splits.length > 0) {
      const validation = validateAmountSplit(
        parseAmount(amount),
        splits.map((s) => ({ userId: s.userId, amount: parseAmount(s.amount) }))
      );
      if (!validation.isValid) {
        showToast(validation.error || '割り勘の合計が一致しません', 'error');
        return;
      }
    }

    try {
      if (isEditMode && editId) {
        // 更新モード
        await updateTransaction.mutateAsync({
          transactionId: editId,
          groupId: currentGroupId,
          updates: {
            categoryId,
            type,
            amount: parseAmount(amount),
            date,
            memo: memo || undefined,
            isShared,
            paidBy,
          },
          beneficiaryIds: finalBeneficiaryIds,
        });
        showToast('取引を更新しました', 'success');
      } else {
        // 作成モード
        const txData = {
          groupId: currentGroupId,
          categoryId,
          type,
          amount: parseAmount(amount),
          date,
          memo: memo || undefined,
          isShared,
          paidBy,
        };

        if (beneficiaryIds.length > 1 && splitType !== 'none' && splits.length > 0) {
          // 分割あり
          await createTransaction.mutateAsync({
            transaction: txData,
            splits: splits.map((s) => ({
              userId: s.userId,
              amount: parseAmount(s.amount),
              percentage: s.percentage || undefined,
            })),
            beneficiaryIds: finalBeneficiaryIds,
          });
        } else {
          // 分割なし
          await createTransaction.mutateAsync({
            transaction: txData,
            beneficiaryIds: finalBeneficiaryIds,
          });
        }
        showToast('取引を保存しました', 'success');
      }

      reset();
      navigate(-1);
    } catch (error) {
      showToast(isEditMode ? '更新に失敗しました' : '保存に失敗しました', 'error');
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!isEditMode || !editId || !transactionData) return;

    if (!permissions.canDeleteTransaction(transactionData.createdBy)) {
      showToast('この取引を削除する権限がありません', 'error');
      return;
    }

    if (!window.confirm('この取引を削除しますか？')) {
      return;
    }

    try {
      await deleteTransaction.mutateAsync({
        transactionId: editId,
        groupId: currentGroupId || '',
      });
      showToast('取引を削除しました', 'success');
      reset();
      navigate(-1);
    } catch (error) {
      showToast('削除に失敗しました', 'error');
      console.error(error);
    }
  };

  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      deleteLastDigit();
    } else if (key === '.') {
      appendAmount('.');
    } else {
      appendAmount(key);
    }
  };

  // カテゴリフィルタリング（種別に応じて）
  const filteredCategories = categories?.filter((cat) => {
    if (cat.type === 'both') return true;
    return cat.type === type;
  }) || [];

  // よく使うカテゴリ（簡易版：先頭3件）
  const frequentCategories = filteredCategories.slice(0, 3);
  const otherCategories = filteredCategories.slice(3);

  const selectedCategory = categories?.find((c) => c.id === categoryId);

  return (
    <div className="fixed inset-0 z-50 bg-background-light dark:bg-background-dark flex flex-col">
      {/* Header */}
      <Header
        variant="modal"
        title={isEditMode ? 'Edit Transaction' : 'Add Transaction'}
        leftElement="close"
        rightElement={
          <button
            onClick={() => {
              clearAmount();
            }}
            className="p-2 -mr-2 text-sm font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            Reset
          </button>
        }
        onBack={() => {
          reset();
          navigate(-1);
        }}
      />

      {/* Toggles */}
      <div className="flex-none px-6 pb-2 z-20 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md sticky top-[60px]">
        <div className="flex flex-col gap-3">
          {/* Expense / Income */}
          <div className="flex p-1 bg-surface-light dark:bg-surface-dark rounded-xl relative">
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-gray-600 rounded-[10px] shadow-sm transition-all duration-300 ${
                type === 'expense' ? 'left-1' : 'left-[calc(50%+2px)]'
              }`}
            ></div>
            <button
              onClick={() => setType('expense')}
              className={`flex-1 relative z-10 py-2 text-sm font-bold text-center transition-colors ${
                type === 'expense'
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-500'
              }`}
            >
              Expense
            </button>
            <button
              onClick={() => setType('income')}
              className={`flex-1 relative z-10 py-2 text-sm font-bold text-center transition-colors ${
                type === 'income'
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-500'
              }`}
            >
              Income
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        {/* Amount */}
        <div className="flex flex-col items-center justify-center py-8 px-4">
          <span className="text-gray-400 dark:text-gray-500 text-sm font-medium mb-1 tracking-widest uppercase">
            Amount
          </span>
          <div className="relative group cursor-text">
            <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-baseline gap-1">
              <span className="text-3xl text-gray-400 dark:text-gray-600 font-bold">¥</span>
              {parseAmount(amount).toLocaleString()}
              <span className="w-0.5 h-10 bg-primary animate-pulse ml-1 rounded-full"></span>
            </h1>
          </div>
          {errors.amount && (
            <p className="text-red-500 text-sm mt-2">{errors.amount}</p>
          )}
        </div>

        {/* Keypad */}
        <div className="px-6 mb-8">
          <div className="grid grid-cols-3 gap-x-6 gap-y-4 max-w-[280px] mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleKeyPress(num.toString())}
                className="h-14 w-full flex items-center justify-center rounded-2xl text-2xl font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 active:scale-90 transition-all"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => handleKeyPress('.')}
              className="h-14 w-full flex items-center justify-center rounded-2xl text-2xl font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 active:scale-90 transition-all"
            >
              .
            </button>
            <button
              onClick={() => handleKeyPress('0')}
              className="h-14 w-full flex items-center justify-center rounded-2xl text-2xl font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 active:scale-90 transition-all"
            >
              0
            </button>
            <button
              onClick={() => handleKeyPress('backspace')}
              className="h-14 w-full flex items-center justify-center rounded-2xl text-xl font-medium text-gray-900 dark:text-white hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 active:scale-90 transition-all group"
            >
              <span className="material-symbols-outlined group-hover:text-red-500 transition-colors">
                backspace
              </span>
            </button>
          </div>
        </div>

        {/* Details Form */}
        <div className="bg-gray-50 dark:bg-surface-dark/50 rounded-t-[2rem] pt-8 px-5 pb-6 min-h-[300px] space-y-6 border-t border-gray-100 dark:border-white/5">
          {/* Date */}
          <div
            onClick={() => {
              setPickerMonth(formatMonth(new Date(date)));
              setIsDatePickerOpen(true);
            }}
            className="flex items-center justify-between p-3 bg-white dark:bg-surface-dark rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm active:scale-[0.99] transition-transform cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
                <span className="material-symbols-outlined">calendar_today</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Date</span>
                <span className="text-gray-900 dark:text-white font-semibold">
                  {formatDate(new Date(date))}
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
          </div>

          {/* Date Picker Modal - Calendar View */}
          {isDatePickerOpen && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setIsDatePickerOpen(false)}>
              <div 
                className="bg-white dark:bg-surface-dark rounded-t-3xl p-6 w-full"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setPickerMonth(getPreviousMonth(pickerMonth))}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">chevron_left</span>
                  </button>
                  <span className="text-base font-bold text-gray-900 dark:text-white">
                    {new Date(pickerMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => setPickerMonth(getNextMonth(pickerMonth))}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">chevron_right</span>
                  </button>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 mb-2">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={i} className="text-center text-xs font-bold text-gray-400 uppercase">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-y-2">
                  {(() => {
                    const [year, month] = pickerMonth.split('-').map(Number);
                    const firstDay = new Date(year, month - 1, 1);
                    const lastDay = new Date(year, month, 0);
                    const firstDayOfWeek = firstDay.getDay();
                    const daysInMonth = lastDay.getDate();
                    const today = formatDate(new Date());

                    const days: Array<{ date: number; dateStr: string; isCurrentMonth: boolean }> = [];

                    // Previous month days
                    for (let i = 0; i < firstDayOfWeek; i++) {
                      const prevDate = new Date(year, month - 1, -firstDayOfWeek + i + 1);
                      days.push({
                        date: prevDate.getDate(),
                        dateStr: formatDate(prevDate),
                        isCurrentMonth: false,
                      });
                    }

                    // Current month days
                    for (let i = 1; i <= daysInMonth; i++) {
                      const d = new Date(year, month - 1, i);
                      days.push({
                        date: i,
                        dateStr: formatDate(d),
                        isCurrentMonth: true,
                      });
                    }

                    // Next month days (fill to 42 for 6 rows)
                    const remainingDays = 42 - days.length;
                    for (let i = 1; i <= remainingDays; i++) {
                      const d = new Date(year, month, i);
                      days.push({
                        date: i,
                        dateStr: formatDate(d),
                        isCurrentMonth: false,
                      });
                    }

                    return days.map((day, index) => {
                      const isSelected = date === day.dateStr;
                      const isToday = day.dateStr === today && day.isCurrentMonth;

                      return (
                        <button
                          key={index}
                          onClick={() => {
                            setDate(day.dateStr);
                            setIsDatePickerOpen(false);
                          }}
                          className={`h-10 w-full flex items-center justify-center rounded-full text-sm font-medium transition-all ${
                            !day.isCurrentMonth
                              ? 'text-gray-300 dark:text-gray-600'
                              : isSelected
                              ? 'bg-primary text-[#111812] font-bold'
                              : isToday
                              ? 'bg-primary/20 text-primary font-bold'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          {day.date}
                        </button>
                      );
                    });
                  })()}
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setIsDatePickerOpen(false)}
                  className="mt-4 w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-xl font-semibold text-gray-700 dark:text-gray-300"
                >
                  閉じる
                </button>
              </div>
            </div>
          )}

          {/* Who Paid / For Whom - メンバー2人以上の場合のみ表示 */}
          {members && members.length > 1 && user && (
            <>
              <WhoPaidSelector
                members={members}
                selectedUserId={paidBy}
                currentUserId={user.id}
                onSelect={setPaidBy}
              />
              <ForWhomSelector
                members={members}
                selectedUserIds={beneficiaryIds}
                currentUserId={user.id}
                onToggle={toggleBeneficiary}
                onSelectAll={() => selectAllBeneficiaries(members.map((m) => m.userId))}
              />
            </>
          )}

          {/* Categories */}
          <div className="space-y-3">
            <div className="flex justify-between items-baseline px-1">
              <label className="text-sm font-semibold text-gray-900 dark:text-white">
                Category
              </label>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-5 px-5 snap-x">
              {frequentCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setCategory(category.id)}
                  className="snap-start shrink-0 flex flex-col items-center gap-2 group"
                >
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shadow-glow transition-all ${
                      categoryId === category.id
                        ? 'bg-primary text-gray-900'
                        : 'bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 group-hover:bg-gray-50 dark:group-hover:bg-white/5'
                    }`}
                    style={{
                      backgroundColor:
                        categoryId === category.id ? category.color : undefined,
                    }}
                  >
                    <span className="material-symbols-outlined">{category.icon}</span>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      categoryId === category.id
                        ? 'text-gray-900 dark:text-white font-bold'
                        : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200'
                    }`}
                  >
                    {category.name}
                  </span>
                </button>
              ))}
              {otherCategories.length > 0 && (
                <button
                  onClick={() => setIsCategoryPickerOpen(true)}
                  className="snap-start shrink-0 flex flex-col items-center gap-2 group"
                >
                  <div className="w-16 h-16 rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 flex items-center justify-center text-2xl group-hover:bg-gray-50 dark:group-hover:bg-white/5 transition-all">
                    <span className="material-symbols-outlined">add</span>
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200">
                    More
                  </span>
                </button>
              )}
            </div>
            {errors.categoryId && (
              <p className="text-red-500 text-sm px-1">{errors.categoryId}</p>
            )}
          </div>

          {/* Category Picker Modal */}
          {isCategoryPickerOpen && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
              <div className="bg-white dark:bg-surface-dark rounded-t-3xl p-6 w-full max-h-[70vh] overflow-y-auto">
                <h3 className="text-lg font-bold mb-4">カテゴリを選択</h3>
                <div className="grid grid-cols-4 gap-4">
                  {filteredCategories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setCategory(category.id);
                        setIsCategoryPickerOpen(false);
                      }}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50"
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: category.color }}
                      >
                        <span className="material-symbols-outlined text-white">
                          {category.icon}
                        </span>
                      </div>
                      <span className="text-xs">{category.name}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setIsCategoryPickerOpen(false)}
                  className="mt-4 w-full p-3 bg-gray-100 rounded-xl"
                >
                  閉じる
                </button>
              </div>
            </div>
          )}

          {/* Note Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-gray-400">edit_note</span>
            </div>
            <input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="block w-full pl-10 pr-3 py-4 border-none rounded-2xl bg-white dark:bg-surface-dark text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium transition-shadow shadow-sm"
              placeholder="Add a note..."
              type="text"
            />
          </div>

          {/* Split Section (複数の受益者がいる場合のみ) */}
          {beneficiaryIds.length > 1 && members && members.length > 1 && (
            <div className="space-y-3">
              <div className="flex justify-between items-baseline px-1">
                <label className="text-sm font-semibold text-gray-900 dark:text-white">
                  割り勘
                </label>
                <button
                  onClick={() => setIsSplitOpen(!isSplitOpen)}
                  className="text-xs font-semibold text-primary hover:text-green-600 transition-colors"
                >
                  {isSplitOpen ? '閉じる' : '設定'}
                </button>
              </div>
              {isSplitOpen && (
                <div className="bg-white dark:bg-surface-dark rounded-2xl p-4 space-y-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSplitType('equal')}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold ${
                        splitType === 'equal'
                          ? 'bg-primary text-gray-900'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      均等
                    </button>
                    <button
                      onClick={() => setSplitType('amount')}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold ${
                        splitType === 'amount'
                          ? 'bg-primary text-gray-900'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      金額指定
                    </button>
                  </div>
                  {splitType !== 'none' && splits.length > 0 && (
                    <div className="space-y-2">
                      {splits.map((split) => {
                        const member = members.find((m) => m.userId === split.userId);
                        return (
                          <div key={split.userId} className="flex items-center justify-between">
                            <span className="text-sm">{member?.user.displayName || ''}</span>
                            <span className="text-sm font-semibold">
                              ¥{parseAmount(split.amount).toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                      {errors.splits && (
                        <p className="text-red-500 text-sm">{errors.splits}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="h-24"></div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-background-light via-background-light to-transparent dark:from-background-dark dark:via-background-dark dark:to-transparent z-30 pb-8 space-y-3">
        {isEditMode && (
          <button
            onClick={handleDelete}
            disabled={deleteTransaction.isPending || !permissions.canDeleteTransaction(transactionData?.createdBy || '')}
            className="w-full h-12 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 active:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed text-red-600 dark:text-red-400 rounded-xl font-bold text-base shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {deleteTransaction.isPending ? (
              <>削除中...</>
            ) : (
              <>
                <span className="material-symbols-outlined">delete</span>
                Delete Transaction
              </>
            )}
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={
            (isEditMode ? updateTransaction.isPending : createTransaction.isPending) ||
            (!isEditMode && !permissions.canCreateTransaction)
          }
          className="w-full h-14 bg-primary hover:bg-green-400 active:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-[#111812] rounded-xl font-bold text-lg shadow-lg shadow-green-400/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          {isEditMode ? (
            updateTransaction.isPending ? (
              <>更新中...</>
            ) : (
              <>
                <span className="material-symbols-outlined">check</span>
                Update Transaction
              </>
            )
          ) : createTransaction.isPending ? (
            <>保存中...</>
          ) : (
            <>
              <span className="material-symbols-outlined">check</span>
              Save Transaction
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AddTransaction;
