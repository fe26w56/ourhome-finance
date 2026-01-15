/**
 * 保護ルートコンポーネント
 * 
 * 認証状態とグループ所属状態をチェックし、適切にリダイレクトします。
 * - 未認証 → ログイン画面へ
 * - 認証済み＋グループなし → オンボーディング画面へ（requireGroup=trueの場合）
 * - 認証済み＋グループあり → 子コンポーネントを表示
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useAppStore } from '../stores/useAppStore';
import { supabase } from '../lib/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** グループ所属が必須かどうか（デフォルト: true） */
  requireGroup?: boolean;
}

export function ProtectedRoute({ children, requireGroup = true }: ProtectedRouteProps) {
  const location = useLocation();
  const { session, user, isLoading: authLoading } = useAuthStore();
  const { currentGroupId, setCurrentGroup } = useAppStore();
  
  // グループ確認の状態
  const [isCheckingGroup, setIsCheckingGroup] = useState(true);
  const [hasGroup, setHasGroup] = useState(false);

  // セッションまたはユーザーがある場合、グループを確認
  useEffect(() => {
    const checkGroup = async () => {
      // 認証ローディング中、またはユーザー情報がない場合はスキップ
      if (authLoading || !user) {
        setIsCheckingGroup(false);
        return;
      }

      // グループが不要な場合はスキップ
      if (!requireGroup) {
        setIsCheckingGroup(false);
        setHasGroup(true);
        return;
      }

      // 既にグループが選択されている場合
      if (currentGroupId) {
        // ただし、選択されているグループが現在のユーザーに属していない場合はクリア
        // （別のアカウントでログインした際に古いグループ情報が残っている場合の対策）
        try {
          const { data: membership, error: membershipError } = await supabase
            .from('group_members')
            .select('*')
            .eq('group_id', currentGroupId)
            .eq('user_id', user.id)
            .single();

          if (membershipError || !membership) {
            // 現在のユーザーがこのグループに所属していない場合、グループ情報をクリア
            console.log('ProtectedRoute: Clearing old group info (user not a member)');
            useAppStore.getState().reset();
            localStorage.removeItem('ourhome-app-store');
            // グループがないとして次の処理へ
          } else {
            // ユーザーがこのグループに所属している場合、そのまま使用
            setIsCheckingGroup(false);
            setHasGroup(true);
            return;
          }
        } catch (error) {
          console.error('Error checking group membership:', error);
          // エラーの場合もクリアして安全側に倒す
          useAppStore.getState().reset();
          localStorage.removeItem('ourhome-app-store');
        }
      }

      try {
        // データベースからグループを確認
        const { data: groupMembersData, error } = await supabase
          .from('group_members')
          .select('groups(*)')
          .eq('user_id', user.id);

        if (error) {
          console.error('Failed to check groups:', error);
          setIsCheckingGroup(false);
          setHasGroup(false);
          return;
        }

        const groups = groupMembersData?.map((item: any) => item.groups).filter(Boolean) || [];
        
        if (groups.length > 0) {
          // グループがある場合、最初のグループを選択
          setCurrentGroup(groups[0].id, groups[0]);
          setHasGroup(true);
        } else {
          setHasGroup(false);
        }
      } catch (error) {
        console.error('Error checking groups:', error);
        setHasGroup(false);
      } finally {
        setIsCheckingGroup(false);
      }
    };

    checkGroup();
  }, [user, authLoading, requireGroup, currentGroupId, setCurrentGroup]);

  // ローディング中
  if (authLoading || isCheckingGroup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-[#73F590] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  // 未認証 → ログインへ
  // メール確認が有効な場合、sessionがnullでもuserが設定されている可能性がある
  if (!session && !user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // グループが必要だが所属していない → オンボーディングへ
  if (requireGroup && !hasGroup) {
    return <Navigate to="/onboarding/group-setup" replace />;
  }

  return <>{children}</>;
}
