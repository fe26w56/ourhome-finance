import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../src/stores/useAppStore';
import { useSettlementBalance, useRecordSettlement, useSettlementHistory } from '../src/hooks/useSettlement';
import { useTransactions } from '../src/hooks/useTransactions';
import { useMembers } from '../src/hooks/useMembers';
import { useAuthStore } from '../src/stores/useAuthStore';
import { formatAmount, formatDate, getToday } from '../src/lib/utils';

import Header from '../src/components/ui/Header';

const Settlement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentGroupId, showToast } = useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<{
    fromUserId: string;
    toUserId: string;
    amount: number;
  } | null>(null);
  const [settledAt, setSettledAt] = useState(getToday());
  const [method, setMethod] = useState('');
  const [note, setNote] = useState('');

  const { data: balanceData } = useSettlementBalance(currentGroupId || '');
  const { data: historyData } = useSettlementHistory(currentGroupId || '');
  const { data: members } = useMembers(currentGroupId || '');
  const { data: transactions } = useTransactions(currentGroupId || '');
  const recordSettlement = useRecordSettlement();

  // 現在のユーザーに関連する精算残高をフィルタ
  const userBalances = balanceData?.filter(
    (b) => b.fromUserId === user?.id || b.toUserId === user?.id
  ) || [];

  // 精算対象の取引を取得（簡易版：精算されていない分割取引）
  const unsettledTransactions = transactions?.filter(
    (t) => t.isShared && t.splits && t.splits.some((s) => !s.isSettled)
  ) || [];

  const handleRecordSettlement = async () => {
    if (!selectedBalance || !currentGroupId) return;

    try {
      await recordSettlement.mutateAsync({
        groupId: currentGroupId,
        fromUserId: selectedBalance.fromUserId,
        toUserId: selectedBalance.toUserId,
        amount: selectedBalance.amount,
        settledAt,
        method: method || undefined,
        note: note || undefined,
      });

      showToast('精算を記録しました', 'success');
      setShowModal(false);
      setSelectedBalance(null);
      setMethod('');
      setNote('');
    } catch (error) {
      showToast('精算の記録に失敗しました', 'error');
      console.error(error);
    }
  };

  const getMemberName = (userId: string) => {
    return members?.find((m) => m.userId === userId)?.user.displayName || 'Unknown';
  };

  const getMemberAvatar = (userId: string) => {
    return members?.find((m) => m.userId === userId)?.user.avatarUrl || undefined;
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark relative">
      <Header variant="sub" title="Settlement" />

      <main className="flex-1 overflow-y-auto px-6 pb-32 no-scrollbar">
        {/* 精算残高カード */}
        {userBalances.length > 0 ? (
          userBalances.map((balance, index) => {
            const isOwing = balance.fromUserId === user?.id;
            const otherUserId = isOwing ? balance.toUserId : balance.fromUserId;
            const otherUserName = getMemberName(otherUserId);
            const otherUserAvatar = getMemberAvatar(otherUserId);

            return (
              <section key={index} className="mt-2 mb-8">
                <div className="relative w-full bg-surface-light dark:bg-surface-dark rounded-3xl p-6 shadow-soft border border-white/50 dark:border-white/5 overflow-hidden group">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700"></div>
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="mb-4 relative">
                      <div className="w-16 h-16 rounded-full p-1 bg-white dark:bg-white/10 border border-slate-100 dark:border-white/10 shadow-sm">
                        {otherUserAvatar ? (
                          <img
                            alt={otherUserName}
                            className="w-full h-full rounded-full object-cover"
                            src={otherUserAvatar}
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                            {otherUserName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-primary text-slate-900 rounded-full p-1 border-2 border-white dark:border-surface-dark">
                        <span className="material-symbols-outlined text-[14px] font-bold block">
                          {isOwing ? 'arrow_outward' : 'arrow_inward'}
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">
                      {isOwing ? `You owe ${otherUserName}` : `${otherUserName} owes you`}
                    </p>
                    <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
                      {formatAmount(balance.amount)}
                    </h2>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-white/5 rounded-full border border-slate-100 dark:border-white/5">
                      <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Payment Pending
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            );
          })
        ) : (
          <section className="mt-2 mb-8">
            <div className="relative w-full bg-surface-light dark:bg-surface-dark rounded-3xl p-6 shadow-soft border border-white/50 dark:border-white/5 overflow-hidden">
              <div className="flex flex-col items-center text-center py-8">
                <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">
                  check_circle
                </span>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                  精算残高はありません
                </p>
              </div>
            </div>
          </section>
        )}

        {/* 精算対象取引 */}
        {unsettledTransactions.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Basis for Settlement
              </h3>
              <span className="text-xs font-medium text-primary cursor-pointer hover:underline">
                View All
              </span>
            </div>

            <div className="space-y-3">
              {unsettledTransactions.slice(0, 5).map((transaction) => {
                const category = transaction.category;
                const splitInfo = transaction.splits
                  ?.filter((s) => s.userId !== transaction.paidBy && !s.isSettled)
                  .map((s) => getMemberName(s.userId))
                  .join(', ') || '';

                return (
                  <div
                    key={transaction.id}
                    className="flex items-center gap-4 p-4 bg-surface-light dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm transition-transform active:scale-[0.98]"
                  >
                    <div
                      className="flex-shrink-0 size-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: category.color + '20' }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ color: category.color }}
                      >
                        {category.icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 dark:text-white font-semibold truncate">
                        {transaction.memo || category.name}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">
                        {formatDate(new Date(transaction.date))} • {splitInfo}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-900 dark:text-white font-bold">
                        {formatAmount(transaction.amount)}
                      </p>
                      <p className="text-slate-400 text-xs font-medium">
                        {transaction.splits?.length || 0} splits
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* 精算履歴 */}
        {historyData && historyData.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4 px-2 mt-8">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Settlement History
              </h3>
            </div>

            <div className="space-y-3">
              {historyData.slice(0, 10).map((settlement) => (
                <div
                  key={settlement.id}
                  className="flex items-center gap-4 p-4 bg-surface-light dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm"
                >
                  <div className="flex-shrink-0 size-12 rounded-xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-400">
                    <span className="material-symbols-outlined">check_circle</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900 dark:text-white font-semibold truncate">
                      {getMemberName(settlement.fromUserId)} → {getMemberName(settlement.toUserId)}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">
                      {formatDate(new Date(settlement.settledAt))}
                      {settlement.method && ` • ${settlement.method}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-900 dark:text-white font-bold">
                      {formatAmount(settlement.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Record Settlement Button */}
      {userBalances.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background-light via-background-light to-transparent dark:from-background-dark dark:via-background-dark pt-12 z-20">
          <button
            onClick={() => {
              if (userBalances.length > 0) {
                setSelectedBalance(userBalances[0]);
                setShowModal(true);
              }
            }}
            className="w-full bg-primary hover:bg-primary-dark active:scale-[0.98] transition-all h-14 rounded-2xl flex items-center justify-center gap-2 shadow-glow group"
          >
            <span className="material-symbols-outlined text-slate-900 font-medium transition-transform group-hover:rotate-12">
              payments
            </span>
            <span className="text-slate-900 font-bold text-lg tracking-tight">
              Record Settlement
            </span>
          </button>
        </div>
      )}

      {/* Settlement Modal */}
      {showModal && selectedBalance && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 animate-fade-in"
            onClick={() => setShowModal(false)}
          ></div>
          <div className="fixed bottom-0 left-0 right-0 bg-surface-light dark:bg-[#1a2e1f] z-40 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 pb-10 animate-slide-up">
            <div className="w-full flex justify-center mb-6">
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-white/20 rounded-full"></div>
            </div>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Confirm Settlement
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 bg-slate-100 dark:bg-white/5 rounded-full text-slate-500"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="space-y-6">
              <div className="p-4 bg-white dark:bg-black/20 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">精算内容</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {getMemberName(selectedBalance.fromUserId)} →{' '}
                  {getMemberName(selectedBalance.toUserId)}
                </p>
                <p className="text-2xl font-extrabold text-primary mt-2">
                  {formatAmount(selectedBalance.amount)}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                  Settlement Date
                </label>
                <input
                  className="w-full bg-background-light dark:bg-black/20 border-0 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary"
                  type="date"
                  value={settledAt}
                  onChange={(e) => setSettledAt(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                  Payment Method (Optional)
                </label>
                <input
                  className="w-full bg-background-light dark:bg-black/20 border-0 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary"
                  type="text"
                  placeholder="e.g. Bank Transfer, Cash"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                  Note (Optional)
                </label>
                <textarea
                  className="w-full bg-background-light dark:bg-black/20 border-0 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary"
                  placeholder="Add a note..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
              </div>

              <button
                onClick={handleRecordSettlement}
                disabled={recordSettlement.isPending}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 h-14 rounded-xl font-bold text-lg mt-4 shadow-lg active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                {recordSettlement.isPending ? '記録中...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Settlement;
