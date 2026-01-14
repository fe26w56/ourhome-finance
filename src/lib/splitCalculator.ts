/**
 * 割り勘計算ロジック
 */

export interface SplitResult {
  userId: string;
  amount: number;
  percentage: number | null;
}

/**
 * 均等割りを計算
 */
export function calculateEqualSplit(
  totalAmount: number,
  memberIds: string[]
): SplitResult[] {
  if (memberIds.length === 0) return [];

  const splitAmount = Math.floor((totalAmount / memberIds.length) * 100) / 100;
  const remainder = totalAmount - splitAmount * memberIds.length;

  return memberIds.map((userId, index) => ({
    userId,
    amount: index === 0 ? splitAmount + remainder : splitAmount,
    percentage: null,
  }));
}

/**
 * 割合指定で分割を計算
 */
export function calculatePercentageSplit(
  totalAmount: number,
  splits: Array<{ userId: string; percentage: number }>
): SplitResult[] {
  return splits.map((split) => ({
    userId: split.userId,
    amount: Math.floor((totalAmount * split.percentage) / 100 * 100) / 100,
    percentage: split.percentage,
  }));
}

/**
 * 金額指定で分割を検証
 */
export function validateAmountSplit(
  totalAmount: number,
  splits: Array<{ userId: string; amount: number }>
): { isValid: boolean; error?: string } {
  const totalSplit = splits.reduce((sum, s) => sum + s.amount, 0);
  const diff = Math.abs(totalSplit - totalAmount);

  if (diff > 0.01) {
    return {
      isValid: false,
      error: `負担額の合計（¥${totalSplit.toLocaleString()}）が取引金額（¥${totalAmount.toLocaleString()}）と一致しません。`,
    };
  }

  return { isValid: true };
}

/**
 * 割り勘タイプに応じて分割を計算
 */
export function calculateSplit(
  totalAmount: number,
  splitType: 'equal' | 'percentage' | 'amount',
  memberIds: string[],
  splits?: Array<{ userId: string; amount?: number; percentage?: number }>
): SplitResult[] {
  switch (splitType) {
    case 'equal':
      return calculateEqualSplit(totalAmount, memberIds);

    case 'percentage':
      if (!splits) return [];
      return calculatePercentageSplit(
        totalAmount,
        splits.map((s) => ({
          userId: s.userId,
          percentage: s.percentage || 0,
        }))
      );

    case 'amount':
      if (!splits) return [];
      return splits.map((s) => ({
        userId: s.userId,
        amount: s.amount || 0,
        percentage: null,
      }));

    default:
      return [];
  }
}
