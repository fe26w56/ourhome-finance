/**
 * パスワードリセット画面
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAppStore } from '../../stores/useAppStore';

export function ForgotPassword() {
  const { resetPassword } = useAuth();
  const { showToast } = useAppStore();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const { error } = await resetPassword(email);

    if (error) {
      setError(error.message || 'リセットメールの送信に失敗しました');
      setIsLoading(false);
    } else {
      setSuccess(true);
      showToast('リセットメールを送信しました', 'success');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100 text-center">
            <div className="w-16 h-16 bg-[#73F590] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">メールを送信しました</h1>
            <p className="text-gray-600 mb-6">
              {email}にパスワードリセット用のメールを送信しました。
              <br />
              メール内のリンクをクリックして、新しいパスワードを設定してください。
            </p>
            <Link
              to="/auth/login"
              className="inline-block text-[#73F590] font-medium hover:underline"
            >
              ログイン画面に戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">パスワードリセット</h1>
          <p className="text-gray-600 mb-8">
            登録済みのメールアドレスを入力してください。
            <br />
            パスワードリセット用のリンクを送信します。
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#73F590] text-white py-3 rounded-[10px] font-medium hover:bg-[#5dd47a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {isLoading ? '送信中...' : 'リセットメールを送信'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/auth/login"
              className="text-sm text-[#73F590] font-medium hover:underline"
            >
              ログイン画面に戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
