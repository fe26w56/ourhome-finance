# Supabase データベース設定ガイド

このディレクトリには、Supabaseデータベースの設定に必要なSQLスクリプトが含まれています。

## 📁 ディレクトリ構成

```
docs/supabase/
├── README.md           # このファイル
├── CHANGELOG.md        # 変更履歴
│
├── setup/              # 初期セットアップ（この順で実行）
│   ├── 01-schema.sql       # テーブル定義、インデックス、トリガー
│   ├── 02-rls-policies.sql # Row Level Security ポリシー
│   └── 03-functions.sql    # RPC関数、ビュー、ヘルパー関数
│
├── migrations/         # スキーマ変更（必要に応じて）
│   └── beneficiaries.sql   # 受益者機能追加
│
├── fixes/              # データ修正（既存データに問題がある場合）
│   └── data-missing-group-owner.sql
│
└── utils/              # ユーティリティ（デバッグ用）
    └── check-rls.sql       # RLSポリシー確認
```

## 🚀 セットアップ手順

### 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com/) にアクセス
2. 新しいプロジェクトを作成
3. プロジェクトの設定から以下を取得：
   - Project URL (`VITE_SUPABASE_URL`)
   - Anon Key (`VITE_SUPABASE_ANON_KEY`)

### 2. 環境変数の設定

プロジェクトルートに `.env` ファイルを作成（または既存のファイルに追加）：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. SQLスクリプトの実行

Supabase Dashboard の SQL Editor で、以下の順序で実行してください：

| 順序 | ファイル | 説明 |
|-----|---------|-----|
| 1 | `setup/01-schema.sql` | テーブル、ENUM、インデックス、トリガー作成 |
| 2 | `setup/02-rls-policies.sql` | RLSポリシー設定 |
| 3 | `setup/03-functions.sql` | 関数、ビュー作成 |

## ✅ 確認事項

### テーブル確認

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

期待されるテーブル（11個）：
- budgets, categories, goal_contributions, goals
- group_members, groups, settlements
- transaction_splits, transactions
- user_settings, users

### RLSポリシー確認

```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 関数確認

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

## 🔐 認証設定

### OAuth設定（Google/Apple）

Supabase Dashboard > Authentication > Providers で設定：

#### Google OAuth
1. Google Cloud ConsoleでOAuth 2.0クライアントIDを作成
2. リダイレクトURI: `https://your-project.supabase.co/auth/v1/callback`
3. Supabase DashboardでGoogleプロバイダーを有効化

#### Apple OAuth
1. Apple DeveloperでService IDを作成
2. リダイレクトURI: `https://your-project.supabase.co/auth/v1/callback`
3. Supabase DashboardでAppleプロバイダーを有効化

## 📝 マイグレーション

新機能追加時は `migrations/` ディレクトリにファイルを追加：

| ファイル | 説明 |
|---------|-----|
| `beneficiaries.sql` | 取引の受益者（For Whom）機能追加 |

## 🔧 データ修正

既存データに問題がある場合は `fixes/` ディレクトリのスクリプトを使用：

| ファイル | 説明 |
|---------|-----|
| `data-missing-group-owner.sql` | グループオーナーがgroup_membersに未登録の場合の修正 |

## 🐛 トラブルシューティング

### エラー: "relation does not exist"
→ `setup/01-schema.sql` を実行してください

### エラー: "permission denied"
→ `setup/02-rls-policies.sql` を再実行してください

### エラー: "function does not exist"
→ `setup/03-functions.sql` を実行してください

### デバッグ
→ `utils/check-rls.sql` でRLS状態を確認

## 📚 参考資料

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
