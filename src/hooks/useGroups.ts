/**
 * グループ関連のTanStack Queryフック
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getGroups,
  createGroup,
  getGroup,
  updateGroup,
  regenerateInviteCode,
  joinGroup,
  leaveGroup,
} from '../services/groupService';
import { Group, GroupMember } from '../types/database';
import { queryKeys } from '../lib/queryKeys';
import { useAuthStore } from '../stores/useAuthStore';

/**
 * ユーザーが所属するグループ一覧を取得
 */
export function useGroups() {
  const { user, session } = useAuthStore();

  // user（DBから取得）またはsession.user（Supabase Auth）のIDを使用
  const userId = user?.id || session?.user?.id;

  return useQuery({
    queryKey: queryKeys.groups.list(userId || ''),
    queryFn: () => {
      // queryFn内で最新の状態を取得
      const { user: currentUser, session: currentSession } = useAuthStore.getState();
      const currentUserId = currentUser?.id || currentSession?.user?.id;
      return getGroups(currentUserId || '');
    },
    enabled: !!userId,
  });
}

/**
 * グループを作成
 */
export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupData: Parameters<typeof createGroup>[1]) => {
      // mutationFn内で最新の状態を取得
      const { user, session } = useAuthStore.getState();
      const userId = user?.id || session?.user?.id;
      
      if (!userId) throw new Error('User not authenticated');
      return createGroup(userId, groupData);
    },
    onSuccess: (data) => {
      // 最新のuserIdを取得してキャッシュを無効化
      const { user, session } = useAuthStore.getState();
      const userId = user?.id || session?.user?.id;
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.list(userId || '') });
      // 作成したグループの詳細をキャッシュに追加
      queryClient.setQueryData(queryKeys.groups.detail(data.group.id), data.group);
    },
  });
}

/**
 * グループ詳細を取得
 */
export function useGroup(groupId: string) {
  return useQuery({
    queryKey: queryKeys.groups.detail(groupId),
    queryFn: () => getGroup(groupId),
    enabled: !!groupId,
  });
}

/**
 * グループを更新
 */
export function useUpdateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, updates }: { groupId: string; updates: Parameters<typeof updateGroup>[1] }) =>
      updateGroup(groupId, updates),
    onSuccess: (data, variables) => {
      // グループ詳細を更新
      queryClient.setQueryData(queryKeys.groups.detail(variables.groupId), data);
      // グループ一覧も更新
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.list('') });
    },
  });
}

/**
 * 招待コードを再生成
 */
export function useRegenerateInviteCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => regenerateInviteCode(groupId),
    onSuccess: (_, groupId) => {
      // グループ詳細を再取得
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(groupId) });
    },
  });
}

/**
 * グループに参加
 */
export function useJoinGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteCode: string) => {
      // mutationFn内で最新の状態を取得（クロージャの古い値を参照しないため）
      const { user, session } = useAuthStore.getState();
      const userId = user?.id || session?.user?.id;
      
      if (!userId) throw new Error('User not authenticated');
      return joinGroup(userId, inviteCode);
    },
    onSuccess: () => {
      // 最新のuserIdを取得してキャッシュを無効化
      const { user, session } = useAuthStore.getState();
      const userId = user?.id || session?.user?.id;
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.list(userId || '') });
    },
  });
}

/**
 * グループから退会
 */
export function useLeaveGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => {
      // mutationFn内で最新の状態を取得
      const { user, session } = useAuthStore.getState();
      const userId = user?.id || session?.user?.id;
      
      if (!userId) throw new Error('User not authenticated');
      return leaveGroup(userId, groupId);
    },
    onSuccess: () => {
      // 最新のuserIdを取得してキャッシュを無効化
      const { user, session } = useAuthStore.getState();
      const userId = user?.id || session?.user?.id;
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.list(userId || '') });
    },
  });
}
