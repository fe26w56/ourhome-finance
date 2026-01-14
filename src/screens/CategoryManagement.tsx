import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/useAppStore';
import { useCategories } from '../hooks/useCategories';
import { useCreateCategory, useUpdateCategory, useDeleteCategory, useReorderCategories } from '../hooks/useCategories';
import { usePermissions } from '../hooks/usePermissions';
import { Category } from '../types/database';

const CategoryManagement: React.FC = () => {
  const navigate = useNavigate();
  const { currentGroupId } = useAppStore();
  const { showToast } = useAppStore();
  const { data: categories } = useCategories(currentGroupId || '');
  const permissions = usePermissions(currentGroupId || '');
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const reorderCategories = useReorderCategories();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({
    name: '',
    icon: 'category',
    color: '#73F590',
    type: 'expense' as 'expense' | 'income' | 'both',
  });

  const handleCreateCategory = async () => {
    if (!currentGroupId || !newCategory.name.trim()) {
      showToast('カテゴリ名を入力してください', 'error');
      return;
    }

    try {
      await createCategory.mutateAsync({
        groupId: currentGroupId,
        category: newCategory,
      });
      showToast('カテゴリを作成しました', 'success');
      setIsAddModalOpen(false);
      setNewCategory({ name: '', icon: 'category', color: '#73F590', type: 'expense' });
    } catch (error) {
      showToast('カテゴリの作成に失敗しました', 'error');
    }
  };

  const handleUpdateCategory = async (categoryId: string, updates: Partial<Category>) => {
    if (!currentGroupId) return;

    try {
      await updateCategory.mutateAsync({
        categoryId,
        groupId: currentGroupId,
        updates,
      });
      showToast('カテゴリを更新しました', 'success');
      setEditingCategory(null);
    } catch (error) {
      showToast('カテゴリの更新に失敗しました', 'error');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!currentGroupId) return;
    if (!window.confirm('このカテゴリを削除しますか？')) return;

    try {
      await deleteCategory.mutateAsync({ categoryId, groupId: currentGroupId });
      showToast('カテゴリを削除しました', 'success');
    } catch (error) {
      showToast('カテゴリの削除に失敗しました', 'error');
    }
  };

  const commonIcons = [
    'restaurant', 'shopping_bag', 'train', 'bolt', 'phone',
    'local_hospital', 'movie', 'checkroom', 'school', 'home',
    'savings', 'account_balance_wallet', 'more_horiz',
  ];

  const commonColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#95A5A6',
    '#73F590', '#FFD93D', '#6BCF7F',
  ];

  if (!permissions.canManageCategories) {
    return (
      <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
        <header className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-200/50 dark:border-white/10">
          <div className="flex items-center justify-between px-4 h-14">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-base font-bold">Categories</h1>
            <div className="w-10"></div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
          <p className="text-gray-500">カテゴリを管理する権限がありません</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
      <header className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-200/50 dark:border-white/10">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-gray-300">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-base font-bold text-slate-900 dark:text-white">Categories</h1>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="p-2 -mr-2 text-primary"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="space-y-3">
          {categories?.map((category) => (
            <div
              key={category.id}
              className="flex items-center gap-4 p-4 bg-white dark:bg-surface-dark rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm"
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
                  {category.name}
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-xs">
                  {category.type === 'both' ? '支出・収入' : category.type === 'expense' ? '支出' : '収入'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingCategory(category)}
                  className="p-2 text-gray-500 hover:text-primary"
                >
                  <span className="material-symbols-outlined text-[20px]">edit</span>
                </button>
                {!category.isDefault && (
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="p-2 text-gray-500 hover:text-red-500"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Add Category Modal */}
      {isAddModalOpen && (
        <CategoryModal
          category={null}
          onSave={handleCreateCategory}
          onClose={() => {
            setIsAddModalOpen(false);
            setNewCategory({ name: '', icon: 'category', color: '#73F590', type: 'expense' });
          }}
          categoryData={newCategory}
          setCategoryData={setNewCategory}
          isLoading={createCategory.isPending}
        />
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <CategoryModal
          category={editingCategory}
          onSave={(updates) => handleUpdateCategory(editingCategory.id, updates)}
          onClose={() => setEditingCategory(null)}
          isLoading={updateCategory.isPending}
        />
      )}
    </div>
  );
};

interface CategoryModalProps {
  category: Category | null;
  onSave: (updates?: Partial<Category>) => void | Promise<void>;
  onClose: () => void;
  categoryData?: { name: string; icon: string; color: string; type: 'expense' | 'income' | 'both' };
  setCategoryData?: (data: { name: string; icon: string; color: string; type: 'expense' | 'income' | 'both' }) => void;
  isLoading?: boolean;
}

const CategoryModal: React.FC<CategoryModalProps> = ({
  category,
  onSave,
  onClose,
  categoryData,
  setCategoryData,
  isLoading = false,
}) => {
  const { showToast } = useAppStore();
  const [localData, setLocalData] = useState(
    category
      ? {
          name: category.name,
          icon: category.icon,
          color: category.color,
          type: category.type,
        }
      : categoryData || { name: '', icon: 'category', color: '#73F590', type: 'expense' as const }
  );

  const data = categoryData || localData;
  const setData = setCategoryData || setLocalData;

  const commonIcons = [
    'restaurant', 'shopping_bag', 'train', 'bolt', 'phone',
    'local_hospital', 'movie', 'checkroom', 'school', 'home',
    'savings', 'account_balance_wallet', 'more_horiz',
  ];

  const commonColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#95A5A6',
    '#73F590', '#FFD93D', '#6BCF7F',
  ];

  const handleSave = () => {
    if (!data.name.trim()) {
      showToast('カテゴリ名を入力してください', 'error');
      return;
    }
    if (category) {
      onSave(data);
    } else {
      onSave();
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
        onClick={onClose}
      ></div>
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-surface-dark z-40 rounded-t-3xl p-6 pb-10 max-h-[90vh] overflow-y-auto">
        <div className="w-full flex justify-center mb-6">
          <div className="w-12 h-1.5 bg-gray-200 dark:bg-white/20 rounded-full"></div>
        </div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {category ? 'Edit Category' : 'Add Category'}
          </h3>
          <button onClick={onClose} className="p-2 text-gray-500">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
              Category Name
            </label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              className="w-full bg-background-light dark:bg-black/20 border-0 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary"
              placeholder="Category name"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
              Type
            </label>
            <div className="flex gap-2">
              {(['expense', 'income', 'both'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setData({ ...data, type })}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold ${
                    data.type === type
                      ? 'bg-primary text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {type === 'both' ? 'Both' : type === 'expense' ? 'Expense' : 'Income'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
              Icon
            </label>
            <div className="grid grid-cols-6 gap-2">
              {commonIcons.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setData({ ...data, icon })}
                  className={`p-3 rounded-xl ${
                    data.icon === icon
                      ? 'bg-primary/20 ring-2 ring-primary'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  <span className="material-symbols-outlined">{icon}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
              Color
            </label>
            <div className="grid grid-cols-6 gap-2">
              {commonColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setData({ ...data, color })}
                  className={`w-full h-12 rounded-xl ${
                    data.color === color ? 'ring-2 ring-gray-900 dark:ring-white' : ''
                  }`}
                  style={{ backgroundColor: color }}
                ></button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isLoading || !data.name.trim()}
            className="w-full bg-primary hover:bg-green-400 active:bg-green-500 disabled:opacity-50 text-gray-900 h-14 rounded-xl font-bold text-lg shadow-lg active:scale-[0.98] transition-all"
          >
            {isLoading ? '保存中...' : category ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </>
  );
};

export default CategoryManagement;
