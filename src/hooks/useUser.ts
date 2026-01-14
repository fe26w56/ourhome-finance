/**
 * ユーザー関連のTanStack Queryフック
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUser, updateUser } from '../services/userService';
import { User } from '../types/database';
import { queryKeys } from '../lib/queryKeys';

/**
 * ユーザー情報を取得
 */
export function useUser(userId: string) {
  return useQuery({
    queryKey: queryKeys.user.detail(userId),
    queryFn: () => getUser(userId),
    enabled: !!userId,
  });
}

/**
 * ユーザー情報を更新
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: Parameters<typeof updateUser>[1] }) =>
      updateUser(userId, updates),
    onSuccess: (data, variables) => {
      // ユーザー情報をキャッシュに反映
      queryClient.setQueryData<User>(queryKeys.user.detail(variables.userId), data);
    },
  });
}
