# 状態管理設計

## 概要

本ドキュメントでは、Zustandを使用したクライアント状態管理の設計を定義します。

---

## 状態の分類

| 分類 | 管理方法 | 例 |
|------|---------|-----|
| サーバー状態 | TanStack Query | 取引一覧、ユーザー情報、予算データ |
| クライアント状態 | Zustand | UI状態、フォーム入力、フィルター条件 |
| URL状態 | React Router | 現在のページ、クエリパラメータ |
| フォーム状態 | React Hook Form or Zustand | 入力フォームの値 |

---

## ストア構成

```
stores/
├── useAuthStore.ts        # 認証状態
├── useAppStore.ts         # アプリ全体のUI状態
├── useTransactionStore.ts # 取引入力フォーム
├── useFilterStore.ts      # 検索・フィルター条件
└── useSettlementStore.ts  # 精算フォーム
```

---

## 1. useAuthStore（認証ストア）

### 状態定義

```typescript
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
```

### 初期状態

```typescript
const initialState = {
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
};
```

### 使用例

```typescript
// コンポーネントでの使用
const { user, isAuthenticated, signOut } = useAuthStore();

// 認証チェック
if (!isAuthenticated) {
  return <Navigate to="/login" />;
}
```

---

## 2. useAppStore（アプリストア）

### 状態定義

```typescript
interface AppState {
  // 現在のグループ
  currentGroupId: string | null;
  currentGroup: Group | null;
  
  // 表示月
  selectedMonth: string; // YYYY-MM
  
  // UI状態
  isBottomSheetOpen: boolean;
  bottomSheetContent: 'add' | 'filter' | 'category' | null;
  
  // トースト
  toast: {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  } | null;
  
  // アクション
  setCurrentGroup: (groupId: string, group: Group) => void;
  setSelectedMonth: (month: string) => void;
  openBottomSheet: (content: 'add' | 'filter' | 'category') => void;
  closeBottomSheet: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  hideToast: () => void;
  reset: () => void;
}
```

### 初期状態

```typescript
const initialState = {
  currentGroupId: null,
  currentGroup: null,
  selectedMonth: formatMonth(new Date()), // 今月
  isBottomSheetOpen: false,
  bottomSheetContent: null,
  toast: null,
};
```

### 使用例

```typescript
// グループ切り替え
const { setCurrentGroup, currentGroup } = useAppStore();

// 月の選択
const { selectedMonth, setSelectedMonth } = useAppStore();

// ボトムシート制御
const { openBottomSheet, closeBottomSheet } = useAppStore();
openBottomSheet('add'); // 取引追加を開く

// トースト表示
const { showToast } = useAppStore();
showToast('保存しました', 'success');
```

---

## 3. useTransactionStore（取引入力ストア）

### 状態定義

```typescript
interface TransactionFormState {
  // フォーム値
  type: 'expense' | 'income';
  amount: string; // 文字列で管理（電卓入力のため）
  date: string; // YYYY-MM-DD
  categoryId: string | null;
  memo: string;
  isShared: boolean;
  
  // 割り勘設定
  paidBy: string | null; // ユーザーID
  splitType: 'equal' | 'percentage' | 'amount';
  splits: TransactionSplitInput[];
  
  // 編集モード
  editingId: string | null;
  
  // バリデーション
  errors: Record<string, string>;
  isValid: boolean;
  
  // アクション
  setType: (type: 'expense' | 'income') => void;
  setAmount: (amount: string) => void;
  appendAmount: (digit: string) => void;
  deleteLastDigit: () => void;
  clearAmount: () => void;
  setDate: (date: string) => void;
  setCategory: (categoryId: string) => void;
  setMemo: (memo: string) => void;
  setIsShared: (isShared: boolean) => void;
  setPaidBy: (userId: string) => void;
  setSplitType: (splitType: 'equal' | 'percentage' | 'amount') => void;
  setSplits: (splits: TransactionSplitInput[]) => void;
  updateSplit: (userId: string, value: number) => void;
  
  // 編集
  loadTransaction: (transaction: Transaction) => void;
  
  // バリデーション
  validate: () => boolean;
  
  // リセット
  reset: () => void;
}

interface TransactionSplitInput {
  userId: string;
  amount: number;
  percentage: number;
}
```

### 初期状態

```typescript
const initialState = {
  type: 'expense',
  amount: '0',
  date: formatDate(new Date()), // 今日
  categoryId: null,
  memo: '',
  isShared: true,
  paidBy: null, // 現在のユーザーIDで初期化
  splitType: 'equal',
  splits: [],
  editingId: null,
  errors: {},
  isValid: false,
};
```

### 電卓入力ロジック

```typescript
// 数字追加
appendAmount: (digit) => {
  set((state) => {
    if (state.amount === '0' && digit !== '.') {
      return { amount: digit };
    }
    if (digit === '.' && state.amount.includes('.')) {
      return state; // 小数点は1つまで
    }
    // 小数点以下2桁まで
    const parts = state.amount.split('.');
    if (parts[1] && parts[1].length >= 2) {
      return state;
    }
    return { amount: state.amount + digit };
  });
},

// 末尾削除
deleteLastDigit: () => {
  set((state) => ({
    amount: state.amount.length > 1 ? state.amount.slice(0, -1) : '0'
  }));
},

// クリア
clearAmount: () => set({ amount: '0' }),
```

### バリデーションロジック

```typescript
validate: () => {
  const state = get();
  const errors: Record<string, string> = {};
  
  // 金額チェック
  const amount = parseFloat(state.amount);
  if (isNaN(amount) || amount <= 0) {
    errors.amount = '金額を入力してください';
  }
  
  // カテゴリチェック（任意：未分類を許容）
  // if (!state.categoryId) {
  //   errors.categoryId = 'カテゴリを選択してください';
  // }
  
  // 割り勘チェック（共有の場合）
  if (state.isShared && state.splits.length > 0) {
    const totalSplit = state.splits.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(totalSplit - amount) > 0.01) {
      errors.splits = '負担額の合計が一致しません';
    }
  }
  
  set({ errors, isValid: Object.keys(errors).length === 0 });
  return Object.keys(errors).length === 0;
},
```

---

## 4. useFilterStore（フィルターストア）

### 状態定義

```typescript
interface FilterState {
  // 検索
  searchQuery: string;
  
  // フィルター条件
  dateRange: {
    start: string | null;
    end: string | null;
  };
  categoryIds: string[];
  memberIds: string[];
  transactionType: 'all' | 'expense' | 'income';
  sharedType: 'all' | 'shared' | 'personal';
  amountRange: {
    min: number | null;
    max: number | null;
  };
  
  // ソート
  sortBy: 'date' | 'amount' | 'category';
  sortOrder: 'asc' | 'desc';
  
  // アクション
  setSearchQuery: (query: string) => void;
  setDateRange: (start: string | null, end: string | null) => void;
  toggleCategory: (categoryId: string) => void;
  toggleMember: (memberId: string) => void;
  setTransactionType: (type: 'all' | 'expense' | 'income') => void;
  setSharedType: (type: 'all' | 'shared' | 'personal') => void;
  setAmountRange: (min: number | null, max: number | null) => void;
  setSortBy: (sortBy: 'date' | 'amount' | 'category') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  
  // フィルター適用
  getFilterParams: () => FilterParams;
  
  // リセット
  reset: () => void;
  resetDateRange: () => void;
}
```

### 初期状態

```typescript
const initialState = {
  searchQuery: '',
  dateRange: {
    start: null,
    end: null,
  },
  categoryIds: [],
  memberIds: [],
  transactionType: 'all',
  sharedType: 'all',
  amountRange: {
    min: null,
    max: null,
  },
  sortBy: 'date',
  sortOrder: 'desc',
};
```

### フィルターパラメータ生成

```typescript
getFilterParams: () => {
  const state = get();
  return {
    q: state.searchQuery || undefined,
    start_date: state.dateRange.start || undefined,
    end_date: state.dateRange.end || undefined,
    category_ids: state.categoryIds.length > 0 ? state.categoryIds : undefined,
    member_ids: state.memberIds.length > 0 ? state.memberIds : undefined,
    type: state.transactionType !== 'all' ? state.transactionType : undefined,
    shared: state.sharedType !== 'all' ? state.sharedType === 'shared' : undefined,
    min_amount: state.amountRange.min ?? undefined,
    max_amount: state.amountRange.max ?? undefined,
    sort_by: state.sortBy,
    sort_order: state.sortOrder,
  };
},
```

---

## 5. useSettlementStore（精算ストア）

### 状態定義

```typescript
interface SettlementState {
  // 精算対象
  fromUserId: string | null;
  toUserId: string | null;
  amount: number;
  
  // 精算詳細
  settledAt: string; // YYYY-MM-DD
  method: string;
  note: string;
  
  // 関連取引
  relatedTransactionIds: string[];
  
  // アクション
  setFromUser: (userId: string) => void;
  setToUser: (userId: string) => void;
  setAmount: (amount: number) => void;
  setSettledAt: (date: string) => void;
  setMethod: (method: string) => void;
  setNote: (note: string) => void;
  setRelatedTransactions: (ids: string[]) => void;
  
  // リセット
  reset: () => void;
}
```

---

## TanStack Query との連携

### クエリキー設計

```typescript
// クエリキーファクトリ
export const queryKeys = {
  // ユーザー
  user: ['user'] as const,
  
  // グループ
  groups: ['groups'] as const,
  group: (id: string) => ['groups', id] as const,
  groupMembers: (groupId: string) => ['groups', groupId, 'members'] as const,
  
  // 取引
  transactions: (groupId: string, filters?: FilterParams) => 
    ['transactions', groupId, filters] as const,
  transaction: (id: string) => ['transactions', 'detail', id] as const,
  
  // カテゴリ
  categories: (groupId: string) => ['categories', groupId] as const,
  
  // 予算
  budgets: (groupId: string, yearMonth: string) => 
    ['budgets', groupId, yearMonth] as const,
  
  // 目標
  goals: (groupId: string) => ['goals', groupId] as const,
  
  // 精算残高
  settlementBalance: (groupId: string) => 
    ['settlement-balance', groupId] as const,
  
  // 統計
  monthlyStats: (groupId: string, yearMonth: string) => 
    ['stats', 'monthly', groupId, yearMonth] as const,
  categoryStats: (groupId: string, yearMonth: string) =>
    ['stats', 'category', groupId, yearMonth] as const,
};
```

### カスタムフック例

```typescript
// 取引一覧フック
export function useTransactions(groupId: string) {
  const filters = useFilterStore((state) => state.getFilterParams());
  
  return useQuery({
    queryKey: queryKeys.transactions(groupId, filters),
    queryFn: () => transactionService.getAll(groupId, filters),
    enabled: !!groupId,
  });
}

// 取引作成フック
export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { currentGroupId } = useAppStore();
  const { showToast } = useAppStore();
  
  return useMutation({
    mutationFn: transactionService.create,
    onSuccess: () => {
      // 取引リストを無効化（フィルタ付きクエリも含む）
      queryClient.invalidateQueries({
        queryKey: ['transactions', 'list', currentGroupId],
      });
      // 統計データを無効化（Home画面の集計に反映）
      queryClient.invalidateQueries({
        queryKey: ['stats'],
        predicate: (query) => query.queryKey[2] === currentGroupId,
      });
      // 精算残高を無効化（Home画面のSettlementカードに反映）
      queryClient.invalidateQueries({
        queryKey: queryKeys.settlementBalance(currentGroupId!),
      });
      showToast('保存しました', 'success');
    },
    onError: (error) => {
      showToast('保存に失敗しました', 'error');
    },
  });
}
```

---

## キャッシュ無効化戦略

### 取引変更時の関連キャッシュ無効化

取引を作成・更新・削除した際は、以下のすべてのキャッシュを無効化する必要があります：

| キャッシュ | 理由 | 影響する画面 |
|-----------|------|-------------|
| `['transactions', 'list', groupId]` | 取引一覧の更新 | History, Home（Recent Activity） |
| `['stats', *, groupId, *]` | 統計の再計算 | Home（Total Expenses, Budget） |
| `['settlement', 'balance', groupId]` | 精算残高の再計算 | Home（Settlement Card）, Settlement |

```typescript
// 取引変更時の無効化パターン
const invalidateRelatedCaches = (queryClient: QueryClient, groupId: string) => {
  // 取引リストを無効化（フィルタ付きクエリも含む）
  queryClient.invalidateQueries({
    queryKey: ['transactions', 'list', groupId],
  });
  // 統計データを無効化
  queryClient.invalidateQueries({
    queryKey: ['stats'],
    predicate: (query) => query.queryKey[2] === groupId,
  });
  // 精算残高を無効化
  queryClient.invalidateQueries({
    queryKey: ['settlement', 'balance', groupId],
  });
};
```

### 注意点

- `queryKey` を直接配列で指定する際は、**部分一致**でマッチングされます
- `predicate` を使用すると、より柔軟な条件でキャッシュを無効化できます
- 統計データは月ごとにキャッシュされるため、`groupId` でフィルタして無効化します

---

## 永続化（Persist）

### ローカルストレージへの永続化

```typescript
import { persist } from 'zustand/middleware';

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ... state and actions
    }),
    {
      name: 'app-store',
      partialize: (state) => ({
        // 永続化する項目を選択
        currentGroupId: state.currentGroupId,
        selectedMonth: state.selectedMonth,
      }),
    }
  )
);
```

### フィルターの永続化

```typescript
export const useFilterStore = create<FilterState>()(
  persist(
    (set, get) => ({
      // ... state and actions
    }),
    {
      name: 'filter-store',
      partialize: (state) => ({
        // ソート設定のみ永続化
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
      }),
    }
  )
);
```

---

## DevTools統合

```typescript
import { devtools } from 'zustand/middleware';

export const useTransactionStore = create<TransactionFormState>()(
  devtools(
    (set, get) => ({
      // ... state and actions
    }),
    { name: 'TransactionStore' }
  )
);
```

---

## 状態フロー図

```
┌──────────────────────────────────────────────────────────────┐
│                      User Action                              │
│                  (ボタンクリック、入力等)                      │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    Zustand Store                              │
│              (状態更新、バリデーション)                        │
└──────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────┐
│   UI State Updated      │     │   Trigger API Call          │
│   (即座にUI反映)         │     │   (TanStack Query)          │
└─────────────────────────┘     └──────────────┬──────────────┘
                                               │
                                               ▼
                              ┌─────────────────────────────┐
                              │      Supabase API           │
                              └──────────────┬──────────────┘
                                             │
                                             ▼
                              ┌─────────────────────────────┐
                              │   Cache Update / Refetch    │
                              │   (自動的にUIに反映)         │
                              └─────────────────────────────┘
```

---

*最終更新: 2025年1月*
