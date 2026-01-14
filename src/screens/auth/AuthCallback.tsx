/**
 * OAuth認証コールバック画面
 * Google/Apple認証後にリダイレクトされる画面
 * 
 * 処理フロー:
 * 1. セッションを取得
 * 2. usersテーブルにユーザーレコードがなければ作成
 * 3. ホーム画面へリダイレクト（グループチェックはProtectedRouteが担当）
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../stores/useAppStore';
import { useAuthStore } from '../../stores/useAuthStore';
import type { User } from '../../types/database';

export function AuthCallback() {
  const navigate = useNavigate();
  const { showToast } = useAppStore();
  const { setUser } = useAuthStore();
  const hasHandledCallback = useRef(false);

  useEffect(() => {
    // 既に処理済みの場合はスキップ
    if (hasHandledCallback.current) {
      return;
    }
    hasHandledCallback.current = true;

    const handleAuthCallback = async () => {
      try {
        // URLからセッションを取得
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error('認証に失敗しました');
        }

        if (!session?.user) {
          throw new Error('認証に失敗しました');
        }

        const user = session.user;

        // usersテーブルにユーザーが存在するか確認
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        // ユーザーが存在しない場合は作成
        let userData: User;
        if (!existingUser || checkError?.code === 'PGRST116') {
          const displayName = user.user_metadata?.full_name || 
                            user.user_metadata?.name || 
                            user.email?.split('@')[0] || 
                            'ユーザー';

          const newUserData = {
            id: user.id,
            email: user.email!,
            display_name: displayName,
            avatar_url: user.user_metadata?.avatar_url || null,
          };

          const { error: insertError } = await supabase
            .from('users')
            .insert(newUserData)
            .select();

          if (insertError) {
            console.error('Failed to create user record:', insertError);
            throw new Error('ユーザー情報の作成に失敗しました');
          }

          // 作成したユーザー情報をストアに設定
          userData = {
            id: newUserData.id,
            email: newUserData.email,
            displayName: newUserData.display_name,
            avatarUrl: newUserData.avatar_url,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        } else {
          // 既存ユーザー情報をストアに設定
          userData = {
            id: existingUser.id,
            email: existingUser.email,
            displayName: existingUser.display_name,
            avatarUrl: existingUser.avatar_url,
            createdAt: existingUser.created_at,
            updatedAt: existingUser.updated_at,
          };
        }

        // ユーザー情報をストアに設定
        setUser(userData);

        // ホーム画面へリダイレクト
        // グループの存在チェックとオンボーディングへのリダイレクトはProtectedRouteが担当
        showToast('ログインしました', 'success');
        navigate('/');
      } catch (error: any) {
        console.error('Auth callback error:', error);
        showToast('認証処理でエラーが発生しました', 'error');
        navigate('/auth/login');
      }
    };

    handleAuthCallback();
  }, [navigate, showToast, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="text-center max-w-md w-full">
        <div className="inline-block w-12 h-12 border-4 border-[#73F590] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 text-lg font-medium">認証中...</p>
        <p className="text-gray-400 text-sm mt-2">少々お待ちください</p>
      </div>
    </div>
  );
}
