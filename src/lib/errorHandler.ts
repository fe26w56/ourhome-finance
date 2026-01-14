/**
 * グローバルエラーハンドラー
 * AbortErrorやその他の無害なエラーを適切に処理
 */

// AbortErrorをフィルタリング
const isAbortError = (error: any): boolean => {
  return (
    error?.name === 'AbortError' ||
    error?.message?.includes('signal is aborted') ||
    error?.message?.includes('The user aborted a request')
  );
};

// ネットワークエラーかどうかを判定
const isNetworkError = (error: any): boolean => {
  return (
    error?.message?.includes('fetch') ||
    error?.message?.includes('network') ||
    error?.code === 'ECONNABORTED'
  );
};

/**
 * エラーをログに出力（開発時のみ）
 */
export const logError = (context: string, error: any) => {
  if (isAbortError(error)) {
    // AbortErrorは情報レベルでログ出力
    console.log(`[${context}] Request aborted (normal behavior):`, error.message);
    return;
  }

  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}] Error:`, error);
  }
};

/**
 * エラーハンドラーを初期化
 */
export const initErrorHandler = () => {
  // グローバルなunhandledrejectionイベントをキャッチ
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;

    // AbortErrorは無視
    if (isAbortError(error)) {
      console.log('Unhandled rejection (AbortError - ignored):', error?.message);
      event.preventDefault(); // デフォルトのエラー表示を防ぐ
      return;
    }

    // その他のエラーは通常通りログ出力
    if (process.env.NODE_ENV === 'development') {
      console.error('Unhandled promise rejection:', error);
    }
  });

  // グローバルなerrorイベントをキャッチ
  window.addEventListener('error', (event) => {
    const error = event.error;

    // AbortErrorは無視
    if (isAbortError(error)) {
      console.log('Global error (AbortError - ignored):', error?.message);
      event.preventDefault(); // デフォルトのエラー表示を防ぐ
      return;
    }

    // その他のエラーは通常通りログ出力
    if (process.env.NODE_ENV === 'development') {
      console.error('Global error:', error);
    }
  });

  // コンソールエラーをインターセプト（オプション）
  if (process.env.NODE_ENV === 'development') {
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      // AbortErrorの場合は警告レベルに格下げ
      if (args.some((arg) => isAbortError(arg))) {
        console.warn('[Filtered AbortError]:', ...args);
        return;
      }
      originalConsoleError.apply(console, args);
    };
  }
};

/**
 * エラーをユーザーフレンドリーなメッセージに変換
 */
export const getUserFriendlyErrorMessage = (error: any): string => {
  if (isAbortError(error)) {
    return 'リクエストがキャンセルされました';
  }

  if (isNetworkError(error)) {
    return 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
  }

  if (error?.code === '42501') {
    return 'データベース権限エラー: RLSポリシーを確認してください';
  }

  if (error?.message?.includes('row-level security')) {
    return 'データベース設定エラー: /docs/supabase/FIX-RLS-POLICIES.sql を実行してください';
  }

  return error?.message || '予期しないエラーが発生しました';
};

export default {
  logError,
  initErrorHandler,
  getUserFriendlyErrorMessage,
  isAbortError,
  isNetworkError,
};
