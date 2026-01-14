/**
 * ドメイン型定義
 * フロントエンド用の派生型・拡張型
 */

import type {
  User,
  Group,
  GroupMember,
  Category,
  Transaction,
  TransactionSplit,
  Budget,
  Goal,
  Settlement,
} from './database';

// ==================== 拡張型 ====================

/**
 * ユーザー情報 + グループ内のメンバー情報
 */
export interface UserWithMember extends User {
  member: GroupMember;
}

/**
 * 取引 + カテゴリ情報 + 分割情報
 */
export interface TransactionWithDetails extends Transaction {
  category: Category;
  splits: TransactionSplit[];
  paidByUser: User;
  createdByUser: User;
}

/**
 * カテゴリ + 使用回数（よく使う順ソート用）
 */
export interface CategoryWithUsage extends Category {
  usageCount: number;
  lastUsedAt: string | null;
}

/**
 * 予算 + カテゴリ情報 + 実績額
 */
export interface BudgetWithStatus extends Budget {
  category: Category | null;
  actualAmount: number;
  usageRate: number; // 0-100
  isWarning: boolean; // 80%以上
  isExceeded: boolean; // 100%超過
}

/**
 * 目標 + 進捗情報
 */
export interface GoalWithProgress extends Goal {
  progress: number; // 0-100
  remainingAmount: number;
  daysRemaining: number | null;
}

/**
 * 精算残高
 */
export interface SettlementBalance {
  fromUserId: string;
  toUserId: string;
  amount: number;
  fromUser: User;
  toUser: User;
}

/**
 * 月次サマリー
 */
export interface MonthlySummary {
  yearMonth: string; // YYYY-MM
  totalExpense: number;
  totalIncome: number;
  balance: number; // 収入 - 支出
  transactionCount: number;
  previousMonth?: {
    totalExpense: number;
    totalIncome: number;
    balance: number;
  };
}

/**
 * カテゴリ別統計
 */
export interface CategoryStats {
  categoryId: string;
  category: Category;
  amount: number;
  percentage: number; // 全体に占める割合
  budgetAmount: number | null;
  actualAmount: number;
  usageRate: number | null; // 予算に対する使用率
}

/**
 * 日別推移
 */
export interface DailyTrend {
  date: string; // YYYY-MM-DD
  expense: number;
  income: number;
  balance: number;
}

/**
 * メンバー別負担内訳
 */
export interface MemberContribution {
  userId: string;
  user: User;
  totalPaid: number; // 支払った合計
  totalOwed: number; // 負担した合計
  netAmount: number; // 支払った - 負担した（正の値は受け取るべき額）
}

// ==================== フォーム型 ====================

/**
 * 取引入力フォーム
 */
export interface TransactionForm {
  type: 'expense' | 'income';
  amount: string; // 文字列として管理（電卓入力用）
  date: string; // YYYY-MM-DD
  categoryId: string;
  memo: string;
  isShared: boolean;
  paidBy: string; // userId
  splitType: 'equal' | 'percentage' | 'amount' | 'none';
  splits: TransactionSplitForm[];
}

/**
 * 取引分割フォーム
 */
export interface TransactionSplitForm {
  userId: string;
  amount: string; // 文字列として管理
  percentage: number | null;
}

/**
 * 精算フォーム
 */
export interface SettlementForm {
  fromUserId: string;
  toUserId: string;
  amount: string; // 文字列として管理
  settledAt: string; // YYYY-MM-DD
  method: string;
  note: string;
}

// ==================== フィルター型 ====================

/**
 * 検索・フィルター条件
 */
export interface TransactionFilter {
  searchQuery: string;
  dateRange: {
    start: string | null; // YYYY-MM-DD
    end: string | null; // YYYY-MM-DD
  };
  categoryIds: string[];
  memberIds: string[];
  transactionType: 'expense' | 'income' | 'all';
  sharedType: 'shared' | 'personal' | 'all';
  amountRange: {
    min: number | null;
    max: number | null;
  };
  sortBy: 'date' | 'amount' | 'category';
  sortOrder: 'asc' | 'desc';
}

// ==================== UI状態型 ====================

/**
 * トースト通知
 */
export interface Toast {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  id?: string; // 自動生成
}

/**
 * ボトムシートの種類
 */
export type BottomSheetContent = 'add' | 'filter' | 'category' | 'settlement' | null;

// ==================== オンボーディング型 ====================

/**
 * 通貨
 */
export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP'
}

/**
 * グループタイプ
 */
export enum GroupType {
  NEW = 'NEW',
  EXISTING = 'EXISTING'
}

/**
 * プロフィールビュー
 */
export enum ProfileView {
  SHARED = 'SHARED',
  PERSONAL = 'PERSONAL'
}

/**
 * ユーザープロフィール
 */
export interface UserProfile {
  name: string;
  avatarUrl?: string;
  defaultView: ProfileView;
}

/**
 * グループ設定
 */
export interface GroupSettings {
  name: string;
  currency: Currency;
  type: GroupType;
}
