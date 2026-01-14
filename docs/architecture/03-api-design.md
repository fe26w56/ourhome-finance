# API設計

## 概要

本ドキュメントでは、Supabaseを使用したAPI設計を定義します。
Supabaseは自動生成されたRESTful APIとリアルタイム機能を提供します。

---

## API構成

```
Supabase API
├── REST API（自動生成）    ← CRUD操作
├── Realtime              ← リアルタイム同期
├── Auth API              ← 認証
├── Storage API           ← ファイルストレージ
└── Edge Functions        ← カスタムロジック（必要に応じて）
```

---

## 認証API

### サインアップ

```typescript
// POST /auth/v1/signup
interface SignUpRequest {
  email: string;
  password: string;
  data?: {
    display_name: string;
  };
}

interface SignUpResponse {
  user: User;
  session: Session | null;
}
```

### サインイン

```typescript
// POST /auth/v1/token?grant_type=password
interface SignInRequest {
  email: string;
  password: string;
}

interface SignInResponse {
  user: User;
  session: Session;
  access_token: string;
  refresh_token: string;
}
```

### OAuthサインイン

```typescript
// GET /auth/v1/authorize?provider=google
// サポートプロバイダー: google, apple, github
```

### サインアウト

```typescript
// POST /auth/v1/logout
// Headers: Authorization: Bearer <access_token>
```

### パスワードリセット

```typescript
// POST /auth/v1/recover
interface PasswordResetRequest {
  email: string;
}
```

---

## REST API エンドポイント

### 共通仕様

- **ベースURL**: `https://<project>.supabase.co/rest/v1`
- **認証**: `Authorization: Bearer <access_token>`
- **APIキー**: `apikey: <anon_key>` (ヘッダー)
- **Content-Type**: `application/json`

### レスポンス形式

```typescript
// 成功時
interface SuccessResponse<T> {
  data: T;
}

// エラー時
interface ErrorResponse {
  error: {
    message: string;
    code: string;
    details?: string;
  };
}
```

---

## 1. Users API

### ユーザー情報取得

```
GET /users?id=eq.{user_id}
```

**レスポンス**:
```typescript
interface UserResponse {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}
```

### ユーザー情報更新

```
PATCH /users?id=eq.{user_id}
```

**リクエストボディ**:
```typescript
interface UpdateUserRequest {
  display_name?: string;
  avatar_url?: string;
}
```

---

## 2. Groups API

### グループ一覧取得（自分が所属）

```
GET /groups?select=*,group_members!inner(user_id)&group_members.user_id=eq.{user_id}
```

### グループ作成

```
POST /groups
```

**リクエストボディ**:
```typescript
interface CreateGroupRequest {
  name: string;
  currency?: string; // default: 'JPY'
  month_start_day?: number; // default: 1
}
```

**レスポンス**:
```typescript
interface GroupResponse {
  id: string;
  name: string;
  currency: string;
  month_start_day: number;
  invite_code: string;
  created_by: string;
  created_at: string;
}
```

### グループ詳細取得

```
GET /groups?id=eq.{group_id}&select=*,group_members(*)
```

### グループ更新

```
PATCH /groups?id=eq.{group_id}
```

### 招待コード再生成

```
POST /rpc/regenerate_invite_code
```

**リクエストボディ**:
```typescript
interface RegenerateInviteCodeRequest {
  group_id: string;
}
```

### グループ参加（招待コード）

```
POST /rpc/join_group
```

**リクエストボディ**:
```typescript
interface JoinGroupRequest {
  invite_code: string;
}
```

---

## 3. Group Members API

### メンバー一覧取得

```
GET /group_members?group_id=eq.{group_id}&select=*,users(*)
```

### メンバー追加（招待承認後）

```
POST /group_members
```

**リクエストボディ**:
```typescript
interface AddMemberRequest {
  group_id: string;
  user_id: string;
  role?: 'member' | 'viewer'; // default: 'member'
  nickname?: string;
  color?: string;
}
```

### メンバー更新（権限変更等）

```
PATCH /group_members?id=eq.{member_id}
```

**リクエストボディ**:
```typescript
interface UpdateMemberRequest {
  role?: 'admin' | 'member' | 'viewer';
  nickname?: string;
  color?: string;
}
```

### メンバー削除（退会）

```
DELETE /group_members?id=eq.{member_id}
```

---

## 4. Categories API

### カテゴリ一覧取得

```
GET /categories?group_id=eq.{group_id}&is_active=eq.true&order=sort_order.asc
```

### カテゴリ作成

```
POST /categories
```

**リクエストボディ**:
```typescript
interface CreateCategoryRequest {
  group_id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income' | 'both';
  sort_order?: number;
}
```

### カテゴリ更新

```
PATCH /categories?id=eq.{category_id}
```

### カテゴリ削除（論理削除）

```
PATCH /categories?id=eq.{category_id}
```

**リクエストボディ**:
```typescript
{ "is_active": false }
```

### カテゴリ並び替え

```
POST /rpc/reorder_categories
```

**リクエストボディ**:
```typescript
interface ReorderCategoriesRequest {
  category_orders: Array<{
    id: string;
    sort_order: number;
  }>;
}
```

---

## 5. Transactions API

### 取引一覧取得

```
GET /transactions?group_id=eq.{group_id}&date=gte.{start}&date=lte.{end}&order=date.desc,created_at.desc&select=*,categories(*),users!paid_by(*),transaction_splits(*)
```

**クエリパラメータ**:
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| group_id | string | グループID（必須） |
| date | string | 日付範囲（gte/lte） |
| category_id | string | カテゴリフィルタ（in） |
| type | string | 種別（eq） |
| is_shared | boolean | 共有フラグ（eq） |
| paid_by | string | 支払者フィルタ（eq） |
| memo | string | メモ検索（ilike） |
| amount | number | 金額範囲（gte/lte） |
| limit | number | 取得件数 |
| offset | number | オフセット |

### 取引詳細取得

```
GET /transactions?id=eq.{transaction_id}&select=*,categories(*),users!paid_by(*),transaction_splits(*,users(*))
```

### 取引作成

```
POST /transactions
```

**リクエストボディ**:
```typescript
interface CreateTransactionRequest {
  group_id: string;
  category_id: string;
  type: 'expense' | 'income';
  amount: number;
  date: string; // YYYY-MM-DD
  memo?: string;
  is_shared: boolean;
  paid_by: string;
  receipt_url?: string;
}
```

### 取引作成（分割込み）

```
POST /rpc/create_transaction_with_splits
```

**リクエストボディ**:
```typescript
interface CreateTransactionWithSplitsRequest {
  transaction: CreateTransactionRequest;
  splits: Array<{
    user_id: string;
    amount: number;
    percentage?: number;
  }>;
}
```

### 取引更新

```
PATCH /transactions?id=eq.{transaction_id}
```

### 取引削除

```
DELETE /transactions?id=eq.{transaction_id}
```

**注意**: 関連する `transaction_splits` も CASCADE で削除

---

## 6. Transaction Splits API

### 分割情報取得

```
GET /transaction_splits?transaction_id=eq.{transaction_id}&select=*,users(*)
```

### 分割情報更新

```
PATCH /transaction_splits?transaction_id=eq.{transaction_id}
```

---

## 7. Budgets API

### 予算一覧取得

```
GET /budgets?group_id=eq.{group_id}&year_month=eq.{YYYY-MM}&select=*,categories(*)
```

### 予算設定（Upsert）

```
POST /budgets
Headers: Prefer: resolution=merge-duplicates
```

**リクエストボディ**:
```typescript
interface UpsertBudgetRequest {
  group_id: string;
  category_id: string | null; // null = 全体予算
  year_month: string;
  amount: number;
  carry_over?: boolean;
}
```

### 予算削除

```
DELETE /budgets?id=eq.{budget_id}
```

### 予算コピー（翌月へ）

```
POST /rpc/copy_budgets_to_next_month
```

**リクエストボディ**:
```typescript
interface CopyBudgetsRequest {
  group_id: string;
  source_month: string; // YYYY-MM
  target_month: string; // YYYY-MM
}
```

---

## 8. Goals API

### 目標一覧取得

```
GET /goals?group_id=eq.{group_id}&is_achieved=eq.false&select=*,categories(*)
```

### 目標作成

```
POST /goals
```

**リクエストボディ**:
```typescript
interface CreateGoalRequest {
  group_id: string;
  name: string;
  type: 'savings' | 'spending_limit';
  target_amount: number;
  category_id?: string;
  start_date: string;
  end_date?: string;
  is_recurring?: boolean;
}
```

### 目標更新

```
PATCH /goals?id=eq.{goal_id}
```

### 目標への入金

```
POST /goal_contributions
```

**リクエストボディ**:
```typescript
interface AddContributionRequest {
  goal_id: string;
  amount: number;
  date: string;
  note?: string;
}
```

---

## 9. Settlements API

### 精算残高取得

```
GET /rpc/get_settlement_balance
```

**リクエストボディ**:
```typescript
interface GetSettlementBalanceRequest {
  group_id: string;
}
```

**レスポンス**:
```typescript
interface SettlementBalance {
  from_user_id: string;
  from_user_name: string;
  to_user_id: string;
  to_user_name: string;
  amount: number; // from が to に支払うべき金額
}[]
```

### 精算記録

```
POST /rpc/record_settlement
```

**リクエストボディ**:
```typescript
interface RecordSettlementRequest {
  group_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  settled_at: string;
  method?: string;
  note?: string;
}
```

### 精算履歴取得

```
GET /settlements?group_id=eq.{group_id}&order=settled_at.desc&select=*,users!from_user_id(*),users!to_user_id(*)
```

---

## 10. Statistics API（RPC関数）

### 月次サマリー

```
POST /rpc/get_monthly_summary
```

**リクエストボディ**:
```typescript
interface GetMonthlySummaryRequest {
  group_id: string;
  year_month: string;
}
```

**レスポンス**:
```typescript
interface MonthlySummary {
  total_expense: number;
  total_income: number;
  total_budget: number;
  budget_remaining: number;
  transaction_count: number;
  prev_month_expense: number;
  expense_diff_percent: number;
}
```

### カテゴリ別統計

```
POST /rpc/get_category_stats
```

**リクエストボディ**:
```typescript
interface GetCategoryStatsRequest {
  group_id: string;
  year_month: string;
}
```

**レスポンス**:
```typescript
interface CategoryStats {
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  total_amount: number;
  budget_amount: number | null;
  usage_percent: number | null;
  transaction_count: number;
}[]
```

### 日別推移

```
POST /rpc/get_daily_trend
```

**リクエストボディ**:
```typescript
interface GetDailyTrendRequest {
  group_id: string;
  start_date: string;
  end_date: string;
}
```

**レスポンス**:
```typescript
interface DailyTrend {
  date: string;
  expense: number;
  income: number;
}[]
```

---

## 11. User Settings API

### 設定取得

```
GET /user_settings?user_id=eq.{user_id}
```

### 設定更新（Upsert）

```
POST /user_settings
Headers: Prefer: resolution=merge-duplicates
```

**リクエストボディ**:
```typescript
interface UpdateSettingsRequest {
  user_id: string;
  reminder_enabled?: boolean;
  reminder_time?: string;
  budget_alert_enabled?: boolean;
  partner_notification?: boolean;
  language?: string;
  theme?: 'light' | 'dark' | 'system';
}
```

---

## 12. Export API

### CSVエクスポート

```
POST /rpc/export_transactions_csv
```

**リクエストボディ**:
```typescript
interface ExportRequest {
  group_id: string;
  start_date: string;
  end_date: string;
}
```

**レスポンス**: CSV文字列

---

## Row Level Security (RLS) ポリシー

### 基本方針

- ユーザーは自分が所属するグループのデータのみアクセス可能
- 権限レベルに応じた操作制限

### ポリシー例

```sql
-- transactions テーブル
-- SELECT: グループメンバーのみ
CREATE POLICY "select_transactions" ON transactions
FOR SELECT
USING (
  group_id IN (
    SELECT group_id FROM group_members WHERE user_id = auth.uid()
  )
);

-- INSERT: member以上の権限
CREATE POLICY "insert_transactions" ON transactions
FOR INSERT
WITH CHECK (
  group_id IN (
    SELECT group_id FROM group_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin', 'member')
  )
);

-- UPDATE: 自分の取引 or admin以上
CREATE POLICY "update_transactions" ON transactions
FOR UPDATE
USING (
  (created_by = auth.uid())
  OR
  group_id IN (
    SELECT group_id FROM group_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- DELETE: 自分の取引 or admin以上
CREATE POLICY "delete_transactions" ON transactions
FOR DELETE
USING (
  (created_by = auth.uid())
  OR
  group_id IN (
    SELECT group_id FROM group_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);
```

---

## エラーコード一覧

| コード | 説明 |
|--------|------|
| 401 | 認証エラー（トークン無効/期限切れ） |
| 403 | 権限エラー（アクセス権限なし） |
| 404 | リソースが見つからない |
| 409 | 競合エラー（重複等） |
| 422 | バリデーションエラー |
| 500 | サーバーエラー |

---

*最終更新: 2025年1月*
