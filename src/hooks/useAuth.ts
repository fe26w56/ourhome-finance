/**
 * 認証フック
 */

import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
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
   * ユーザー情報を読み込む
   */
  const loadUser = async (userId: string) => {
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
        // PGRST116 = レコードが見つからない（OAuth初回ログインの場合）
        console.error('Failed to load user:', error);
        setLoading(false);
        return;
      }

      if (!data) {
        // OAuth認証でユーザーレコードが存在しない場合は作成しない
        // AuthCallbackで処理されるため
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

      setUser(user);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load user:', error);
      setLoading(false);
    }
  };

  /**
   * メール・パスワードで新規登録
   */
  const signUp = async (
    email: string,
    password: string,
    displayName: string
  ): Promise<{ error: AuthError | null }> => {
    try {
      console.log('signUp: Starting signup process...', { email, displayName });
      
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
        return { error };
      }

      console.log('signUp: Auth signup successful, user ID:', data.user?.id);

      // ユーザー情報をusersテーブルに作成
      if (data.user) {
        console.log('signUp: Creating user record in database...');
        
        const userData = {
          id: data.user.id,
          email: data.user.email!,
          display_name: displayName,
        };
        
        console.log('signUp: User data:', userData);
        
        const { data: insertData, error: insertError } = await supabase
          .from('users')
          .insert(userData)
          .select();

        if (insertError) {
          console.error('signUp: Failed to create user record:', {
            message: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint,
          });
          return { error: insertError as AuthError };
        }
        
        console.log('signUp: User record created successfully:', insertData);
      }

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
      const { error } = await supabase.auth.signOut();
      signOut();
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
