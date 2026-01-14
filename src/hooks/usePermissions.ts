/**
 * 権限チェックフック
 * ユーザーの権限に基づいて操作の可否を判定
 */

import { useMemo } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useMembers } from './useMembers';
import { MemberRole } from '../types/database';

interface Permissions {
  // 取引
  canViewTransactions: boolean;
  canCreateTransaction: boolean;
  canEditTransaction: (createdBy: string) => boolean;
  canDeleteTransaction: (createdBy: string) => boolean;

  // 予算
  canEditBudget: boolean;

  // メンバー管理
  canManageMembers: boolean;

  // カテゴリ
  canManageCategories: boolean;
}

/**
 * グループ内での権限を取得
 */
export function usePermissions(groupId: string): Permissions {
  const { user } = useAuthStore();
  const { data: members } = useMembers(groupId);

  const currentMember = useMemo(() => {
    if (!user || !members) return null;
    return members.find((m) => m.userId === user.id);
  }, [user, members]);

  const role = currentMember?.role || 'viewer';

  return useMemo(() => {
    const isOwner = role === 'owner';
    const isAdmin = role === 'admin' || isOwner;
    const isMember = role === 'member' || isAdmin;
    const isViewer = role === 'viewer' || isMember;

    return {
      // 取引
      canViewTransactions: isViewer,
      canCreateTransaction: isMember,
      canEditTransaction: (createdBy: string) => {
        if (isAdmin) return true; // admin/ownerは全員の取引を編集可能
        return createdBy === user?.id; // memberは自分の取引のみ編集可能
      },
      canDeleteTransaction: (createdBy: string) => {
        if (isAdmin) return true; // admin/ownerは全員の取引を削除可能
        return createdBy === user?.id; // memberは自分の取引のみ削除可能
      },

      // 予算
      canEditBudget: isAdmin,

      // メンバー管理
      canManageMembers: isOwner,

      // カテゴリ
      canManageCategories: isAdmin,
    };
  }, [role, user?.id]);
}
