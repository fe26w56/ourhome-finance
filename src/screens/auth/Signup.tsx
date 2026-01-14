/**
 * 新規登録画面
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAppStore } from '../../stores/useAppStore';

export function Signup() {
  const navigate = useNavigate();
  const { signUp, signInWithOAuth } = useAuth();
  const { showToast } = useAppStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const { error } = await signUp(email, password, displayName);

    if (error) {
      console.error('Signup error:', error);
      
      // エラーメッセージを詳細に表示
      let errorMessage = error.message || '登録に失敗しました';
      
      // RLSポリシーエラーの場合、わかりやすいメッセージに変換
      if (errorMessage.includes('row-level security')) {
        errorMessage = '⚠️ データベース設定エラー: usersテーブルのRLSポリシーが正しく設定されていません。/docs/supabase/FIX-RLS-POLICIES.sql を実行してください。';
      }
      
      setError(errorMessage);
      setIsLoading(false);
    } else {
      showToast('アカウントを作成しました', 'success');
      // サインアップ後、オンボーディング画面へ
      navigate('/onboarding/group-setup');
    }
  };

  const handleOAuthSignup = async (provider: 'google' | 'apple') => {
    setError(null);
    const { error } = await signInWithOAuth(provider);

    if (error) {
      setError(error.message || `${provider}での登録に失敗しました`);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">新規登録</h1>
          <p className="text-gray-600 mb-8">アカウントを作成してください</p>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm font-medium mb-2">{error}</p>
              {error.includes('RLS') && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  <p className="font-bold mb-1">修正手順:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Supabase Dashboard にログイン</li>
                    <li>SQL Editor を開く</li>
                    <li><code className="bg-yellow-100 px-1 rounded">/docs/supabase/FIX-RLS-POLICIES.sql</code> の内容を実行</li>
                    <li>このページをリロードして再試行</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                表示名
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#73F590] focus:border-transparent"
                placeholder="山田 太郎"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#73F590] focus:border-transparent"
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#73F590] focus:border-transparent"
                placeholder="6文字以上"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#73F590] text-white py-3 rounded-[10px] font-medium hover:bg-[#5dd47a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {isLoading ? '登録中...' : '新規登録'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">または</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => handleOAuthSignup('google')}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-[12px] hover:bg-gray-50 transition-colors min-h-[44px]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="text-gray-700 font-medium">Googleで登録</span>
              </button>

              <button
                onClick={() => handleOAuthSignup('apple')}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-[12px] hover:bg-gray-50 transition-colors min-h-[44px]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                <span className="text-gray-700 font-medium">Appleで登録</span>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              すでにアカウントをお持ちの方は{' '}
              <Link to="/auth/login" className="text-[#73F590] font-medium hover:underline">
                ログイン
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
