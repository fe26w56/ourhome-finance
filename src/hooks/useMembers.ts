/**
 * メンバー関連のTanStack Queryフック
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMembers, addMember, updateMember, removeMember } from '../services/memberService';
import { GroupMemberWithUser } from '../services/memberService';
import { queryKeys } from '../lib/queryKeys';

/**
 * グループのメンバー一覧を取得
 */
export function useMembers(groupId: string) {
  return useQuery({
    queryKey: queryKeys.members.list(groupId),
    queryFn: () => getMembers(groupId),
    enabled: !!groupId,
  });
}

/**
 * メンバーを追加
 */
export function useAddMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      userId,
      options,
    }: {
      groupId: string;
      userId: string;
      options?: Parameters<typeof addMember>[2];
    }) => addMember(groupId, userId, options),
    onSuccess: (_, variables) => {
      // メンバー一覧を再取得
      queryClient.invalidateQueries({ queryKey: queryKeys.members.list(variables.groupId) });
    },
  });
}

/**
 * メンバーを更新
 */
export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      memberId,
      updates,
      groupId,
    }: {
      memberId: string;
      updates: Parameters<typeof updateMember>[1];
      groupId: string;
    }) => updateMember(memberId, updates),
    onSuccess: (_, variables) => {
      // メンバー一覧を再取得
      queryClient.invalidateQueries({ queryKey: queryKeys.members.list(variables.groupId) });
    },
  });
}

/**
 * メンバーを削除
 */
export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, groupId }: { memberId: string; groupId: string }) =>
      removeMember(memberId),
    onSuccess: (_, variables) => {
      // メンバー一覧を再取得
      queryClient.invalidateQueries({ queryKey: queryKeys.members.list(variables.groupId) });
    },
  });
}
