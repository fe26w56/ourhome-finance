/**
 * 認証フック
 */

import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import { useAppStore } from '../stores/useAppStore';
import type { User } from '../types/database';
import type { AuthError } from '@supabase/supabase-js';

/**
 * 認証フック
 */
export function useAuth() {
  const { user, session, isLoading, isAuthenticated, setUser, setSession, setLoading, signOut } =
    useAuthStore();

  // セッション監視
  useEffect(() => {
    // 初期セッション取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadUser(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 認証状態変更の監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // #region agent log
      const currentStore = { user: useAuthStore.getState().user?.id, session: useAuthStore.getState().session?.user?.id };
      fetch('http://127.0.0.1:7242/ingest/a6e9385b-8e06-4366-a440-e52a9ac06ff6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useAuth.ts:33',message:'[C] onAuthStateChange発火',data:{event,newSessionUserId:session?.user?.id,newSessionEmail:session?.user?.email,currentStore},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      setSession(session);
      if (session?.user) {
        await loadUser(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setSession, setLoading]);

  /**
   * ユーザー情報を読み込む（再試行ロジック付き）
   * 
   * 設計方針:
   * - onAuthStateChangeを信頼する設計として、ユーザーが見つからない場合は再試行する
   * - OAuth認証の場合、AuthCallbackでユーザーが作成される可能性があるため、再試行で対応
   * - 手動登録の場合も、データベースへの反映遅延に対応するため再試行
   */
  const loadUser = async (userId: string, retryCount = 0) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1000; // 1秒（指数バックオフのベース）
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a6e9385b-8e06-4366-a440-e52a9ac06ff6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useAuth.ts:56',message:'[C] loadUser開始',data:{userId,retryCount},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    try {
      // タイムアウト付きクエリ（5秒）
      const queryPromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout after 5s')), 5000)
      );
      
      let data = null;
      let error = null;
      
      try {
        const result = await Promise.race([queryPromise, timeoutPromise]);
        data = result.data;
        error = result.error;
      } catch (e) {
        console.error('User query timeout or error:', e);
        setLoading(false);
        return;
      }

      if (error && error.code !== 'PGRST116') {
        // PGRST116以外のエラーは再試行しない
        console.error('Failed to load user:', error);
        setLoading(false);
        return;
      }

      if (!data || error?.code === 'PGRST116') {
        // ユーザーが見つからない場合、再試行
        if (retryCount < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * Math.pow(2, retryCount); // 指数バックオフ
          console.log(`User not found (${error?.code || 'no data'}), retrying... (${retryCount + 1}/${MAX_RETRIES}) after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return loadUser(userId, retryCount + 1);
        }
        
        // 最大再試行回数を超えた場合
        console.warn(`User not found after ${MAX_RETRIES} retries. User ID: ${userId}`);
        console.warn('This may be normal for OAuth first-time login - AuthCallback will handle user creation.');
        setLoading(false);
        return;
      }

      // データベースのスネークケースをキャメルケースに変換
      const user: User = {
        id: data.id,
        email: data.email,
        displayName: data.display_name,
        avatarUrl: data.avatar_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a6e9385b-8e06-4366-a440-e52a9ac06ff6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useAuth.ts:118',message:'[C] loadUser完了',data:{userId:user.id,userEmail:user.email,retryCount},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      setUser(user);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load user:', error);
      setLoading(false);
    }
  };

  /**
   * メール・パスワードで新規登録
   * 
   * 設計方針（修正版）:
   * - usersテーブルへのINSERTはデータベーストリガー（handle_new_user）に任せる
   * - フロントエンドはauth.signUp()のみを実行
   * - ユーザー情報はonAuthStateChange → loadUserで取得
   */
  const signUp = async (
    email: string,
    password: string,
    displayName: string
  ): Promise<{ error: AuthError | null }> => {
    try {
      console.log('signUp: Starting signup process...', { email, displayName });

      const currentSession = await supabase.auth.getSession();

      // 【修正】古いセッションが残っている場合は削除
      // 新規登録時に古いセッション情報が干渉するのを防ぐ
      if (currentSession.data.session) {
        console.log('signUp: Clearing old session before signup');
        await supabase.auth.signOut();
        // ストアもクリア
        setUser(null);
        setSession(null);
        
        // ローカルストレージも明示的にクリア（Supabase側のキャッシュ削除）
        localStorage.removeItem(`sb-${import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`);
        
        // クリア後、少し待機（Supabaseクライアントの状態更新を待つ）
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      if (error) {
        console.error('signUp: Auth signup failed:', error);
        
        // ユーザーフレンドリーなエラーメッセージ
        if (error.message?.includes('Email signups are disabled')) {
          console.error('⚠️ Supabase設定エラー: メール認証が無効になっています');
          console.error('修正方法: Supabase Dashboard → Authentication → Providers → Email → "Enable sign ups" をONにしてください');
        }
        
        return { error };
      }

      // データが存在しない場合もチェック
      if (!data.user) {
        console.error('signUp: No user data returned');
        return { error: { message: 'ユーザーデータが返されませんでした' } as AuthError };
      }

      console.log('signUp: Auth signup successful, user ID:', data.user.id);

      // メール確認が有効な場合、セッションは確立されないが、ユーザーは作成されている
      // このケースに対応するため、ストアに仮のユーザー情報を設定する
      if (!data.session && data.user) {
        console.log('signUp: No session (email confirmation required), but user created');
        console.log('signUp: Setting temporary user in store');
        
        // loadUserを呼び出してpublic.usersからユーザー情報を取得
        // トリガーがユーザーを作成するまで少し待つ
        await new Promise(resolve => setTimeout(resolve, 500));
        await loadUser(data.user.id);
      }

      // usersテーブルへのINSERTはデータベーストリガー（handle_new_user）が自動実行
      // onAuthStateChangeがloadUserを呼び出し、ユーザー情報を取得する

      return { error: null };
    } catch (error) {
      console.error('signUp: Unexpected error:', error);
      return { error: error as AuthError };
    }
  };

  /**
   * メール・パスワードでログイン
   */
  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: AuthError | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  /**
   * OAuthでログイン（Google/Apple）
   */
  const signInWithOAuth = async (
    provider: 'google' | 'apple'
  ): Promise<{ error: AuthError | null }> => {
    try {
      // #region agent log
      const preOAuthSession = await supabase.auth.getSession();
      const preOAuthStore = { user: useAuthStore.getState().user, session: useAuthStore.getState().session, isAuthenticated: useAuthStore.getState().isAuthenticated };
      const preOAuthAppStore = { groupId: useAppStore.getState().currentGroupId, groupName: useAppStore.getState().currentGroup?.name };
      const preOAuthLocalStorage = Object.keys(localStorage).filter(k => k.includes('sb-') || k.includes('supabase') || k.includes('ourhome'));
      fetch('http://127.0.0.1:7242/ingest/a6e9385b-8e06-4366-a440-e52a9ac06ff6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useAuth.ts:242',message:'[A,H] OAuth開始前の状態',data:{provider,preOAuthSession:preOAuthSession.data.session?.user?.id,preOAuthStore,preOAuthAppStore,preOAuthLocalStorage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,H'})}).catch(()=>{});
      // #endregion

      // 古いセッションがある場合は、先にクリアしてから新しいOAuthフローを開始
      // これにより、別のアカウントでログインした際に古いグループ情報が残らない
      const currentSession = await supabase.auth.getSession();
      if (currentSession.data.session) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/a6e9385b-8e06-4366-a440-e52a9ac06ff6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useAuth.ts:252',message:'[A,H] OAuth開始前に古いセッションをクリア',data:{oldUserId:currentSession.data.session.user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,H'})}).catch(()=>{});
        // #endregion

        // Supabaseのセッションをクリア
        await supabase.auth.signOut();
        
        // ストアをクリア
        setUser(null);
        setSession(null);
        useAppStore.getState().reset();
        
        // ローカルストレージもクリア
        const keysToRemove = Object.keys(localStorage).filter(
          key => key.includes('sb-') || key.includes('supabase') || key.includes('ourhome-app-store')
        );
        keysToRemove.forEach(key => localStorage.removeItem(key));

        // #region agent log
        const postClearLocalStorage = Object.keys(localStorage).filter(k => k.includes('sb-') || k.includes('supabase') || k.includes('ourhome'));
        fetch('http://127.0.0.1:7242/ingest/a6e9385b-8e06-4366-a440-e52a9ac06ff6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useAuth.ts:269',message:'[A,H] クリア後のLocalStorage',data:{postClearLocalStorage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,H'})}).catch(()=>{});
        // #endregion
        
        // クリア後、少し待機（Supabaseクライアントの状態更新を待つ）
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          // HashRouterを使用している場合、#を含むURLを指定
          redirectTo: `${window.location.origin}/#/auth/callback`,
          // PKCEフローを使用（より安全で、HashRouterとの互換性が高い）
          skipBrowserRedirect: false,
        },
      });

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  /**
   * ログアウト
   */
  const handleSignOut = async (): Promise<{ error: AuthError | null }> => {
    try {
      // #region agent log
      const preSignOutLocalStorage = Object.keys(localStorage).filter(k => k.includes('sb-') || k.includes('supabase'));
      const preSignOutAppStore = useAppStore.getState();
      fetch('http://127.0.0.1:7242/ingest/a6e9385b-8e06-4366-a440-e52a9ac06ff6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useAuth.ts:260',message:'[G,H] サインアウト前',data:{preSignOutLocalStorage,preSignOutGroupId:preSignOutAppStore.currentGroupId,preSignOutGroupName:preSignOutAppStore.currentGroup?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G,H'})}).catch(()=>{});
      // #endregion

      const { error } = await supabase.auth.signOut();
      
      // 認証ストアをクリア
      signOut();
      
      // アプリストア（グループ情報など）もクリア
      useAppStore.getState().reset();
      
      // Supabase関連とアプリストアのローカルストレージを明示的にクリア
      // supabase.auth.signOut()で自動的にクリアされるはずだが、
      // 念のため明示的に削除して、次回のログイン時に古いセッション情報やグループ情報が残らないようにする
      const keysToRemove = Object.keys(localStorage).filter(
        key => key.includes('sb-') || key.includes('supabase') || key.includes('ourhome-app-store')
      );
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // #region agent log
      const postSignOutLocalStorage = Object.keys(localStorage).filter(k => k.includes('sb-') || k.includes('supabase'));
      const postSignOutAppStore = useAppStore.getState();
      fetch('http://127.0.0.1:7242/ingest/a6e9385b-8e06-4366-a440-e52a9ac06ff6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useAuth.ts:283',message:'[G,H] サインアウト後',data:{removedKeys:keysToRemove,postSignOutLocalStorage,postSignOutGroupId:postSignOutAppStore.currentGroupId,postSignOutGroupName:postSignOutAppStore.currentGroup?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G,H'})}).catch(()=>{});
      // #endregion

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  /**
   * パスワードリセット
   */
  const resetPassword = async (email: string): Promise<{ error: AuthError | null }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  return {
    user,
    session,
    isLoading,
    isAuthenticated,
    signUp,
    signIn,
    signInWithOAuth,
    signOut: handleSignOut,
    resetPassword,
  };
}
