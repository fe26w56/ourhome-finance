/**
 * TanStack Query QueryClient 設定
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5分
      gcTime: 1000 * 60 * 30, // 30分（旧 cacheTime）
      retry: (failureCount, error) => {
        // AbortErrorの場合はリトライしない
        if (error instanceof Error && error.name === 'AbortError') {
          return false;
        }
        // その他のエラーは1回だけリトライ
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: (failureCount, error) => {
        // AbortErrorの場合はリトライしない
        if (error instanceof Error && error.name === 'AbortError') {
          return false;
        }
        return false;
      },
    },
  },
  // グローバルエラーハンドラー
  queryCache: undefined,
  mutationCache: undefined,
});
