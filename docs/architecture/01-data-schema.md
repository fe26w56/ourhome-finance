# データスキーマ設計

## 概要

本ドキュメントでは、アプリケーションで使用するデータモデルを定義します。

---

## エンティティ関連図（ER図）

```
┌─────────────┐       ┌─────────────────┐       ┌─────────────┐
│    users    │──1:N──│  group_members  │──N:1──│   groups    │
└─────────────┘       └─────────────────┘       └─────────────┘
      │                       │                       │
      │                       │                       │
      │1                      │                       │1
      │                       │                       │
      ▼N                      │                       ▼N
┌─────────────┐               │               ┌─────────────┐
│transactions │◄──────────────┘               │  categories │
└─────────────┘                               └─────────────┘
      │                                             │
      │N                                           │1
      │                                             │
      ▼1                                           ▼N
┌─────────────────┐                         ┌─────────────┐
│transaction_splits│                         │   budgets   │
└─────────────────┘                         └─────────────┘

┌─────────────┐       ┌─────────────────┐
│   groups    │──1:N──│     goals       │
└─────────────┘       └─────────────────┘

┌─────────────┐       ┌─────────────────┐
│   groups    │──1:N──│  settlements    │
└─────────────┘       └─────────────────┘
```

---

## テーブル定義

### 1. users（ユーザー）

ユーザーの基本情報。Supabase Authと連携。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | UUID | PK | Supabase Auth のuser_id |
| email | VARCHAR(255) | UNIQUE, NOT NULL | メールアドレス |
| display_name | VARCHAR(100) | NOT NULL | 表示名 |
| avatar_url | TEXT | NULL | アバター画像URL |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 更新日時 |

```typescript
// TypeScript型定義
interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

### 2. groups（グループ）

家計簿を共有するグループ（カップル、同居人など）。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | グループID |
| name | VARCHAR(100) | NOT NULL | グループ名 |
| currency | VARCHAR(3) | NOT NULL, DEFAULT 'JPY' | 通貨コード |
| month_start_day | INTEGER | NOT NULL, DEFAULT 1 | 月の開始日（1-28） |
| invite_code | VARCHAR(20) | UNIQUE | 招待コード |
| carry_over_balance | BOOLEAN | NOT NULL, DEFAULT TRUE | 残高繰越設定 |
| budget_carry_over | BOOLEAN | NOT NULL, DEFAULT FALSE | 予算繰越設定 |
| created_by | UUID | FK → users.id | 作成者 |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 更新日時 |

```typescript
interface Group {
  id: string;
  name: string;
  currency: string;
  monthStartDay: number;
  inviteCode: string | null;
  carryOverBalance: boolean;
  budgetCarryOver: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

---

### 3. group_members（グループメンバー）

ユーザーとグループの関連。権限管理を含む。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | ID |
| group_id | UUID | FK → groups.id, NOT NULL | グループID |
| user_id | UUID | FK → users.id, NOT NULL | ユーザーID |
| role | ENUM | NOT NULL, DEFAULT 'member' | 権限（owner/admin/member/viewer） |
| nickname | VARCHAR(50) | NULL | グループ内ニックネーム |
| color | VARCHAR(7) | NULL | メンバー識別色（#RRGGBB） |
| joined_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 参加日時 |

**制約**: UNIQUE(group_id, user_id)

```typescript
type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';

interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: MemberRole;
  nickname: string | null;
  color: string | null;
  joinedAt: string;
}
```

**権限レベル**:
| 権限 | 取引閲覧 | 取引作成 | 取引編集 | 取引削除 | 予算編集 | メンバー管理 |
|------|---------|---------|---------|---------|---------|-------------|
| owner | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| admin | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| member | ✓ | ✓ | 自分のみ | 自分のみ | - | - |
| viewer | ✓ | - | - | - | - | - |

---

### 4. categories（カテゴリ）

支出/収入のカテゴリ。グループごとにカスタマイズ可能。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | カテゴリID |
| group_id | UUID | FK → groups.id, NOT NULL | グループID |
| name | VARCHAR(50) | NOT NULL | カテゴリ名 |
| icon | VARCHAR(50) | NOT NULL | アイコン名（Material Icons） |
| color | VARCHAR(7) | NOT NULL | カテゴリ色（#RRGGBB） |
| type | ENUM | NOT NULL | 種別（expense/income/both） |
| sort_order | INTEGER | NOT NULL, DEFAULT 0 | 表示順 |
| is_default | BOOLEAN | NOT NULL, DEFAULT FALSE | デフォルトカテゴリか |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | 有効フラグ |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 作成日時 |

```typescript
type CategoryType = 'expense' | 'income' | 'both';

interface Category {
  id: string;
  groupId: string;
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}
```

**デフォルトカテゴリ（グループ作成時に自動生成）**:
| 名前 | アイコン | 色 | 種別 |
|------|---------|-----|------|
| 食費 | restaurant | #FF6B6B | expense |
| 住居費 | home | #4ECDC4 | expense |
| 光熱費 | bolt | #FFE66D | expense |
| 交通費 | directions_car | #95E1D3 | expense |
| 娯楽 | movie | #DDA0DD | expense |
| 日用品 | shopping_cart | #FFA07A | expense |
| 医療費 | medical_services | #87CEEB | expense |
| 通信費 | phone_iphone | #98D8C8 | expense |
| 給与 | payments | #73F590 | income |
| その他収入 | attach_money | #B8E994 | income |
| 未分類 | help_outline | #E0E0E0 | both |

---

### 5. transactions（取引）

支出・収入の記録。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | 取引ID |
| group_id | UUID | FK → groups.id, NOT NULL | グループID |
| category_id | UUID | FK → categories.id, NOT NULL | カテゴリID |
| type | ENUM | NOT NULL | 種別（expense/income） |
| amount | DECIMAL(12,2) | NOT NULL | 金額 |
| date | DATE | NOT NULL | 取引日 |
| memo | TEXT | NULL | メモ |
| is_shared | BOOLEAN | NOT NULL, DEFAULT TRUE | 共有取引か |
| paid_by | UUID | FK → users.id, NOT NULL | 支払った人 |
| created_by | UUID | FK → users.id, NOT NULL | 登録者 |
| receipt_url | TEXT | NULL | レシート画像URL |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 更新日時 |

```typescript
type TransactionType = 'expense' | 'income';

interface Transaction {
  id: string;
  groupId: string;
  categoryId: string;
  type: TransactionType;
  amount: number;
  date: string; // YYYY-MM-DD
  memo: string | null;
  isShared: boolean;
  paidBy: string;
  createdBy: string;
  receiptUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

### 6. transaction_splits（取引分割・負担）

取引の負担者と負担額。割り勘・立替の詳細。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | ID |
| transaction_id | UUID | FK → transactions.id, NOT NULL | 取引ID |
| user_id | UUID | FK → users.id, NOT NULL | 負担者 |
| amount | DECIMAL(12,2) | NOT NULL | 負担額 |
| percentage | DECIMAL(5,2) | NULL | 負担割合（%） |
| is_settled | BOOLEAN | NOT NULL, DEFAULT FALSE | 精算済みか |
| settled_at | TIMESTAMP | NULL | 精算日時 |

**制約**: UNIQUE(transaction_id, user_id)

```typescript
interface TransactionSplit {
  id: string;
  transactionId: string;
  userId: string;
  amount: number;
  percentage: number | null;
  isSettled: boolean;
  settledAt: string | null;
}
```

**ビジネスルール**:
- 取引の `amount` = Σ `transaction_splits.amount`（必ず一致）
- 均等割り: 各メンバーの `amount` = 取引 `amount` / メンバー数
- 割合指定: 各メンバーの `amount` = 取引 `amount` × `percentage` / 100
- 金額指定: 直接 `amount` を指定

---

### 7. settlements（精算）

精算の記録。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | 精算ID |
| group_id | UUID | FK → groups.id, NOT NULL | グループID |
| from_user_id | UUID | FK → users.id, NOT NULL | 支払った人 |
| to_user_id | UUID | FK → users.id, NOT NULL | 受け取った人 |
| amount | DECIMAL(12,2) | NOT NULL | 精算額 |
| settled_at | DATE | NOT NULL | 精算日 |
| method | VARCHAR(50) | NULL | 精算方法（現金/振込等） |
| note | TEXT | NULL | メモ |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 作成日時 |

```typescript
interface Settlement {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  settledAt: string;
  method: string | null;
  note: string | null;
  createdAt: string;
}
```

---

### 8. budgets（予算）

カテゴリ別の月次予算。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | 予算ID |
| group_id | UUID | FK → groups.id, NOT NULL | グループID |
| category_id | UUID | FK → categories.id, NULL | カテゴリID（NULLは全体予算） |
| year_month | VARCHAR(7) | NOT NULL | 対象年月（YYYY-MM） |
| amount | DECIMAL(12,2) | NOT NULL | 予算額 |
| carry_over | BOOLEAN | NOT NULL, DEFAULT FALSE | 繰越設定 |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 更新日時 |

**制約**: UNIQUE(group_id, category_id, year_month)

```typescript
interface Budget {
  id: string;
  groupId: string;
  categoryId: string | null;
  yearMonth: string; // YYYY-MM
  amount: number;
  carryOver: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

### 9. goals（目標）

貯金目標・支出上限目標。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | 目標ID |
| group_id | UUID | FK → groups.id, NOT NULL | グループID |
| name | VARCHAR(100) | NOT NULL | 目標名 |
| type | ENUM | NOT NULL | 種別（savings/spending_limit） |
| target_amount | DECIMAL(12,2) | NOT NULL | 目標額 |
| current_amount | DECIMAL(12,2) | NOT NULL, DEFAULT 0 | 現在額 |
| category_id | UUID | FK → categories.id, NULL | 関連カテゴリ（支出上限用） |
| start_date | DATE | NOT NULL | 開始日 |
| end_date | DATE | NULL | 終了日（NULLは無期限） |
| is_recurring | BOOLEAN | NOT NULL, DEFAULT FALSE | 毎月リセットするか |
| is_achieved | BOOLEAN | NOT NULL, DEFAULT FALSE | 達成済みか |
| achieved_at | TIMESTAMP | NULL | 達成日時 |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 更新日時 |

```typescript
type GoalType = 'savings' | 'spending_limit';

interface Goal {
  id: string;
  groupId: string;
  name: string;
  type: GoalType;
  targetAmount: number;
  currentAmount: number;
  categoryId: string | null;
  startDate: string;
  endDate: string | null;
  isRecurring: boolean;
  isAchieved: boolean;
  achievedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

### 10. goal_contributions（目標への入金）

貯金目標への手動入金記録。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | ID |
| goal_id | UUID | FK → goals.id, NOT NULL | 目標ID |
| user_id | UUID | FK → users.id, NOT NULL | 入金者 |
| amount | DECIMAL(12,2) | NOT NULL | 入金額 |
| date | DATE | NOT NULL | 入金日 |
| note | TEXT | NULL | メモ |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 作成日時 |

```typescript
interface GoalContribution {
  id: string;
  goalId: string;
  userId: string;
  amount: number;
  date: string;
  note: string | null;
  createdAt: string;
}
```

---

### 11. user_settings（ユーザー設定）

ユーザーごとの設定（通知など）。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | ID |
| user_id | UUID | FK → users.id, UNIQUE | ユーザーID |
| reminder_enabled | BOOLEAN | NOT NULL, DEFAULT TRUE | リマインダー有効 |
| reminder_time | TIME | NULL | リマインダー時刻 |
| budget_alert_enabled | BOOLEAN | NOT NULL, DEFAULT TRUE | 予算アラート有効 |
| partner_notification | BOOLEAN | NOT NULL, DEFAULT TRUE | パートナー通知 |
| language | VARCHAR(5) | NOT NULL, DEFAULT 'ja' | 言語 |
| theme | VARCHAR(10) | NOT NULL, DEFAULT 'light' | テーマ |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 更新日時 |

```typescript
interface UserSettings {
  id: string;
  userId: string;
  reminderEnabled: boolean;
  reminderTime: string | null;
  budgetAlertEnabled: boolean;
  partnerNotification: boolean;
  language: string;
  theme: 'light' | 'dark' | 'system';
  updatedAt: string;
}
```

---

## インデックス設計

```sql
-- 高頻度クエリ用インデックス
CREATE INDEX idx_transactions_group_date ON transactions(group_id, date DESC);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_paid_by ON transactions(paid_by);
CREATE INDEX idx_transaction_splits_transaction ON transaction_splits(transaction_id);
CREATE INDEX idx_transaction_splits_user ON transaction_splits(user_id);
CREATE INDEX idx_budgets_group_month ON budgets(group_id, year_month);
CREATE INDEX idx_goals_group ON goals(group_id);
CREATE INDEX idx_settlements_group ON settlements(group_id);
```

---

## 計算フィールド（ビュー/関数）

### 月次サマリー
```sql
-- グループの月次支出合計
CREATE VIEW v_monthly_summary AS
SELECT 
  group_id,
  TO_CHAR(date, 'YYYY-MM') as year_month,
  type,
  SUM(amount) as total_amount,
  COUNT(*) as transaction_count
FROM transactions
GROUP BY group_id, TO_CHAR(date, 'YYYY-MM'), type;
```

### 精算残高計算
```sql
-- メンバー間の精算残高
CREATE VIEW v_settlement_balance AS
SELECT 
  ts.user_id as debtor_id,
  t.paid_by as creditor_id,
  t.group_id,
  SUM(ts.amount) as owed_amount
FROM transaction_splits ts
JOIN transactions t ON ts.transaction_id = t.id
WHERE ts.user_id != t.paid_by
  AND ts.is_settled = FALSE
  AND t.is_shared = TRUE
GROUP BY ts.user_id, t.paid_by, t.group_id;
```

---

*最終更新: 2025年1月*
