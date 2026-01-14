/**
 * カテゴリ関連のTanStack Queryフック
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from '../services/categoryService';
import { Category } from '../types/database';
import { queryKeys } from '../lib/queryKeys';

/**
 * グループのカテゴリ一覧を取得
 */
export function useCategories(groupId: string) {
  return useQuery({
    queryKey: queryKeys.categories.list(groupId),
    queryFn: () => getCategories(groupId),
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ（頻繁に変更されない）
  });
}

/**
 * カテゴリを作成
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      category,
    }: {
      groupId: string;
      category: Parameters<typeof createCategory>[1];
    }) => createCategory(groupId, category),
    onSuccess: (data, variables) => {
      // カテゴリ一覧を再取得
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.list(variables.groupId) });
    },
  });
}

/**
 * カテゴリを更新
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      categoryId,
      updates,
      groupId,
    }: {
      categoryId: string;
      updates: Parameters<typeof updateCategory>[1];
      groupId: string;
    }) => updateCategory(categoryId, updates),
    onSuccess: (data, variables) => {
      // カテゴリ一覧を更新
      queryClient.setQueryData<Category[]>(
        queryKeys.categories.list(variables.groupId),
        (old) => {
          if (!old) return old;
          return old.map((cat) => (cat.id === data.id ? data : cat));
        }
      );
    },
  });
}

/**
 * カテゴリを削除
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ categoryId, groupId }: { categoryId: string; groupId: string }) =>
      deleteCategory(categoryId),
    onSuccess: (_, variables) => {
      // カテゴリ一覧を再取得
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.list(variables.groupId) });
    },
  });
}

/**
 * カテゴリの並び順を更新
 */
export function useReorderCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      categoryOrders,
      groupId,
    }: {
      categoryOrders: Array<{ id: string; sortOrder: number }>;
      groupId: string;
    }) => reorderCategories(categoryOrders),
    onSuccess: (_, variables) => {
      // カテゴリ一覧を再取得
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.list(variables.groupId) });
    },
  });
}
