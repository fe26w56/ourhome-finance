/**
 * メンバーサービス
 * Supabase APIを使用したグループメンバーのCRUD操作
 */

import { supabase } from '../lib/supabase';
import { GroupMember, User } from '../types/database';

export interface GroupMemberWithUser extends GroupMember {
  user: User;
}

/**
 * グループのメンバー一覧を取得（ユーザー情報を含む）
 */
export async function getMembers(groupId: string): Promise<GroupMemberWithUser[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('*, users(*)')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch members: ${error.message}`);
  }

  return (data || []).map((item: Record<string, unknown>) => ({
    ...mapGroupMemberFromDB(item),
    user: mapUserFromDB(item.users as Record<string, unknown>),
  }));
}

/**
 * メンバーを追加
 */
export async function addMember(
  groupId: string,
  userId: string,
  options?: {
    role?: 'member' | 'viewer';
    nickname?: string;
    color?: string;
  }
): Promise<GroupMember> {
  const { data, error } = await supabase
    .from('group_members')
    .insert({
      group_id: groupId,
      user_id: userId,
      role: options?.role || 'member',
      nickname: options?.nickname || null,
      color: options?.color || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add member: ${error.message}`);
  }

  return mapGroupMemberFromDB(data);
}

/**
 * メンバーを更新（権限変更等）
 */
export async function updateMember(
  memberId: string,
  updates: {
    role?: 'admin' | 'member' | 'viewer';
    nickname?: string;
    color?: string;
  }
): Promise<GroupMember> {
  const updateData: Record<string, unknown> = {};
  if (updates.role !== undefined) updateData.role = updates.role;
  if (updates.nickname !== undefined) updateData.nickname = updates.nickname;
  if (updates.color !== undefined) updateData.color = updates.color;

  const { data, error } = await supabase
    .from('group_members')
    .update(updateData)
    .eq('id', memberId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update member: ${error.message}`);
  }

  return mapGroupMemberFromDB(data);
}

/**
 * メンバーを削除（退会）
 */
export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase.from('group_members').delete().eq('id', memberId);

  if (error) {
    throw new Error(`Failed to remove member: ${error.message}`);
  }
}

/**
 * データベースのスネークケース形式をキャメルケースに変換
 */
function mapGroupMemberFromDB(data: Record<string, unknown>): GroupMember {
  return {
    id: data.id as string,
    groupId: data.group_id as string,
    userId: data.user_id as string,
    role: data.role as 'owner' | 'admin' | 'member' | 'viewer',
    nickname: data.nickname as string | null,
    color: data.color as string | null,
    joinedAt: data.joined_at as string,
  };
}

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
