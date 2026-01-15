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
        // #region agent log
        const preCallbackStore = { user: useAppStore.getState(), authUser: useAuthStore.getState().user?.id, authSession: useAuthStore.getState().session?.user?.id };
        const preCallbackLocalStorage = Object.keys(localStorage).filter(k => k.includes('sb-') || k.includes('supabase')).map(k => ({key: k, length: localStorage.getItem(k)?.length}));
        fetch('http://127.0.0.1:7242/ingest/a6e9385b-8e06-4366-a440-e52a9ac06ff6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthCallback.tsx:29',message:'[B,D] Callback開始前',data:{preCallbackStore,preCallbackLocalStorage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,D'})}).catch(()=>{});
        // #endregion
        
        // HashRouter使用時の二重ハッシュ問題に対処
        // URLが #/auth/callback#access_token=... となるため、手動でトークンを抽出
        const hashParts = window.location.hash.split('#');
        let tokenParams: URLSearchParams | null = null;
        
        // 2番目以降のハッシュ部分からトークンパラメータを抽出
        if (hashParts.length > 2) {
          tokenParams = new URLSearchParams(hashParts.slice(2).join('#'));
        }

        // #region agent log
        const hasAccessToken = tokenParams?.has('access_token') || false;
        const hasRefreshToken = tokenParams?.has('refresh_token') || false;
        fetch('http://127.0.0.1:7242/ingest/a6e9385b-8e06-4366-a440-e52a9ac06ff6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthCallback.tsx:44',message:'[F] トークンパラメータ抽出',data:{hasAccessToken,hasRefreshToken,hashParts:hashParts.length,urlHash:window.location.hash},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion

        // トークンパラメータがある場合、Supabaseにセッションを設定させる
        if (tokenParams?.has('access_token') && tokenParams?.has('refresh_token')) {
          const accessToken = tokenParams.get('access_token')!;
          const refreshToken = tokenParams.get('refresh_token')!;
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/a6e9385b-8e06-4366-a440-e52a9ac06ff6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthCallback.tsx:55',message:'[F] setSession呼び出し前',data:{hasTokens:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
          // #endregion

          // トークンからセッションを設定
          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          // #region agent log
          const preSetSessionAppStore = useAppStore.getState();
          fetch('http://127.0.0.1:7242/ingest/a6e9385b-8e06-4366-a440-e52a9ac06ff6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthCallback.tsx:65',message:'[F,H] setSession呼び出し後',data:{success:!!data.session,userId:data.session?.user?.id,error:setSessionError?.message,preGroupId:preSetSessionAppStore.currentGroupId,preGroupName:preSetSessionAppStore.currentGroup?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F,H'})}).catch(()=>{});
          // #endregion

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
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/a6e9385b-8e06-4366-a440-e52a9ac06ff6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthCallback.tsx:82',message:'[H] OAuth後に古いグループ情報をクリア',data:{oldGroupId:currentAppStore.currentGroupId,oldGroupName:currentAppStore.currentGroup?.name,newUserId:user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
            // #endregion
            
            // グループ情報をクリア
            useAppStore.getState().reset();
            
            // ローカルストレージからも削除
            localStorage.removeItem('ourhome-app-store');

            // #region agent log
            const postClearAppStore = useAppStore.getState();
            fetch('http://127.0.0.1:7242/ingest/a6e9385b-8e06-4366-a440-e52a9ac06ff6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthCallback.tsx:94',message:'[H] クリア後のAppStore',data:{postGroupId:postClearAppStore.currentGroupId,postGroupName:postClearAppStore.currentGroup?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
            // #endregion
          }

          // usersテーブルへのINSERTはデータベーストリガー（handle_new_user）が自動実行
          // フロントエンドからのINSERTは不要（RLSエラーを回避）
          console.log('AuthCallback: User authenticated, trigger will handle user creation');

          // #region agent log
          const preWaitStore = { authUser: useAuthStore.getState().user?.id, authSession: useAuthStore.getState().session?.user?.id };
          fetch('http://127.0.0.1:7242/ingest/a6e9385b-8e06-4366-a440-e52a9ac06ff6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthCallback.tsx:83',message:'[E] 1秒待機前',data:{authenticatedUserId:user.id,preWaitStore},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion

          // ユーザー情報の設定はonAuthStateChange（useAuth.loadUser）に委譲
          // トリガーがユーザーを作成するのを待つため、少し待機
          await new Promise(resolve => setTimeout(resolve, 1000));

          // #region agent log
          const postWaitStore = { authUser: useAuthStore.getState().user?.id, authSession: useAuthStore.getState().session?.user?.id };
          fetch('http://127.0.0.1:7242/ingest/a6e9385b-8e06-4366-a440-e52a9ac06ff6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthCallback.tsx:93',message:'[E] 1秒待機後',data:{authenticatedUserId:user.id,postWaitStore},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion

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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/a6e9385b-8e06-4366-a440-e52a9ac06ff6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthCallback.tsx:78',message:'[F] catchブロック実行',data:{errorMessage:error?.message,errorStack:error?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
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
