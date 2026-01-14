/**
 * カテゴリサービス
 * Supabase APIを使用したカテゴリのCRUD操作
 */

import { supabase } from '../lib/supabase';
import { Category } from '../types/database';
import { DEFAULT_CATEGORIES } from '../lib/defaultCategories';

/**
 * グループのカテゴリ一覧を取得
 */
export async function getCategories(groupId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('group_id', groupId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return data.map(mapCategoryFromDB);
}

/**
 * カテゴリを作成
 */
export async function createCategory(
  groupId: string,
  category: {
    name: string;
    icon: string;
    color: string;
    type: 'expense' | 'income' | 'both';
    sortOrder?: number;
  }
): Promise<Category> {
  // sortOrderが指定されていない場合、既存の最大値+1を設定
  if (category.sortOrder === undefined) {
    const existingCategories = await getCategories(groupId);
    const maxSortOrder = existingCategories.reduce(
      (max, c) => Math.max(max, c.sortOrder),
      0
    );
    category.sortOrder = maxSortOrder + 1;
  }

  const { data, error } = await supabase
    .from('categories')
    .insert({
      group_id: groupId,
      name: category.name,
      icon: category.icon,
      color: category.color,
      type: category.type,
      sort_order: category.sortOrder,
      is_default: false,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create category: ${error.message}`);
  }

  return mapCategoryFromDB(data);
}

/**
 * デフォルトカテゴリを一括作成
 */
export async function createDefaultCategories(groupId: string): Promise<Category[]> {
  const categories = DEFAULT_CATEGORIES.map((cat) => ({
    group_id: groupId,
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
    type: cat.type,
    sort_order: cat.sortOrder,
    is_default: true,
    is_active: true,
  }));

  const { data, error } = await supabase
    .from('categories')
    .insert(categories)
    .select();

  if (error) {
    throw new Error(`Failed to create default categories: ${error.message}`);
  }

  return data.map(mapCategoryFromDB);
}

/**
 * カテゴリを更新
 */
export async function updateCategory(
  categoryId: string,
  updates: {
    name?: string;
    icon?: string;
    color?: string;
    type?: 'expense' | 'income' | 'both';
    sortOrder?: number;
  }
): Promise<Category> {
  const updateData: Record<string, unknown> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.icon !== undefined) updateData.icon = updates.icon;
  if (updates.color !== undefined) updateData.color = updates.color;
  if (updates.type !== undefined) updateData.type = updates.type;
  if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder;

  const { data, error } = await supabase
    .from('categories')
    .update(updateData)
    .eq('id', categoryId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update category: ${error.message}`);
  }

  return mapCategoryFromDB(data);
}

/**
 * カテゴリを削除（論理削除）
 */
export async function deleteCategory(categoryId: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .update({ is_active: false })
    .eq('id', categoryId);

  if (error) {
    throw new Error(`Failed to delete category: ${error.message}`);
  }
}

/**
 * カテゴリの並び順を更新
 */
export async function reorderCategories(
  categoryOrders: Array<{ id: string; sortOrder: number }>
): Promise<void> {
  // トランザクション的に処理するため、一括更新
  const updates = categoryOrders.map(({ id, sortOrder }) =>
    supabase
      .from('categories')
      .update({ sort_order: sortOrder })
      .eq('id', id)
  );

  const results = await Promise.all(updates);
  const errors = results.filter((r) => r.error);

  if (errors.length > 0) {
    throw new Error(
      `Failed to reorder categories: ${errors.map((e) => e.error?.message).join(', ')}`
    );
  }
}

/**
 * データベースのスネークケース形式をキャメルケースに変換
 */
function mapCategoryFromDB(data: Record<string, unknown>): Category {
  return {
    id: data.id as string,
    groupId: data.group_id as string,
    name: data.name as string,
    icon: data.icon as string,
    color: data.color as string,
    type: data.type as 'expense' | 'income' | 'both',
    sortOrder: data.sort_order as number,
    isDefault: data.is_default as boolean,
    isActive: data.is_active as boolean,
    createdAt: data.created_at as string,
  };
}
