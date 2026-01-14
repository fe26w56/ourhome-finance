/**
 * 精算計算ロジック
 */

import { TransactionWithDetails } from '../services/transactionService';

export interface SettlementBalance {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

/**
 * 精算残高を計算
 * 取引の分割情報から、誰が誰にいくら支払うべきかを計算
 */
export function calculateSettlementBalance(
  transactions: TransactionWithDetails[]
): SettlementBalance[] {
  // 各ユーザー間の残高を記録
  const balances: Record<string, Record<string, number>> = {};

  // 各取引を処理
  for (const transaction of transactions) {
    if (!transaction.isShared || !transaction.splits || transaction.splits.length === 0) {
      continue;
    }

    const paidBy = transaction.paidBy;
    const totalAmount = transaction.amount;

    // 各分割を処理
    for (const split of transaction.splits) {
      const userId = split.userId;
      const splitAmount = split.amount;

      // 支払者と負担者が同じ場合はスキップ
      if (paidBy === userId) {
        continue;
      }

      // 負担者が支払者に支払うべき金額を記録
      if (!balances[userId]) {
        balances[userId] = {};
      }
      if (!balances[userId][paidBy]) {
        balances[userId][paidBy] = 0;
      }
      balances[userId][paidBy] += splitAmount;
    }
  }

  // 残高を正規化（双方向の残高を相殺）
  const result: SettlementBalance[] = [];
  const processed = new Set<string>();

  for (const [debtor, creditors] of Object.entries(balances)) {
    for (const [creditor, amount] of Object.entries(creditors)) {
      const key1 = `${debtor}-${creditor}`;
      const key2 = `${creditor}-${debtor}`;

      if (processed.has(key1) || processed.has(key2)) {
        continue;
      }

      // 逆方向の残高を確認
      const reverseAmount = balances[creditor]?.[debtor] || 0;
      const netAmount = amount - reverseAmount;

      if (Math.abs(netAmount) > 0.01) {
        if (netAmount > 0) {
          result.push({
            fromUserId: debtor,
            toUserId: creditor,
            amount: netAmount,
          });
        } else {
          result.push({
            fromUserId: creditor,
            toUserId: debtor,
            amount: Math.abs(netAmount),
          });
        }
      }

      processed.add(key1);
      processed.add(key2);
    }
  }

  return result;
}
