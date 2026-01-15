import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../src/stores/useAppStore';
import { useTransactions } from '../src/hooks/useTransactions';
import { formatAmount, formatDate, parseDate, getMonthRange, getPreviousMonth, getNextMonth, formatMonth } from '../src/lib/utils';
import Header from '../src/components/ui/Header';
import GroupSelector from '../src/components/ui/GroupSelector';

const Calendar: React.FC = () => {
  const navigate = useNavigate();
  const { currentGroupId, selectedMonth, setSelectedMonth, selectedCalendarDate, setSelectedCalendarDate } = useAppStore();
  const [isGroupSelectorOpen, setIsGroupSelectorOpen] = useState(false);
  
  const today = formatDate(new Date());
  
  // 初期化: キャッシュがなければ今日の日付を選択
  useEffect(() => {
    if (selectedCalendarDate === null) {
      setSelectedCalendarDate(today);
    }
  }, []);
  
  const yearMonth = selectedMonth || formatMonth(new Date());
  const { start, end } = getMonthRange(yearMonth);
  
  // データ取得
  const { data: transactions = [] } = useTransactions(currentGroupId || '');

  // 選択された月の取引をフィルタ
  const monthTransactions = useMemo(() => {
    return transactions.filter((tx) => tx.date >= start && tx.date <= end);
  }, [transactions, start, end]);

  // 日付ごとに取引をグループ化
  const transactionsByDate = useMemo(() => {
    const groups: Record<string, typeof transactions> = {};
    monthTransactions.forEach((tx) => {
      if (!groups[tx.date]) {
        groups[tx.date] = [];
      }
      groups[tx.date].push(tx);
    });
    return groups;
  }, [monthTransactions]);

  // 日付ごとの収支（収入 - 支出）
  const dailyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    Object.keys(transactionsByDate).forEach((date) => {
      const income = transactionsByDate[date]
        .filter((tx) => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);
      const expense = transactionsByDate[date]
        .filter((tx) => tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);
      totals[date] = income - expense;
    });
    return totals;
  }, [transactionsByDate]);

  // カレンダー生成
  const calendarDays = useMemo(() => {
    const [year, month] = yearMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: Array<{ date: number; dateStr: string; isCurrentMonth: boolean }> = [];

    // 前月の日付（空白埋め）
    for (let i = 0; i < firstDayOfWeek; i++) {
      const prevDate = new Date(year, month - 1, -i);
      days.push({
        date: prevDate.getDate(),
        dateStr: formatDate(prevDate),
        isCurrentMonth: false,
      });
    }

    // 今月の日付
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month - 1, i);
      days.push({
        date: i,
        dateStr: formatDate(date),
        isCurrentMonth: true,
      });
    }

    // 次月の日付（空白埋め、週の最後まで）
    const lastDayOfMonth = new Date(year, month, 0);
    const lastDayOfWeek = lastDayOfMonth.getDay();
    const remainingDays = 6 - lastDayOfWeek;

    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month, i);
      days.push({
        date: i,
        dateStr: formatDate(date),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [yearMonth]);

  // 選択された日付の取引
  const selectedDateTransactions = useMemo(() => {
    if (!selectedCalendarDate) return [];
    return transactionsByDate[selectedCalendarDate] || [];
  }, [selectedCalendarDate, transactionsByDate]);

  // 選択された日付の合計
  const selectedDateTotal = useMemo(() => {
    return selectedDateTransactions
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [selectedDateTransactions]);

  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const monthLabel = new Date(yearMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handlePrevMonth = () => {
    if (selectedMonth) {
      setSelectedMonth(getPreviousMonth(selectedMonth));
      setSelectedCalendarDate(null);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth) {
      setSelectedMonth(getNextMonth(selectedMonth));
      setSelectedCalendarDate(null);
    }
  };

  const handleDateClick = (dateStr: string, isCurrentMonth: boolean) => {
    if (isCurrentMonth) {
      setSelectedCalendarDate(dateStr);
    }
  };

  const formatSelectedDateLabel = (dateStr: string): string => {
    const date = parseDate(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface-light dark:bg-black pb-28">
      <Header
        variant="main"
        homeButtonProps={{
          showDropdown: true,
          onClick: () => setIsGroupSelectorOpen(!isGroupSelectorOpen),
        }}
        title={
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="material-symbols-outlined text-sm text-gray-600 dark:text-gray-400">chevron_left</span>
            </button>
            <span className="text-base font-extrabold tracking-tight text-gray-900 dark:text-white min-w-[140px] text-center">
              {monthLabel}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="material-symbols-outlined text-sm text-gray-600 dark:text-gray-400">chevron_right</span>
            </button>
          </div>
        }
        rightElement={
          <button
            onClick={() => navigate('/history')}
            className="p-2 rounded-full hover:bg-surface-light dark:hover:bg-surface-dark text-gray-600 dark:text-gray-300 transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">search</span>
          </button>
        }
      />

      <GroupSelector
        isOpen={isGroupSelectorOpen}
        onClose={() => setIsGroupSelectorOpen(false)}
      />

      <div className="bg-background-light dark:bg-background-dark shadow-soft z-20 rounded-b-[2rem] relative flex flex-col shrink-0 px-3 pb-4 pt-2">
        <div className="grid grid-cols-7 mb-3">
          {days.map((d) => (
            <div key={d} className="text-center text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-2 gap-x-1">
          {calendarDays.map((day, index) => {
            const isSelected = selectedCalendarDate === day.dateStr;
            const isToday = day.dateStr === today && day.isCurrentMonth;
            const amount = dailyTotals[day.dateStr];
            const hasTransactions = (transactionsByDate[day.dateStr]?.length || 0) > 0;

            return (
              <div
                key={index}
                onClick={() => handleDateClick(day.dateStr, day.isCurrentMonth)}
                className={`flex flex-col items-center gap-0 group cursor-pointer ${isSelected ? 'relative' : ''} ${
                  !day.isCurrentMonth ? 'opacity-30' : ''
                }`}
              >
                <div
                  className={`h-9 w-9 flex items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-primary text-[#111812] shadow-lg z-10 scale-105 font-bold'
                      : isToday
                      ? 'bg-primary/20 text-primary font-bold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-surface-light dark:hover:bg-surface-dark'
                  }`}
                >
                  {day.date}
                </div>
                {amount !== undefined && amount !== 0 ? (
                  <span
                    className={`text-[10px] font-semibold tracking-tight ${
                      isSelected 
                        ? 'text-gray-900 dark:text-white font-bold' 
                        : amount > 0 
                          ? 'text-emerald-500' 
                          : 'text-gray-400'
                    }`}
                  >
                    {formatAmount(amount)}
                  </span>
                ) : hasTransactions ? (
                  <span className="text-[10px] text-gray-300 dark:text-gray-600 font-medium">±0</span>
                ) : (
                  <span className="text-[10px] text-transparent">-</span>
                )}
                {isSelected && <div className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-red-400"></div>}
              </div>
            );
          })}
        </div>
        <div className="flex justify-center mt-4">
          <div className="w-12 h-1 rounded-full bg-gray-200 dark:bg-gray-700"></div>
        </div>
      </div>

      <div className="px-5 pt-4 pb-20">
        {selectedCalendarDate ? (
          <>
            <div className="flex items-end justify-between mb-5">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                  {formatSelectedDateLabel(selectedCalendarDate)}
                </h3>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                  {selectedDateTransactions.length} transaction{selectedDateTransactions.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {formatAmount(selectedDateTotal)}
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Spent</p>
              </div>
            </div>
            {selectedDateTransactions.length > 0 ? (
              <div className="flex flex-col gap-3">
                {selectedDateTransactions.map((tx) => {
                  const paidByName = tx.paidByUser?.displayName || 'Unknown';
                  const initial = paidByName.charAt(0).toUpperCase();
                  const time = new Date(tx.createdAt).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  });
                  const categoryName = tx.category.name || '未分類';

                  return (
                    <div 
                      key={tx.id}
                      onClick={() => navigate(`/add?edit=${tx.id}`)}
                      className="group flex items-center justify-between p-3 rounded-2xl bg-background-light dark:bg-background-dark hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700 cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          className="relative w-12 h-12 rounded-2xl flex items-center justify-center"
                          style={{ 
                            backgroundColor: `${tx.category.color}20`,
                            color: tx.category.color 
                          }}
                        >
                          <span className="material-symbols-outlined">{tx.category.icon || 'category'}</span>
                          <div className="absolute -bottom-1 -right-1 size-5 bg-white dark:bg-background-dark rounded-full flex items-center justify-center p-0.5 shadow-sm">
                            <div className="w-full h-full rounded-full bg-indigo-100 text-[8px] font-bold text-indigo-700 flex items-center justify-center">
                              {initial}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {tx.memo || categoryName}
                          </span>
                          <span className="text-slate-400 text-xs">
                            {time}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="block font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {formatAmount(tx.amount)}
                        </span>
                        <span className="text-xs text-slate-400">{paidByName}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No transactions on this day
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Select a date to view transactions
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar;