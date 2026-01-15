/**
 * 取引サービス
 * Supabase APIを使用した取引のCRUD操作
 */

import { supabase } from '../lib/supabase';
import { Transaction, TransactionSplit, Category, User, TransactionBeneficiary } from '../types/database';

export interface TransactionWithDetails extends Transaction {
  category: Category;
  paidByUser: User;
  splits?: TransactionSplit[];
  beneficiaries?: User[];
  beneficiaryIds?: string[];
}

/**
 * is_shared を算出するヘルパー関数
 */
export function calculateIsShared(beneficiaryIds: string[], currentUserId: string): boolean {
  // 1人のみ選択かつ自分自身の場合 → false (Personal)
  if (beneficiaryIds.length === 1 && beneficiaryIds[0] === currentUserId) {
    return false;
  }
  // それ以外はすべて true (Shared)
  return true;
}

export interface TransactionFilters {
  groupId: string;
  dateRange?: { start: string; end: string };
  categoryIds?: string[];
  type?: 'expense' | 'income';
  isShared?: boolean;
  paidBy?: string;
  memo?: string;
  amountRange?: { min?: number; max?: number };
  limit?: number;
  offset?: number;
}

/**
 * 取引一覧を取得（フィルタ対応）
 */
export async function getTransactions(
  filters: TransactionFilters
): Promise<TransactionWithDetails[]> {
  let query = supabase
    .from('transactions')
    .select('*, categories(*), users!paid_by(*), transaction_splits(*)')
    .eq('group_id', filters.groupId);

  // 日付範囲フィルタ
  if (filters.dateRange) {
    if (filters.dateRange.start) {
      query = query.gte('date', filters.dateRange.start);
    }
    if (filters.dateRange.end) {
      query = query.lte('date', filters.dateRange.end);
    }
  }

  // カテゴリフィルタ
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    query = query.in('category_id', filters.categoryIds);
  }

  // 種別フィルタ
  if (filters.type) {
    query = query.eq('type', filters.type);
  }

  // 共有フラグフィルタ
  if (filters.isShared !== undefined) {
    query = query.eq('is_shared', filters.isShared);
  }

  // 支払者フィルタ
  if (filters.paidBy) {
    query = query.eq('paid_by', filters.paidBy);
  }

  // メモ検索
  if (filters.memo) {
    query = query.ilike('memo', `%${filters.memo}%`);
  }

  // 金額範囲フィルタ
  if (filters.amountRange) {
    if (filters.amountRange.min != null) {
      query = query.gte('amount', filters.amountRange.min);
    }
    if (filters.amountRange.max != null) {
      query = query.lte('amount', filters.amountRange.max);
    }
  }

  // ソート（日付降順、作成日時降順）
  query = query.order('date', { ascending: false }).order('created_at', { ascending: false });

  // ページネーション
  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch transactions: ${error.message}`);
  }

  return (data || []).map(mapTransactionWithDetails);
}

/**
 * 取引詳細を取得
 */
export async function getTransaction(
  transactionId: string
): Promise<TransactionWithDetails> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, categories(*), users!paid_by(*), transaction_splits(*,users(*)), transaction_beneficiaries(*, users(*))')
    .eq('id', transactionId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch transaction: ${error.message}`);
  }

  return mapTransactionWithDetails(data);
}

/**
 * 取引を作成
 */
export async function createTransaction(
  transaction: {
    groupId: string;
    categoryId: string;
    type: 'expense' | 'income';
    amount: number;
    date: string; // YYYY-MM-DD
    memo?: string;
    isShared: boolean;
    paidBy: string;
    receiptUrl?: string;
  }
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      group_id: transaction.groupId,
      category_id: transaction.categoryId,
      type: transaction.type,
      amount: transaction.amount,
      date: transaction.date,
      memo: transaction.memo || null,
      is_shared: transaction.isShared,
      paid_by: transaction.paidBy,
      created_by: transaction.paidBy, // 作成者 = 支払者
      receipt_url: transaction.receiptUrl || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create transaction: ${error.message}`);
  }

  return mapTransactionFromDB(data);
}

/**
 * 取引を作成（分割込み）
 * RPC関数を使用
 */
export async function createTransactionWithSplits(
  transaction: {
    groupId: string;
    categoryId: string;
    type: 'expense' | 'income';
    amount: number;
    date: string;
    memo?: string;
    isShared: boolean;
    paidBy: string;
    receiptUrl?: string;
  },
  splits: Array<{
    userId: string;
    amount: number;
    percentage?: number;
  }>
): Promise<TransactionWithDetails> {
  const { data, error } = await supabase.rpc('create_transaction_with_splits', {
    p_transaction: {
      group_id: transaction.groupId,
      category_id: transaction.categoryId,
      type: transaction.type,
      amount: transaction.amount,
      date: transaction.date,
      memo: transaction.memo || null,
      is_shared: transaction.isShared,
      paid_by: transaction.paidBy,
      created_by: transaction.paidBy,
      receipt_url: transaction.receiptUrl || null,
    },
    p_splits: splits.map((s) => ({
      user_id: s.userId,
      amount: s.amount,
      percentage: s.percentage || null,
    })),
  });

  if (error) {
    throw new Error(`Failed to create transaction with splits: ${error.message}`);
  }

  // RPC関数の戻り値を取得して詳細情報を取得
  return getTransaction(data.transaction_id);
}

/**
 * 取引を更新
 */
export async function updateTransaction(
  transactionId: string,
  updates: {
    categoryId?: string;
    type?: 'expense' | 'income';
    amount?: number;
    date?: string;
    memo?: string;
    isShared?: boolean;
    paidBy?: string;
    receiptUrl?: string;
  }
): Promise<Transaction> {
  const updateData: Record<string, unknown> = {};
  if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
  if (updates.type !== undefined) updateData.type = updates.type;
  if (updates.amount !== undefined) updateData.amount = updates.amount;
  if (updates.date !== undefined) updateData.date = updates.date;
  if (updates.memo !== undefined) updateData.memo = updates.memo;
  if (updates.isShared !== undefined) updateData.is_shared = updates.isShared;
  if (updates.paidBy !== undefined) updateData.paid_by = updates.paidBy;
  if (updates.receiptUrl !== undefined) updateData.receipt_url = updates.receiptUrl;

  const { data, error } = await supabase
    .from('transactions')
    .update(updateData)
    .eq('id', transactionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update transaction: ${error.message}`);
  }

  return mapTransactionFromDB(data);
}

/**
 * 取引を削除
 */
export async function deleteTransaction(transactionId: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', transactionId);

  if (error) {
    throw new Error(`Failed to delete transaction: ${error.message}`);
  }
}

/**
 * 受益者を保存
 */
export async function saveBeneficiaries(
  transactionId: string,
  beneficiaryIds: string[]
): Promise<void> {
  // 既存の受益者を削除
  const { error: deleteError } = await supabase
    .from('transaction_beneficiaries')
    .delete()
    .eq('transaction_id', transactionId);

  if (deleteError) {
    throw new Error(`Failed to delete existing beneficiaries: ${deleteError.message}`);
  }

  // 新しい受益者を追加
  if (beneficiaryIds.length > 0) {
    const beneficiaryRecords = beneficiaryIds.map((userId) => ({
      transaction_id: transactionId,
      user_id: userId,
    }));

    const { error: insertError } = await supabase
      .from('transaction_beneficiaries')
      .insert(beneficiaryRecords);

    if (insertError) {
      throw new Error(`Failed to insert beneficiaries: ${insertError.message}`);
    }
  }
}

/**
 * 取引を作成（受益者込み）
 */
export async function createTransactionWithBeneficiaries(
  transaction: {
    groupId: string;
    categoryId: string;
    type: 'expense' | 'income';
    amount: number;
    date: string;
    memo?: string;
    paidBy: string;
    receiptUrl?: string;
  },
  beneficiaryIds: string[],
  currentUserId: string
): Promise<TransactionWithDetails> {
  // is_shared を自動算出
  const isShared = calculateIsShared(beneficiaryIds, currentUserId);

  // トランザクション作成
  const { data: txData, error: txError } = await supabase
    .from('transactions')
    .insert({
      group_id: transaction.groupId,
      category_id: transaction.categoryId,
      type: transaction.type,
      amount: transaction.amount,
      date: transaction.date,
      memo: transaction.memo || null,
      is_shared: isShared,
      paid_by: transaction.paidBy,
      created_by: currentUserId,
      receipt_url: transaction.receiptUrl || null,
    })
    .select()
    .single();

  if (txError) {
    throw new Error(`Failed to create transaction: ${txError.message}`);
  }

  // 受益者を保存
  await saveBeneficiaries(txData.id, beneficiaryIds);

  // transaction_splitsを作成（精算計算用）
  // 支払者を除いた受益者に対して均等に分割
  if (isShared && beneficiaryIds.length > 0) {
    const splitAmount = transaction.amount / beneficiaryIds.length;
    const splitsToCreate = beneficiaryIds
      .filter(id => id !== transaction.paidBy) // 支払者は除外
      .map(userId => ({
        transaction_id: txData.id,
        user_id: userId,
        amount: splitAmount,
        percentage: null,
        is_settled: false,
      }));

    if (splitsToCreate.length > 0) {
      const { error: splitsError } = await supabase
        .from('transaction_splits')
        .insert(splitsToCreate);

      if (splitsError) {
        console.error('Failed to create transaction splits:', splitsError);
        // エラーが発生しても取引は作成済みなので、続行
      }
    }
  }

  // 詳細情報を取得して返す
  return getTransaction(txData.id);
}

/**
 * 取引を更新（受益者込み）
 */
export async function updateTransactionWithBeneficiaries(
  transactionId: string,
  updates: {
    categoryId?: string;
    type?: 'expense' | 'income';
    amount?: number;
    date?: string;
    memo?: string;
    paidBy?: string;
    receiptUrl?: string;
  },
  beneficiaryIds: string[],
  currentUserId: string
): Promise<TransactionWithDetails> {
  // is_shared を自動算出
  const isShared = calculateIsShared(beneficiaryIds, currentUserId);

  const updateData: Record<string, unknown> = { is_shared: isShared };
  if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
  if (updates.type !== undefined) updateData.type = updates.type;
  if (updates.amount !== undefined) updateData.amount = updates.amount;
  if (updates.date !== undefined) updateData.date = updates.date;
  if (updates.memo !== undefined) updateData.memo = updates.memo;
  if (updates.paidBy !== undefined) updateData.paid_by = updates.paidBy;
  if (updates.receiptUrl !== undefined) updateData.receipt_url = updates.receiptUrl;

  const { error: txError } = await supabase
    .from('transactions')
    .update(updateData)
    .eq('id', transactionId);

  if (txError) {
    throw new Error(`Failed to update transaction: ${txError.message}`);
  }

  // 受益者を更新
  await saveBeneficiaries(transactionId, beneficiaryIds);

  // transaction_splitsを更新（精算計算用）
  // 既存のsplitsを削除
  const { error: deleteSplitsError } = await supabase
    .from('transaction_splits')
    .delete()
    .eq('transaction_id', transactionId);

  if (deleteSplitsError) {
    console.error('Failed to delete existing transaction splits:', deleteSplitsError);
  }

  // 新しいsplitsを作成
  if (isShared && beneficiaryIds.length > 0) {
    const currentTransaction = await getTransaction(transactionId);
    const splitAmount = currentTransaction.amount / beneficiaryIds.length;
    const splitsToCreate = beneficiaryIds
      .filter(id => id !== (updates.paidBy || currentTransaction.paidBy)) // 支払者は除外
      .map(userId => ({
        transaction_id: transactionId,
        user_id: userId,
        amount: splitAmount,
        percentage: null,
        is_settled: false,
      }));

    if (splitsToCreate.length > 0) {
      const { error: splitsError } = await supabase
        .from('transaction_splits')
        .insert(splitsToCreate);

      if (splitsError) {
        console.error('Failed to create transaction splits:', splitsError);
        // エラーが発生しても取引は更新済みなので、続行
      }
    }
  }

  // 詳細情報を取得して返す
  return getTransaction(transactionId);
}

/**
 * データベースのスネークケース形式をキャメルケースに変換
 */
function mapTransactionFromDB(data: Record<string, unknown>): Transaction {
  return {
    id: data.id as string,
    groupId: data.group_id as string,
    categoryId: data.category_id as string,
    type: data.type as 'expense' | 'income',
    amount: data.amount as number,
    date: data.date as string,
    memo: data.memo as string | null,
    isShared: data.is_shared as boolean,
    paidBy: data.paid_by as string,
    createdBy: data.created_by as string,
    receiptUrl: data.receipt_url as string | null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapTransactionWithDetails(data: Record<string, unknown>): TransactionWithDetails {
  const transaction = mapTransactionFromDB(data);
  const category = data.categories as Record<string, unknown>;
  const paidByUser = data.users as Record<string, unknown>;
  const splits = (data.transaction_splits as Record<string, unknown>[]) || [];
  const beneficiaryRecords = (data.transaction_beneficiaries as Record<string, unknown>[]) || [];

  // 受益者のユーザー情報をマッピング
  const beneficiaries: User[] = beneficiaryRecords.map((b) => {
    const user = b.users as Record<string, unknown>;
    return {
      id: user.id as string,
      email: user.email as string,
      displayName: user.display_name as string,
      avatarUrl: user.avatar_url as string | null,
      createdAt: user.created_at as string,
      updatedAt: user.updated_at as string,
    };
  });

  // 受益者IDの配列
  const beneficiaryIds = beneficiaryRecords.map((b) => b.user_id as string);

  return {
    ...transaction,
    category: {
      id: category.id as string,
      groupId: category.group_id as string,
      name: category.name as string,
      icon: category.icon as string,
      color: category.color as string,
      type: category.type as 'expense' | 'income' | 'both',
      sortOrder: category.sort_order as number,
      isDefault: category.is_default as boolean,
      isActive: category.is_active as boolean,
      createdAt: category.created_at as string,
    },
    paidByUser: {
      id: paidByUser.id as string,
      email: paidByUser.email as string,
      displayName: paidByUser.display_name as string,
      avatarUrl: paidByUser.avatar_url as string | null,
      createdAt: paidByUser.created_at as string,
      updatedAt: paidByUser.updated_at as string,
    },
    splits: splits.map((split) => ({
      id: split.id as string,
      transactionId: split.transaction_id as string,
      userId: split.user_id as string,
      amount: split.amount as number,
      percentage: split.percentage as number | null,
      isSettled: split.is_settled as boolean,
      settledAt: split.settled_at as string | null,
    })),
    beneficiaries,
    beneficiaryIds,
  };
}
