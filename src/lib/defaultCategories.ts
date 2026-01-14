/**
 * デフォルトカテゴリ定義
 * グループ作成時に自動生成されるカテゴリ
 */

import { CategoryType } from '../types/database';

export interface DefaultCategory {
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
  sortOrder: number;
}

/**
 * デフォルトカテゴリ（11カテゴリ）
 * 支出カテゴリ: 10個、収入カテゴリ: 1個
 */
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // 支出カテゴリ
  { name: '食費', icon: 'restaurant', color: '#FF6B6B', type: 'expense', sortOrder: 1 },
  { name: '日用品', icon: 'shopping_bag', color: '#4ECDC4', type: 'expense', sortOrder: 2 },
  { name: '交通費', icon: 'train', color: '#45B7D1', type: 'expense', sortOrder: 3 },
  { name: '光熱費', icon: 'bolt', color: '#FFA07A', type: 'expense', sortOrder: 4 },
  { name: '通信費', icon: 'phone', color: '#98D8C8', type: 'expense', sortOrder: 5 },
  { name: '医療費', icon: 'local_hospital', color: '#F7DC6F', type: 'expense', sortOrder: 6 },
  { name: '娯楽', icon: 'movie', color: '#BB8FCE', type: 'expense', sortOrder: 7 },
  { name: '衣服', icon: 'checkroom', color: '#85C1E2', type: 'expense', sortOrder: 8 },
  { name: '教育', icon: 'school', color: '#F8B739', type: 'expense', sortOrder: 9 },
  { name: 'その他', icon: 'more_horiz', color: '#95A5A6', type: 'expense', sortOrder: 10 },
  // 収入カテゴリ
  { name: '収入', icon: 'account_balance_wallet', color: '#73F590', type: 'income', sortOrder: 11 },
];
