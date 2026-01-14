# 画面別データフロー設計

## 概要

本ドキュメントでは、各画面コンポーネントがどのフック/サービス/ストアを使用してデータを取得・表示するかを定義します。

---

## 1. データフローアーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│                      Screen Component                           │
│  (Home.tsx, Calendar.tsx, Reports.tsx, etc.)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐
│  Zustand Store  │ │  TanStack Query │ │   Direct Service Call   │
│  (Client State) │ │  (Server State) │ │   (One-time fetch)      │
└────────┬────────┘ └────────┬────────┘ └────────────┬────────────┘
         │                   │                       │
         │                   ▼                       │
         │          ┌─────────────────┐              │
         │          │    Services     │              │
         │          │ (API Wrapper)   │◄─────────────┘
         │          └────────┬────────┘
         │                   │
         │                   ▼
         │          ┌─────────────────┐
         │          │    Supabase     │
         │          │   (Database)    │
         │          └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      UI Rendering                               │
│         (データ変換、フォーマット、条件付き表示)                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 画面別データソースマッピング

### 2.1 Home画面 (`/screens/Home.tsx`)

| セクション | データ | ソース | フック/ストア |
|-----------|--------|--------|--------------|
| ヘッダー - グループ名 | `currentGroup.name` | Zustand | `useAppStore()` |
| ヘッダー - 表示月 | `selectedMonth` | Zustand | `useAppStore()` |
| Total Expenses Card | `totalExpense`, `budgetRemaining` | TanStack Query | `useMonthlySummary(groupId, yearMonth)` |
| Settlement Card | `SettlementBalance[]` | TanStack Query | `useSettlementBalance(groupId)` |
| Alerts / Chips | `CategoryStat[]` | TanStack Query | `useCategoryStats(groupId, yearMonth)` |
| Recent Activity | `TransactionWithDetails[]` | TanStack Query | `useTransactions(groupId)` ※最新5件 |

#### データフロー図

```
Home.tsx
├── useAppStore() ─────────────────┬── currentGroupId
│                                  ├── currentGroup.name
│                                  └── selectedMonth
│
├── useMonthlySummary(groupId, yearMonth)
│   └── statsService.getMonthlySummary()
│       └── { totalExpense, totalIncome, totalBudget, budgetRemaining, ... }
│
├── useSettlementBalance(groupId)
│   └── settlementService.getSettlementBalance()
│       └── SettlementBalance[] { fromUserId, toUserId, amount, ... }
│
├── useCategoryStats(groupId, yearMonth)
│   └── statsService.getCategoryStats()
│       └── CategoryStat[] { amount, budgetAmount, ... }
│
└── useTransactions(groupId) ─ 最新5件
    └── transactionService.getTransactions({ limit: 5 })
        └── TransactionWithDetails[]
```

### 2.2 Calendar画面 (`/screens/Calendar.tsx`)

| セクション | データ | ソース | フック/ストア |
|-----------|--------|--------|--------------|
| カレンダー表示 | 日別取引サマリー | TanStack Query | `useDailyTrend(groupId, yearMonth)` |
| 日付選択時の取引一覧 | `TransactionWithDetails[]` | TanStack Query | `useTransactions(groupId)` + dateRange filter |

### 2.3 Reports画面 (`/screens/Reports.tsx`)

| セクション | データ | ソース | フック/ストア |
|-----------|--------|--------|--------------|
| 月次サマリー | `MonthlySummary` | TanStack Query | `useMonthlySummary(groupId, yearMonth)` |
| カテゴリ別グラフ | `CategoryStat[]` | TanStack Query | `useCategoryStats(groupId, yearMonth)` |
| 日別推移グラフ | `DailyTrend[]` | TanStack Query | `useDailyTrend(groupId, yearMonth)` |

### 2.4 Budget画面 (`/screens/Budget.tsx`)

| セクション | データ | ソース | フック/ストア |
|-----------|--------|--------|--------------|
| 予算一覧 | `Budget[]` | TanStack Query | `useBudgets(groupId, yearMonth)` |
| 使用状況 | `CategoryStat[]` | TanStack Query | `useCategoryStats(groupId, yearMonth)` |

### 2.5 Settlement画面 (`/screens/Settlement.tsx`)

| セクション | データ | ソース | フック/ストア |
|-----------|--------|--------|--------------|
| 精算残高 | `SettlementBalance[]` | TanStack Query | `useSettlementBalance(groupId)` |
| 精算履歴 | `SettlementWithUsers[]` | TanStack Query | `useSettlementHistory(groupId)` |
| グループメンバー | `GroupMember[]` | TanStack Query | `useMembers(groupId)` |

### 2.6 History画面 (`/screens/History.tsx`)

| セクション | データ | ソース | フック/ストア |
|-----------|--------|--------|--------------|
| 取引一覧 | `TransactionWithDetails[]` | TanStack Query | `useTransactions(groupId)` |
| フィルター条件 | `FilterState` | Zustand | `useFilterStore()` |

### 2.7 Settings画面 (`/screens/Settings.tsx`)

| セクション | データ | ソース | フック/ストア |
|-----------|--------|--------|--------------|
| ユーザー情報 | `User` | Zustand | `useAuthStore()` |
| グループ情報 | `Group` | TanStack Query | `useGroup(groupId)` |
| 設定値 | `UserSettings` | TanStack Query | `useUserSettings(userId)` |

---

## 3. 日付フォーマットルール

### 3.1 相対日付表示

取引やアクティビティの日付表示には、以下のルールを適用：

| 条件 | 表示形式 | 例 |
|------|---------|-----|
| 今日 | "Today" | Today |
| 昨日 | "Yesterday" | Yesterday |
| 今年の日付 | "MMM d" | Jan 12 |
| 昨年以前 | "MMM d, yyyy" | Jan 12, 2025 |

### 3.2 フォーマット関数

```typescript
// src/lib/utils.ts に追加

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // 日付のみで比較（時刻を無視）
  const isToday = isSameDay(date, today);
  const isYesterday = isSameDay(date, yesterday);
  const isThisYear = date.getFullYear() === today.getFullYear();
  
  if (isToday) {
    return 'Today';
  }
  if (isYesterday) {
    return 'Yesterday';
  }
  if (isThisYear) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    // "Jan 12"
  }
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
  // "Jan 12, 2025"
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}
```

### 3.3 月表示フォーマット

ヘッダーの月表示には以下のフォーマットを使用：

```typescript
export function formatMonthDisplay(yearMonth: string): string {
  // yearMonth: "2026-01"
  const [year, month] = yearMonth.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });
  // "January 2026"
}
```

---

## 4. 金額フォーマットルール

### 4.1 表示形式

| 種類 | 形式 | 例 |
|------|------|-----|
| 支出 | "-¥{amount}" | -¥4,500 |
| 収入 | "+¥{amount}" | +¥50,000 |
| 残高（正） | "¥{amount}" | ¥55,000 |
| 残高（負） | "-¥{amount}" | -¥5,000 |

### 4.2 フォーマット関数

```typescript
export function formatCurrency(
  amount: number, 
  options?: { 
    showSign?: boolean;
    type?: 'expense' | 'income' | 'balance';
  }
): string {
  const { showSign = false, type = 'balance' } = options || {};
  
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(absAmount);
  
  if (showSign) {
    if (type === 'expense' || amount < 0) {
      return `-${formatted}`;
    }
    if (type === 'income' || amount > 0) {
      return `+${formatted}`;
    }
  }
  
  return amount < 0 ? `-${formatted}` : formatted;
}
```

---

## 5. ローディング・エラー状態の表示パターン

### 5.1 ローディング状態

各画面では、データ取得中に適切なローディング表示を行う：

```tsx
// スケルトンローディングパターン
function HomeScreen() {
  const { data: summary, isLoading: isSummaryLoading } = useMonthlySummary(...);
  const { data: transactions, isLoading: isTransactionsLoading } = useTransactions(...);
  
  return (
    <div>
      {/* Total Expenses Card */}
      {isSummaryLoading ? (
        <div className="animate-pulse bg-gray-200 h-32 rounded-2xl" />
      ) : (
        <TotalExpensesCard data={summary} />
      )}
      
      {/* Recent Activity */}
      {isTransactionsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-gray-200 h-16 rounded-xl" />
          ))}
        </div>
      ) : (
        <RecentActivity transactions={transactions} />
      )}
    </div>
  );
}
```

### 5.2 エラー状態

```tsx
// エラー表示パターン
function HomeScreen() {
  const { data, error, refetch } = useMonthlySummary(...);
  
  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500 mb-2">データの取得に失敗しました</p>
        <button onClick={() => refetch()} className="text-primary">
          再試行
        </button>
      </div>
    );
  }
  
  // ...
}
```

### 5.3 空状態

```tsx
// 空状態パターン
function RecentActivity({ transactions }: { transactions: TransactionWithDetails[] }) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">
          receipt_long
        </span>
        <p className="text-gray-500">まだ取引がありません</p>
        <p className="text-sm text-gray-400">
          「+」ボタンから取引を追加しましょう
        </p>
      </div>
    );
  }
  
  return (
    <div>
      {transactions.map(tx => (
        <TransactionItem key={tx.id} transaction={tx} />
      ))}
    </div>
  );
}
```

---

## 6. 現在のユーザー特定ロジック

### 6.1 精算カードでの表示

精算残高から現在のユーザーに関連する情報を抽出する：

```typescript
function getSettlementDisplay(
  balances: SettlementBalance[],
  currentUserId: string
): { type: 'owe' | 'owed' | 'settled'; name: string; amount: number } | null {
  // 現在のユーザーが支払う必要がある残高
  const iOwe = balances.find(b => b.fromUserId === currentUserId);
  if (iOwe) {
    return {
      type: 'owe',
      name: iOwe.toUserName,
      amount: iOwe.amount,
    };
  }
  
  // 現在のユーザーが受け取る残高
  const owedToMe = balances.find(b => b.toUserId === currentUserId);
  if (owedToMe) {
    return {
      type: 'owed',
      name: owedToMe.fromUserName,
      amount: owedToMe.amount,
    };
  }
  
  // 精算済み
  return { type: 'settled', name: '', amount: 0 };
}

// 使用例
const settlementDisplay = getSettlementDisplay(balances, currentUserId);

if (settlementDisplay?.type === 'owe') {
  // "You owe {name} ¥{amount}"
} else if (settlementDisplay?.type === 'owed') {
  // "{name} owes you ¥{amount}"
} else {
  // "All settled up!"
}
```

---

## 7. 予算アラートロジック

### 7.1 アラート条件判定

```typescript
interface BudgetAlert {
  categoryName: string;
  categoryIcon: string;
  usagePercent: number;
  type: 'warning' | 'danger';
}

function getBudgetAlerts(categoryStats: CategoryStat[]): BudgetAlert[] {
  return categoryStats
    .filter(stat => stat.budgetAmount && stat.budgetAmount > 0)
    .map(stat => {
      const usagePercent = (stat.amount / stat.budgetAmount!) * 100;
      if (usagePercent >= 100) {
        return {
          categoryName: stat.categoryName,
          categoryIcon: stat.categoryIcon,
          usagePercent,
          type: 'danger' as const,
        };
      }
      if (usagePercent >= 80) {
        return {
          categoryName: stat.categoryName,
          categoryIcon: stat.categoryIcon,
          usagePercent,
          type: 'warning' as const,
        };
      }
      return null;
    })
    .filter((alert): alert is BudgetAlert => alert !== null)
    .sort((a, b) => b.usagePercent - a.usagePercent);
}
```

---

*最終更新: 2026年1月*
