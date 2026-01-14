/**
 * ユーザーサービス
 * Supabase APIを使用したユーザーのCRUD操作
 */

import { supabase } from '../lib/supabase';
import { User } from '../types/database';

/**
 * ユーザー情報を取得
 */
export async function getUser(userId: string): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch user: ${error.message}`);
  }

  return mapUserFromDB(data);
}

/**
 * ユーザー情報を更新
 */
export async function updateUser(
  userId: string,
  updates: {
    displayName?: string;
    avatarUrl?: string;
  }
): Promise<User> {
  const updateData: Record<string, unknown> = {};
  if (updates.displayName !== undefined) updateData.display_name = updates.displayName;
  if (updates.avatarUrl !== undefined) updateData.avatar_url = updates.avatarUrl;

  const { data, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update user: ${error.message}`);
  }

  return mapUserFromDB(data);
}

/**
 * データベースのスネークケース形式をキャメルケースに変換
 */
function mapUserFromDB(data: Record<string, unknown>): User {
  return {
    id: data.id as string,
    email: data.email as string,
    displayName: data.display_name as string,
    avatarUrl: data.avatar_url as string | null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}
