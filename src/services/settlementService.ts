/**
 * 精算サービス
 * Supabase APIを使用した精算のCRUD操作
 */

import { supabase } from '../lib/supabase';
import { Settlement, User } from '../types/database';

export interface SettlementBalance {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number; // from が to に支払うべき金額
}

export interface SettlementWithUsers extends Settlement {
  fromUser: User;
  toUser: User;
}

/**
 * 精算残高を取得
 */
export async function getSettlementBalance(
  groupId: string
): Promise<SettlementBalance[]> {
  const { data, error } = await supabase.rpc('get_settlement_balance', {
    group_uuid: groupId,
  });

  if (error) {
    throw new Error(`Failed to get settlement balance: ${error.message}`);
  }

  return (data || []).map((item: Record<string, unknown>) => ({
    fromUserId: item.from_user_id as string,
    fromUserName: item.from_user_name as string,
    toUserId: item.to_user_id as string,
    toUserName: item.to_user_name as string,
    amount: item.amount as number,
  }));
}

/**
 * 精算を記録
 */
export async function recordSettlement(
  settlement: {
    groupId: string;
    fromUserId: string;
    toUserId: string;
    amount: number;
    settledAt: string; // YYYY-MM-DD
    method?: string;
    note?: string;
  }
): Promise<void> {
  const { error } = await supabase.rpc('record_settlement', {
    group_uuid: settlement.groupId,
    from_user_uuid: settlement.fromUserId,
    to_user_uuid: settlement.toUserId,
    settlement_amount: settlement.amount,
    settlement_date: settlement.settledAt,
    settlement_method: settlement.method || null,
    settlement_note: settlement.note || null,
  });

  if (error) {
    throw new Error(`Failed to record settlement: ${error.message}`);
  }
}

/**
 * 精算履歴を取得
 */
export async function getSettlementHistory(
  groupId: string
): Promise<SettlementWithUsers[]> {
  const { data, error } = await supabase
    .from('settlements')
    .select('*, users!from_user_id(*), users!to_user_id(*)')
    .eq('group_id', groupId)
    .order('settled_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch settlement history: ${error.message}`);
  }

  return (data || []).map((item: Record<string, unknown>) => {
    const settlement = mapSettlementFromDB(item);
    
    // Supabaseの外部キー参照の結果を解析
    // from_user_idとto_user_idの両方の参照がある場合、オブジェクトで返される
    const users = item.users as any;
    const fromUserData = users?.from_user_id || users;
    const toUserData = users?.to_user_id || users;

    return {
      ...settlement,
      fromUser: mapUserFromDB(fromUserData as Record<string, unknown>),
      toUser: mapUserFromDB(toUserData as Record<string, unknown>),
    };
  });
}

/**
 * データベースのスネークケース形式をキャメルケースに変換
 */
function mapSettlementFromDB(data: Record<string, unknown>): Settlement {
  return {
    id: data.id as string,
    groupId: data.group_id as string,
    fromUserId: data.from_user_id as string,
    toUserId: data.to_user_id as string,
    amount: data.amount as number,
    settledAt: data.settled_at as string,
    method: data.method as string | null,
    note: data.note as string | null,
    createdAt: data.created_at as string,
  };
}

function mapUserFromDB(data: Record<string, unknown>): User {
  return {
    id: data.id as string,
    email: data.email as string,
    displayName: data.display_name as string,
    avatarUrl: data.avatar_url as string | null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}
