/**
 * OAuth認証コールバック画面
 * Google/Apple認証後にリダイレクトされる画面
 *
 * 処理フロー（修正版 - トリガーベース）:
 * 1. セッションを取得
 * 2. usersテーブルへのINSERTはデータベーストリガー（handle_new_user）に任せる
 * 3. ユーザー情報の設定はonAuthStateChangeに委譲（useAuthが一元管理）
 * 4. ホーム画面へリダイレクト（グループチェックはProtectedRouteが担当）
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../stores/useAppStore';
import { useAuthStore } from '../../stores/useAuthStore';

export function AuthCallback() {
  const navigate = useNavigate();
  const { showToast } = useAppStore();
  const hasHandledCallback = useRef(false);

  useEffect(() => {
    // 既に処理済みの場合はスキップ
    if (hasHandledCallback.current) {
      return;
    }
    hasHandledCallback.current = true;

    const handleAuthCallback = async () => {
      try {
        // HashRouter使用時の二重ハッシュ問題に対処
        // URLが #/auth/callback#access_token=... となるため、手動でトークンを抽出
        const hashParts = window.location.hash.split('#');
        let tokenParams: URLSearchParams | null = null;

        // 2番目以降のハッシュ部分からトークンパラメータを抽出
        if (hashParts.length > 2) {
          tokenParams = new URLSearchParams(hashParts.slice(2).join('#'));
        }

        // トークンパラメータがある場合、Supabaseにセッションを設定させる
        if (tokenParams?.has('access_token') && tokenParams?.has('refresh_token')) {
          const accessToken = tokenParams.get('access_token')!;
          const refreshToken = tokenParams.get('refresh_token')!;

          // トークンからセッションを設定
          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (setSessionError) {
            throw new Error('セッションの設定に失敗しました');
          }

          if (!data.session?.user) {
            throw new Error('認証に失敗しました');
          }

          const user = data.session.user;

          // persistミドルウェアがローカルストレージから古いグループ情報を復元している可能性があるため、
          // 新しいユーザーでログインした際は、グループ情報を強制的にクリアする
          const currentAppStore = useAppStore.getState();
          if (currentAppStore.currentGroupId) {
            // グループ情報をクリア
            useAppStore.getState().reset();

            // ローカルストレージからも削除
            localStorage.removeItem('ourhome-app-store');
          }

          // usersテーブルへのINSERTはデータベーストリガー（handle_new_user）が自動実行
          // フロントエンドからのINSERTは不要（RLSエラーを回避）
          console.log('AuthCallback: User authenticated, trigger will handle user creation');

          // ユーザー情報の設定はonAuthStateChange（useAuth.loadUser）に委譲
          // トリガーがユーザーを作成するのを待つため、少し待機
          await new Promise(resolve => setTimeout(resolve, 1000));

          // ホーム画面へリダイレクト
          // グループの存在チェックとオンボーディングへのリダイレクトはProtectedRouteが担当
          // useAuth.loadUserがユーザー情報を設定するため、ProtectedRouteで正しく認証状態を判定できる
          showToast('ログインしました', 'success');
          navigate('/');
        } else {
          // トークンパラメータがない場合、通常のgetSessionフォールバック
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();

          if (sessionError || !session?.user) {
            throw new Error('認証に失敗しました');
          }

          const user = session.user;
          console.log('AuthCallback: User authenticated via getSession');

          await new Promise(resolve => setTimeout(resolve, 1000));
          showToast('ログインしました', 'success');
          navigate('/');
        }
      } catch (error: any) {
        console.error('Auth callback error:', error);
        showToast('認証処理でエラーが発生しました', 'error');
        navigate('/auth/login');
      }
    };

    handleAuthCallback();
  }, [navigate, showToast]);

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
