/**
 * データベース型定義
 * Supabaseのテーブル構造に対応
 */

// ==================== 基本型 ====================

export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';
export type TransactionType = 'expense' | 'income';
export type CategoryType = 'expense' | 'income' | 'both';
export type GoalType = 'savings' | 'spending_limit';
export type Theme = 'light' | 'dark' | 'system';

// ==================== 1. users（ユーザー） ====================

export interface User {
  id: string; // UUID
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==================== 2. groups（グループ） ====================

export interface Group {
  id: string; // UUID
  name: string;
  currency: string; // 通貨コード（デフォルト: 'JPY'）
  monthStartDay: number; // 1-28
  inviteCode: string | null;
  carryOverBalance: boolean; // 残高繰越設定
  budgetCarryOver: boolean; // 予算繰越設定
  createdBy: string; // UUID
  createdAt: string;
  updatedAt: string;
}

// ==================== 3. group_members（グループメンバー） ====================

export interface GroupMember {
  id: string; // UUID
  groupId: string; // UUID
  userId: string; // UUID
  role: MemberRole;
  nickname: string | null;
  color: string | null; // #RRGGBB
  joinedAt: string;
}

// ==================== 4. categories（カテゴリ） ====================

export interface Category {
  id: string; // UUID
  groupId: string; // UUID
  name: string;
  icon: string; // Material Icons名
  color: string; // #RRGGBB
  type: CategoryType;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

// ==================== 5. transactions（取引） ====================

export interface Transaction {
  id: string; // UUID
  groupId: string; // UUID
  categoryId: string; // UUID
  type: TransactionType;
  amount: number; // DECIMAL(12,2)
  date: string; // YYYY-MM-DD
  memo: string | null;
  isShared: boolean;
  paidBy: string; // UUID
  createdBy: string; // UUID
  receiptUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==================== 6. transaction_splits（取引分割・負担） ====================

export interface TransactionSplit {
  id: string; // UUID
  transactionId: string; // UUID
  userId: string; // UUID
  amount: number; // DECIMAL(12,2)
  percentage: number | null; // DECIMAL(5,2)
  isSettled: boolean;
  settledAt: string | null;
}

// ==================== 7. settlements（精算） ====================

export interface Settlement {
  id: string; // UUID
  groupId: string; // UUID
  fromUserId: string; // UUID
  toUserId: string; // UUID
  amount: number; // DECIMAL(12,2)
  settledAt: string; // YYYY-MM-DD
  method: string | null;
  note: string | null;
  createdAt: string;
}

// ==================== 8. budgets（予算） ====================

export interface Budget {
  id: string; // UUID
  groupId: string; // UUID
  categoryId: string | null; // UUID（NULLは全体予算）
  yearMonth: string; // YYYY-MM
  amount: number; // DECIMAL(12,2)
  carryOver: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==================== 9. goals（目標） ====================

export interface Goal {
  id: string; // UUID
  groupId: string; // UUID
  name: string;
  type: GoalType;
  targetAmount: number; // DECIMAL(12,2)
  currentAmount: number; // DECIMAL(12,2)
  categoryId: string | null; // UUID（支出上限用）
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
  isRecurring: boolean;
  isAchieved: boolean;
  achievedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==================== 10. goal_contributions（目標への入金） ====================

export interface GoalContribution {
  id: string; // UUID
  goalId: string; // UUID
  userId: string; // UUID
  amount: number; // DECIMAL(12,2)
  date: string; // YYYY-MM-DD
  note: string | null;
  createdAt: string;
}

// ==================== 11. user_settings（ユーザー設定） ====================

export interface UserSettings {
  id: string; // UUID
  userId: string; // UUID
  reminderEnabled: boolean;
  reminderTime: string | null; // HH:mm
  budgetAlertEnabled: boolean;
  partnerNotification: boolean;
  language: string; // デフォルト: 'ja'
  theme: Theme;
  updatedAt: string;
}

// ==================== 12. transaction_beneficiaries（受益者） ====================

export interface TransactionBeneficiary {
  id: string; // UUID
  transactionId: string; // UUID
  userId: string; // UUID
  createdAt: string;
}
