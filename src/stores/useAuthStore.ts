/**
 * 認証ストア
 */

import { create } from 'zustand';
import type { User } from '../types/database';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  // 状態
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // アクション
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => void;
  reset: () => void;
}

const initialState = {
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
};

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: user !== null,
    }),

  setSession: (session) =>
    set({
      session,
      isAuthenticated: session !== null,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  signOut: () => {
    set({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  reset: () => set(initialState),
}));
