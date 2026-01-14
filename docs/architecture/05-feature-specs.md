# 機能仕様書

## 概要

本ドキュメントでは、各機能のビジネスロジックと仕様を定義します。

---

## 1. 取引記録機能

### 1.1 取引の種類

| 種類 | 説明 | 例 |
|------|------|-----|
| expense | 支出 | 食費、光熱費、交通費 |
| income | 収入 | 給与、副収入 |

### 1.2 取引入力仕様

#### 必須項目

| 項目 | 型 | バリデーション |
|------|-----|---------------|
| type | enum | expense または income |
| amount | number | 0より大きい数値、小数点以下2桁まで |
| date | date | 過去〜本日（未来は警告表示） |
| paid_by | uuid | グループメンバーのID |

#### 任意項目

| 項目 | 型 | デフォルト |
|------|-----|-----------|
| category_id | uuid | null（未分類） |
| memo | string | null |
| is_shared | boolean | true |
| receipt_url | string | null |

### 1.3 電卓入力ロジック

```
状態: amount = "0"

操作: 数字キー押下
  - amount が "0" の場合 → 入力値で置換
  - それ以外 → 末尾に追加
  - 小数点以下2桁を超える場合 → 無視

操作: "." キー押下
  - 既に "." を含む場合 → 無視
  - それ以外 → 末尾に追加

操作: バックスペース
  - 1文字削除
  - 空になる場合 → "0" に設定

操作: クリア
  - "0" に設定

表示形式: ¥{amount.toLocaleString()}
  例: ¥1,234.50
```

### 1.4 カテゴリ選択ロジック

```
表示順:
1. 最近使用したカテゴリ（上位3件）
2. 使用頻度の高いカテゴリ
3. 全カテゴリ（sort_order順）

学習ロジック:
- 取引保存時にカテゴリ使用回数をインクリメント
- 最終使用日時を記録
- 表示時は (使用回数 × 0.7 + 最終使用日の新しさ × 0.3) でスコア計算
```

---

## 2. 割り勘・立替機能

### 2.1 負担方法

| 方法 | 説明 | 計算式 |
|------|------|--------|
| equal | 均等割り | amount / メンバー数 |
| percentage | 割合指定 | amount × (percentage / 100) |
| amount | 金額指定 | 直接指定 |

### 2.2 均等割り計算

```typescript
function calculateEqualSplit(
  totalAmount: number,
  members: string[]
): TransactionSplit[] {
  const splitAmount = Math.floor((totalAmount / members.length) * 100) / 100;
  const remainder = totalAmount - (splitAmount * members.length);
  
  return members.map((userId, index) => ({
    userId,
    amount: index === 0 
      ? splitAmount + remainder  // 端数は最初の人に
      : splitAmount,
    percentage: 100 / members.length,
  }));
}

// 例: ¥1,000 を 3人で割る
// → [¥334, ¥333, ¥333] （端数は最初の人）
```

### 2.3 割合指定計算

```typescript
function calculatePercentageSplit(
  totalAmount: number,
  percentages: { userId: string; percentage: number }[]
): TransactionSplit[] {
  // バリデーション: 合計100%
  const totalPercentage = percentages.reduce((sum, p) => sum + p.percentage, 0);
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new Error('割合の合計は100%である必要があります');
  }
  
  return percentages.map(({ userId, percentage }) => ({
    userId,
    amount: Math.round(totalAmount * (percentage / 100) * 100) / 100,
    percentage,
  }));
}
```

### 2.4 金額指定バリデーション

```typescript
function validateAmountSplit(
  totalAmount: number,
  splits: { userId: string; amount: number }[]
): { isValid: boolean; error?: string } {
  const totalSplit = splits.reduce((sum, s) => sum + s.amount, 0);
  
  if (Math.abs(totalSplit - totalAmount) > 0.01) {
    return {
      isValid: false,
      error: `負担額の合計（¥${totalSplit.toLocaleString()}）が取引金額（¥${totalAmount.toLocaleString()}）と一致しません`,
    };
  }
  
  return { isValid: true };
}
```

### 2.5 精算残高計算

```typescript
interface SettlementBalance {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

function calculateSettlementBalance(
  transactions: Transaction[],
  splits: TransactionSplit[]
): SettlementBalance[] {
  // 各ユーザー間の貸し借りを集計
  const balances: Record<string, Record<string, number>> = {};
  
  for (const transaction of transactions) {
    if (!transaction.isShared) continue;
    
    const transactionSplits = splits.filter(
      s => s.transactionId === transaction.id && !s.isSettled
    );
    
    for (const split of transactionSplits) {
      if (split.userId === transaction.paidBy) continue;
      
      // split.userId は transaction.paidBy に split.amount を借りている
      const debtor = split.userId;
      const creditor = transaction.paidBy;
      
      if (!balances[debtor]) balances[debtor] = {};
      if (!balances[debtor][creditor]) balances[debtor][creditor] = 0;
      
      balances[debtor][creditor] += split.amount;
    }
  }
  
  // 相殺処理
  const result: SettlementBalance[] = [];
  const processed = new Set<string>();
  
  for (const debtor of Object.keys(balances)) {
    for (const creditor of Object.keys(balances[debtor])) {
      const key = [debtor, creditor].sort().join('-');
      if (processed.has(key)) continue;
      processed.add(key);
      
      const debtorOwes = balances[debtor]?.[creditor] ?? 0;
      const creditorOwes = balances[creditor]?.[debtor] ?? 0;
      const netAmount = debtorOwes - creditorOwes;
      
      if (Math.abs(netAmount) > 0.01) {
        result.push({
          fromUserId: netAmount > 0 ? debtor : creditor,
          toUserId: netAmount > 0 ? creditor : debtor,
          amount: Math.abs(netAmount),
        });
      }
    }
  }
  
  return result;
}
```

### 2.6 精算記録処理

```typescript
async function recordSettlement(
  settlement: {
    groupId: string;
    fromUserId: string;
    toUserId: string;
    amount: number;
    settledAt: string;
    method?: string;
    note?: string;
  }
): Promise<void> {
  // トランザクション内で実行
  
  // 1. 精算レコードを作成
  await db.settlements.insert(settlement);
  
  // 2. 関連する transaction_splits を精算済みに更新
  //    （fromUserId が負担者で、toUserId が支払者の取引）
  await db.transactionSplits
    .update({ is_settled: true, settled_at: settlement.settledAt })
    .where({
      user_id: settlement.fromUserId,
      transaction_id: { 
        in: transactions.where({ 
          paid_by: settlement.toUserId,
          is_shared: true 
        }).select('id')
      },
      is_settled: false,
    });
}
```

---

## 3. 予算管理機能

### 3.1 予算種類

| 種類 | 説明 |
|------|------|
| 全体予算 | category_id = null、月全体の支出上限 |
| カテゴリ予算 | 特定カテゴリの月次予算 |

### 3.2 予算使用率計算

```typescript
interface BudgetStatus {
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  usagePercent: number;
  status: 'normal' | 'warning' | 'danger';
}

function calculateBudgetStatus(
  budget: Budget,
  transactions: Transaction[]
): BudgetStatus {
  const spentAmount = transactions
    .filter(t => 
      t.type === 'expense' &&
      (budget.categoryId === null || t.categoryId === budget.categoryId)
    )
    .reduce((sum, t) => sum + t.amount, 0);
  
  const remainingAmount = budget.amount - spentAmount;
  const usagePercent = (spentAmount / budget.amount) * 100;
  
  let status: 'normal' | 'warning' | 'danger';
  if (usagePercent >= 100) {
    status = 'danger';
  } else if (usagePercent >= 80) {
    status = 'warning';
  } else {
    status = 'normal';
  }
  
  return {
    budgetAmount: budget.amount,
    spentAmount,
    remainingAmount,
    usagePercent,
    status,
  };
}
```

### 3.3 予算アラート条件

| 条件 | 表示 | 色 |
|------|------|-----|
| 使用率 < 80% | 表示なし | - |
| 80% ≤ 使用率 < 100% | 「{カテゴリ}: 予算の{N}%」 | warning (#F59E0B) |
| 使用率 ≥ 100% | 「{カテゴリ}: 予算超過」 | danger (#EF4444) |

### 3.4 繰越計算

```typescript
interface CarryOverResult {
  previousRemaining: number;
  newBudget: number;
  totalBudget: number;
}

function calculateCarryOver(
  previousBudget: Budget,
  previousSpent: number,
  newBudgetAmount: number
): CarryOverResult {
  const previousRemaining = previousBudget.amount - previousSpent;
  
  // 残額がマイナス（超過）の場合
  if (previousRemaining < 0 && !previousBudget.carryOver) {
    // 繰越OFFの場合はリセット
    return {
      previousRemaining: 0,
      newBudget: newBudgetAmount,
      totalBudget: newBudgetAmount,
    };
  }
  
  return {
    previousRemaining,
    newBudget: newBudgetAmount,
    totalBudget: newBudgetAmount + previousRemaining,
  };
}
```

### 3.5 予算コピー機能

```typescript
async function copyBudgetsToNextMonth(
  groupId: string,
  sourceMonth: string,  // YYYY-MM
  targetMonth: string   // YYYY-MM
): Promise<void> {
  // 元の月の予算を取得
  const sourceBudgets = await getBudgets(groupId, sourceMonth);
  
  // 新しい月の予算として複製
  const newBudgets = sourceBudgets.map(budget => ({
    group_id: groupId,
    category_id: budget.categoryId,
    year_month: targetMonth,
    amount: budget.amount,
    carry_over: budget.carryOver,
  }));
  
  // Upsert（既存があれば更新）
  await db.budgets.upsert(newBudgets, {
    onConflict: ['group_id', 'category_id', 'year_month'],
  });
}
```

---

## 4. 目標トラッカー機能

### 4.1 目標種類

| 種類 | 説明 | 進捗計算 |
|------|------|---------|
| savings | 貯金目標 | 手動入金の累計 |
| spending_limit | 支出上限 | 対象カテゴリの支出累計 |

### 4.2 進捗計算

```typescript
interface GoalProgress {
  currentAmount: number;
  targetAmount: number;
  progressPercent: number;
  remainingAmount: number;
  isAchieved: boolean;
  daysRemaining: number | null;
  projectedCompletion: Date | null;
}

function calculateGoalProgress(
  goal: Goal,
  contributions: GoalContribution[],
  transactions: Transaction[]
): GoalProgress {
  let currentAmount: number;
  
  if (goal.type === 'savings') {
    // 貯金目標: 入金の累計
    currentAmount = contributions
      .filter(c => c.goalId === goal.id)
      .reduce((sum, c) => sum + c.amount, 0);
  } else {
    // 支出上限: 対象カテゴリの支出累計
    currentAmount = transactions
      .filter(t => 
        t.type === 'expense' &&
        t.categoryId === goal.categoryId &&
        t.date >= goal.startDate &&
        (!goal.endDate || t.date <= goal.endDate)
      )
      .reduce((sum, t) => sum + t.amount, 0);
  }
  
  const progressPercent = (currentAmount / goal.targetAmount) * 100;
  const remainingAmount = goal.targetAmount - currentAmount;
  
  // 貯金目標の場合: 100%達成で完了
  // 支出上限の場合: 100%超過で失敗（期間終了まで継続）
  const isAchieved = goal.type === 'savings' 
    ? progressPercent >= 100
    : false;  // 支出上限は期間終了時に判定
  
  // 残り日数
  let daysRemaining: number | null = null;
  if (goal.endDate) {
    const today = new Date();
    const endDate = new Date(goal.endDate);
    daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  }
  
  // 予測完了日（貯金目標のみ）
  let projectedCompletion: Date | null = null;
  if (goal.type === 'savings' && !isAchieved && currentAmount > 0) {
    const daysSinceStart = Math.ceil(
      (Date.now() - new Date(goal.startDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    const dailyRate = currentAmount / daysSinceStart;
    const daysToComplete = remainingAmount / dailyRate;
    projectedCompletion = new Date(Date.now() + daysToComplete * 24 * 60 * 60 * 1000);
  }
  
  return {
    currentAmount,
    targetAmount: goal.targetAmount,
    progressPercent,
    remainingAmount,
    isAchieved,
    daysRemaining,
    projectedCompletion,
  };
}
```

### 4.3 毎月リセット処理（recurring目標）

```typescript
// 月初に実行するバッチ処理
async function resetRecurringGoals(): Promise<void> {
  const recurringGoals = await db.goals
    .select()
    .where({ is_recurring: true, is_achieved: false });
  
  for (const goal of recurringGoals) {
    if (goal.type === 'spending_limit') {
      // 支出上限: 新しい月の開始
      // 前月の結果を記録（オプション）
      // current_amount はそのまま（支出は累計で計算）
    }
    // 貯金目標のリセットは通常不要
  }
}
```

---

## 5. 検索・フィルタ機能

### 5.1 検索対象フィールド

| フィールド | 検索方法 |
|-----------|---------|
| memo | 部分一致（ILIKE） |
| category.name | 部分一致（ILIKE） |

### 5.2 フィルタ条件

| フィルタ | 演算子 | 複数選択 |
|---------|--------|---------|
| 期間 | date >= start AND date <= end | - |
| カテゴリ | category_id IN (...) | ✓ |
| メンバー | paid_by IN (...) | ✓ |
| 種別 | type = 'expense' / 'income' | - |
| 共有 | is_shared = true / false | - |
| 金額範囲 | amount >= min AND amount <= max | - |

### 5.3 クエリビルダー

```typescript
function buildTransactionQuery(filters: FilterParams): QueryBuilder {
  let query = db.transactions.select('*');
  
  // 必須: グループID
  query = query.where('group_id', '=', filters.groupId);
  
  // 期間
  if (filters.startDate) {
    query = query.where('date', '>=', filters.startDate);
  }
  if (filters.endDate) {
    query = query.where('date', '<=', filters.endDate);
  }
  
  // カテゴリ
  if (filters.categoryIds?.length) {
    query = query.where('category_id', 'in', filters.categoryIds);
  }
  
  // メンバー
  if (filters.memberIds?.length) {
    query = query.where('paid_by', 'in', filters.memberIds);
  }
  
  // 種別
  if (filters.type && filters.type !== 'all') {
    query = query.where('type', '=', filters.type);
  }
  
  // 共有
  if (filters.shared !== undefined) {
    query = query.where('is_shared', '=', filters.shared);
  }
  
  // 金額範囲
  if (filters.minAmount !== undefined) {
    query = query.where('amount', '>=', filters.minAmount);
  }
  if (filters.maxAmount !== undefined) {
    query = query.where('amount', '<=', filters.maxAmount);
  }
  
  // キーワード検索
  if (filters.query) {
    query = query.where('memo', 'ilike', `%${filters.query}%`);
  }
  
  // ソート
  query = query.orderBy(filters.sortBy ?? 'date', filters.sortOrder ?? 'desc');
  
  return query;
}
```

---

## 6. レポート・統計機能

### 6.1 月次サマリー

```typescript
interface MonthlySummary {
  yearMonth: string;
  totalExpense: number;
  totalIncome: number;
  balance: number;
  transactionCount: number;
  categoryBreakdown: CategoryStat[];
  memberBreakdown: MemberStat[];
  dailyTrend: DailyStat[];
}
```

### 6.2 カテゴリ別統計

```typescript
interface CategoryStat {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  amount: number;
  percentage: number;  // 全体に対する割合
  count: number;
  budgetAmount: number | null;
  budgetUsage: number | null;
}

function calculateCategoryStats(
  transactions: Transaction[],
  categories: Category[],
  budgets: Budget[]
): CategoryStat[] {
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  return categories.map(category => {
    const categoryTransactions = transactions.filter(
      t => t.categoryId === category.id && t.type === 'expense'
    );
    const amount = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
    const budget = budgets.find(b => b.categoryId === category.id);
    
    return {
      categoryId: category.id,
      categoryName: category.name,
      categoryIcon: category.icon,
      categoryColor: category.color,
      amount,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
      count: categoryTransactions.length,
      budgetAmount: budget?.amount ?? null,
      budgetUsage: budget ? (amount / budget.amount) * 100 : null,
    };
  }).sort((a, b) => b.amount - a.amount);
}
```

### 6.3 前月比計算

```typescript
interface MonthComparison {
  currentMonth: number;
  previousMonth: number;
  difference: number;
  percentChange: number;
  trend: 'up' | 'down' | 'same';
}

function calculateMonthComparison(
  currentTransactions: Transaction[],
  previousTransactions: Transaction[]
): MonthComparison {
  const current = currentTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const previous = previousTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const difference = current - previous;
  const percentChange = previous > 0 
    ? ((current - previous) / previous) * 100 
    : 0;
  
  let trend: 'up' | 'down' | 'same';
  if (Math.abs(percentChange) < 1) {
    trend = 'same';
  } else if (difference > 0) {
    trend = 'up';
  } else {
    trend = 'down';
  }
  
  return {
    currentMonth: current,
    previousMonth: previous,
    difference,
    percentChange,
    trend,
  };
}
```

---

## 7. CSVエクスポート機能

### 7.1 エクスポート形式

```csv
日付,種別,カテゴリ,金額,メモ,支払者,共有,負担内訳
2025-01-15,expense,食費,3500,スーパー,田中,true,"田中:1750,鈴木:1750"
2025-01-14,expense,光熱費,8000,電気代,鈴木,true,"田中:4000,鈴木:4000"
2025-01-13,income,給与,250000,1月給与,田中,false,""
```

### 7.2 エクスポートカラム

| カラム名 | 説明 |
|---------|------|
| 日付 | YYYY-MM-DD形式 |
| 種別 | expense / income |
| カテゴリ | カテゴリ名 |
| 金額 | 数値 |
| メモ | メモ（カンマはエスケープ） |
| 支払者 | 支払者の表示名 |
| 共有 | true / false |
| 負担内訳 | "名前:金額" のカンマ区切り |

---

## 8. 通知機能

### 8.1 通知種類

| 種類 | トリガー | 内容 |
|------|---------|------|
| input_reminder | 設定時刻（毎日） | 「今日の支出を記録しましょう」 |
| budget_warning | 予算80%到達時 | 「{カテゴリ}が予算の80%に達しました」 |
| budget_exceeded | 予算100%超過時 | 「{カテゴリ}が予算を超過しました」 |
| partner_transaction | パートナーが取引登録時 | 「{名前}が{金額}の支出を登録しました」 |
| settlement_reminder | 精算残高が一定額以上 | 「精算残高が{金額}になりました」 |
| goal_achieved | 目標達成時 | 「目標「{名前}」を達成しました！」 |

### 8.2 通知設定

```typescript
interface NotificationSettings {
  reminderEnabled: boolean;
  reminderTime: string | null;  // HH:mm
  budgetAlertEnabled: boolean;
  partnerNotificationEnabled: boolean;
  settlementReminderEnabled: boolean;
  settlementThreshold: number;  // この金額以上で通知
}
```

---

*最終更新: 2025年1月*
