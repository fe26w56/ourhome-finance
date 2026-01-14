/**
 * グループサービス
 * Supabase APIを使用したグループのCRUD操作
 */

import { supabase } from '../lib/supabase';
import { Group, GroupMember } from '../types/database';
import { createDefaultCategories } from './categoryService';

/**
 * ユーザーが所属するグループ一覧を取得
 */
export async function getGroups(userId: string): Promise<Group[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('groups(*)')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to fetch groups: ${error.message}`);
  }

  return (data || []).map((item: { groups: Record<string, unknown> }) =>
    mapGroupFromDB(item.groups)
  );
}

/**
 * グループを作成
 * 作成者をownerとしてgroup_membersに追加し、デフォルトカテゴリも作成
 */
export async function createGroup(
  userId: string,
  groupData: {
    name: string;
    currency?: string;
    monthStartDay?: number;
  }
): Promise<{ group: Group; member: GroupMember }> {
  // 1. グループを作成
  const { data: groupDataResult, error: groupError } = await supabase
    .from('groups')
    .insert({
      name: groupData.name,
      currency: groupData.currency || 'JPY',
      month_start_day: groupData.monthStartDay || 1,
      created_by: userId,
    })
    .select()
    .single();

  if (groupError) {
    throw new Error(`Failed to create group: ${groupError.message}`);
  }

  const group = mapGroupFromDB(groupDataResult);

  // 2. 作成者をownerとしてgroup_membersに追加
  const { data: memberData, error: memberError } = await supabase
    .from('group_members')
    .insert({
      group_id: group.id,
      user_id: userId,
      role: 'owner',
    })
    .select()
    .single();

  if (memberError) {
    // グループ作成に失敗した場合、ロールバックはSupabaseのトランザクションで処理
    throw new Error(`Failed to add group member: ${memberError.message}`);
  }

  const member = mapGroupMemberFromDB(memberData);

  // 3. デフォルトカテゴリを作成
  try {
    await createDefaultCategories(group.id);
  } catch (error) {
    // カテゴリ作成に失敗してもグループ作成は成功とする
    console.error('Failed to create default categories:', error);
  }

  return { group, member };
}

/**
 * グループを取得（メンバー情報を含む）
 */
export async function getGroup(groupId: string): Promise<Group & { members: GroupMember[] }> {
  const { data, error } = await supabase
    .from('groups')
    .select('*, group_members(*)')
    .eq('id', groupId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch group: ${error.message}`);
  }

  const group = mapGroupFromDB(data);
  const groupMembers = (data as any).group_members || [];
  const members = Array.isArray(groupMembers)
    ? groupMembers.map(mapGroupMemberFromDB)
    : [mapGroupMemberFromDB(groupMembers)];

  return { ...group, members };
}

/**
 * グループを更新
 */
export async function updateGroup(
  groupId: string,
  updates: {
    name?: string;
    currency?: string;
    monthStartDay?: number;
    carryOverBalance?: boolean;
    budgetCarryOver?: boolean;
  }
): Promise<Group> {
  const updateData: Record<string, unknown> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.currency !== undefined) updateData.currency = updates.currency;
  if (updates.monthStartDay !== undefined)
    updateData.month_start_day = updates.monthStartDay;
  if (updates.carryOverBalance !== undefined)
    updateData.carry_over_balance = updates.carryOverBalance;
  if (updates.budgetCarryOver !== undefined)
    updateData.budget_carry_over = updates.budgetCarryOver;

  const { data, error } = await supabase
    .from('groups')
    .update(updateData)
    .eq('id', groupId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update group: ${error.message}`);
  }

  return mapGroupFromDB(data);
}

/**
 * 招待コードを再生成
 */
export async function regenerateInviteCode(groupId: string): Promise<string> {
  const { data, error } = await supabase.rpc('regenerate_invite_code', {
    p_group_id: groupId,
  });

  if (error) {
    throw new Error(`Failed to regenerate invite code: ${error.message}`);
  }

  return data as string;
}

/**
 * 招待コードでグループに参加
 */
export async function joinGroup(
  userId: string,
  inviteCode: string
): Promise<{ group: Group; member: GroupMember }> {
  // 1. 招待コードでグループを検索
  const { data: groupData, error: groupError } = await supabase
    .from('groups')
    .select('*')
    .eq('invite_code', inviteCode)
    .single();

  if (groupError || !groupData) {
    throw new Error('Invalid invite code');
  }

  const group = mapGroupFromDB(groupData);

  // 2. 既にメンバーかチェック
  const { data: existingMember } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', group.id)
    .eq('user_id', userId)
    .single();

  if (existingMember) {
    return { group, member: mapGroupMemberFromDB(existingMember) };
  }

  // 3. メンバーとして追加（デフォルトはmemberロール）
  const { data: memberData, error: memberError } = await supabase
    .from('group_members')
    .insert({
      group_id: group.id,
      user_id: userId,
      role: 'member',
    })
    .select()
    .single();

  if (memberError) {
    throw new Error(`Failed to join group: ${memberError.message}`);
  }

  const member = mapGroupMemberFromDB(memberData);

  return { group, member };
}

/**
 * グループから退会
 * オーナーの場合は、他にメンバーがいれば退会不可（オーナー権限を移譲する必要あり）
 */
export async function leaveGroup(
  userId: string,
  groupId: string
): Promise<void> {
  // 1. メンバー情報を取得
  const { data: memberData, error: memberError } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single();

  if (memberError || !memberData) {
    throw new Error('You are not a member of this group');
  }

  const member = mapGroupMemberFromDB(memberData);

  // 2. オーナーの場合、他のメンバーがいるか確認
  if (member.role === 'owner') {
    const { data: allMembers, error: allMembersError } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId);

    if (allMembersError) {
      throw new Error(`Failed to check members: ${allMembersError.message}`);
    }

    if (allMembers && allMembers.length > 1) {
      throw new Error('オーナーは他のメンバーがいる間は退会できません。先にオーナー権限を他のメンバーに移譲してください。');
    }

    // オーナーが最後のメンバーの場合、グループも削除
    const { error: deleteGroupError } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId);

    if (deleteGroupError) {
      throw new Error(`Failed to delete group: ${deleteGroupError.message}`);
    }

    return;
  }

  // 3. メンバーを削除
  const { error: deleteError } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (deleteError) {
    throw new Error(`Failed to leave group: ${deleteError.message}`);
  }
}

/**
 * データベースのスネークケース形式をキャメルケースに変換
 */
function mapGroupFromDB(data: Record<string, unknown>): Group {
  return {
    id: data.id as string,
    name: data.name as string,
    currency: data.currency as string,
    monthStartDay: data.month_start_day as number,
    inviteCode: data.invite_code as string | null,
    carryOverBalance: (data.carry_over_balance as boolean) ?? true,
    budgetCarryOver: (data.budget_carry_over as boolean) ?? false,
    createdBy: data.created_by as string,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

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
