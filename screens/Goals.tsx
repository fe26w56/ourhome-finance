import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../src/stores/useAppStore';
import { useGoals, useCreateGoal, useAddContribution } from '../src/hooks/useGoals';
import { useCategories } from '../src/hooks/useCategories';
import { useAuthStore } from '../src/stores/useAuthStore';
import { formatAmount, formatDate, getToday } from '../src/lib/utils';
import { GoalWithCategory } from '../src/services/goalService';
import { motion, AnimatePresence } from 'framer-motion';

import Header from '../src/components/ui/Header';

const Goals: React.FC = () => {
  const navigate = useNavigate();
  const { currentGroupId } = useAppStore();
  const { user } = useAuthStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<GoalWithCategory | null>(null);

  const { data: goals = [], isLoading } = useGoals(currentGroupId || '', false);
  const { data: categories = [] } = useCategories(currentGroupId || '');
  const createGoalMutation = useCreateGoal();
  const addContributionMutation = useAddContribution();

  const calculateProgress = (goal: GoalWithCategory): number => {
    return goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;
  };

  const calculateRemainingDays = (endDate: string | null): number | null => {
    if (!endDate) return null;
    const today = new Date();
    const end = new Date(endDate);
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const handleAddGoal = async (formData: {
    name: string;
    type: 'savings' | 'spending_limit';
    targetAmount: number;
    categoryId?: string | null;
    endDate?: string | null;
  }) => {
    if (!currentGroupId) return;

    try {
      await createGoalMutation.mutateAsync({
        groupId: currentGroupId,
        name: formData.name,
        type: formData.type,
        targetAmount: formData.targetAmount,
        categoryId: formData.categoryId || null,
        startDate: getToday(),
        endDate: formData.endDate || null,
        isRecurring: false,
      });
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Failed to create goal:', error);
    }
  };

  const handleAddContribution = async (amount: number, note?: string) => {
    if (!selectedGoal || !user) return;

    try {
      await addContributionMutation.mutateAsync({
        goalId: selectedGoal.id,
        userId: user.id,
        amount,
        date: getToday(),
        note: note || null,
      });
      setIsContributionModalOpen(false);
      setSelectedGoal(null);
    } catch (error) {
      console.error('Failed to add contribution:', error);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark pb-28">
      <Header
        variant="main"
        title="Goals"
        rightElement={
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">Loading...</div>
          </div>
        ) : goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">savings</span>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-2">No goals yet</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-full bg-primary text-black font-medium"
            >
              Create Your First Goal
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {goals.map((goal) => {
              const progress = calculateProgress(goal);
              const remainingDays = calculateRemainingDays(goal.endDate);
              const isAchieved = goal.isAchieved || progress >= 100;

              return (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  progress={progress}
                  remainingDays={remainingDays}
                  isAchieved={isAchieved}
                  onAddContribution={() => {
                    setSelectedGoal(goal);
                    setIsContributionModalOpen(true);
                  }}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Add Goal Modal */}
      <AddGoalModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddGoal}
        categories={categories}
        isLoading={createGoalMutation.isPending}
      />

      {/* Add Contribution Modal */}
      <AddContributionModal
        isOpen={isContributionModalOpen}
        onClose={() => {
          setIsContributionModalOpen(false);
          setSelectedGoal(null);
        }}
        onSubmit={handleAddContribution}
        goal={selectedGoal}
        isLoading={addContributionMutation.isPending}
      />
    </div>
  );
};

const GoalCard: React.FC<{
  goal: GoalWithCategory;
  progress: number;
  remainingDays: number | null;
  isAchieved: boolean;
  onAddContribution: () => void;
}> = ({ goal, progress, remainingDays, isAchieved, onAddContribution }) => {
  const remainingAmount = goal.targetAmount - goal.currentAmount;

  return (
    <div
      className={`p-5 rounded-2xl border bg-white dark:bg-surface-dark shadow-sm transition-all ${
        isAchieved ? 'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-[#111812] dark:text-white">{goal.name}</h3>
            {isAchieved && (
              <span className="px-2 py-0.5 rounded-full bg-green-500 text-white text-xs font-bold">ACHIEVED!</span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {goal.type === 'savings' ? 'Savings Goal' : 'Spending Limit'}
            {goal.category && ` • ${goal.category.name}`}
          </p>
        </div>
        {goal.type === 'savings' && !isAchieved && (
          <button
            onClick={onAddContribution}
            className="px-3 py-1.5 rounded-full bg-primary text-black text-sm font-medium"
          >
            Add
          </button>
        )}
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {formatAmount(goal.currentAmount)} / {formatAmount(goal.targetAmount)}
          </span>
          <span className="text-sm font-bold text-[#111812] dark:text-white">{progress.toFixed(0)}%</span>
        </div>
        <div className="h-3 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isAchieved ? 'bg-green-500' : progress >= 80 ? 'bg-yellow-500' : 'bg-primary'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          ></div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        {goal.type === 'savings' && !isAchieved && (
          <span>Remaining: {formatAmount(remainingAmount)}</span>
        )}
        {remainingDays !== null && (
          <span>{remainingDays} days left</span>
        )}
        {goal.endDate && (
          <span>Until {formatDate(new Date(goal.endDate))}</span>
        )}
      </div>
    </div>
  );
};

const AddGoalModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    type: 'savings' | 'spending_limit';
    targetAmount: number;
    categoryId?: string | null;
    endDate?: string | null;
  }) => void;
  categories: Array<{ id: string; name: string }>;
  isLoading: boolean;
}> = ({ isOpen, onClose, onSubmit, categories, isLoading }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'savings' | 'spending_limit'>('savings');
  const [targetAmount, setTargetAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [endDate, setEndDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount) return;

    onSubmit({
      name,
      type,
      targetAmount: parseFloat(targetAmount),
      categoryId: categoryId || null,
      endDate: endDate || null,
    });

    // Reset form
    setName('');
    setTargetAmount('');
    setCategoryId(null);
    setEndDate('');
  };

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
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">New Goal</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Goal Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
                  placeholder="e.g., Vacation Fund"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setType('savings')}
                    className={`flex-1 px-4 py-3 rounded-xl font-medium ${
                      type === 'savings'
                        ? 'bg-primary text-black'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Savings
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('spending_limit')}
                    className={`flex-1 px-4 py-3 rounded-xl font-medium ${
                      type === 'spending_limit'
                        ? 'bg-primary text-black'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Spending Limit
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target Amount</label>
                <input
                  type="number"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
                  placeholder="0"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              {type === 'spending_limit' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category (Optional)</label>
                  <select
                    value={categoryId || ''}
                    onChange={(e) => setCategoryId(e.target.value || null)}
                    className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date (Optional)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 rounded-xl bg-primary text-black font-medium disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Create Goal'}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const AddContributionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number, note?: string) => void;
  goal: GoalWithCategory | null;
  isLoading: boolean;
}> = ({ isOpen, onClose, onSubmit, goal, isLoading }) => {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !goal) return;

    onSubmit(parseFloat(amount), note || undefined);
    setAmount('');
    setNote('');
  };

  if (!isOpen || !goal) return null;

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
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add Contribution</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Goal</label>
                <div className="px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-slate-900 dark:text-white">
                  {goal.name}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
                  placeholder="0"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Note (Optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
                  placeholder="e.g., Birthday gift money"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 rounded-xl bg-primary text-black font-medium disabled:opacity-50"
                >
                  {isLoading ? 'Adding...' : 'Add Contribution'}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Goals;
