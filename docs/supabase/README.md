# Supabase データベース設定ガイド

このディレクトリには、Supabaseデータベースの設定に必要なSQLスクリプトが含まれています。

## 📋 ファイル構成

- `schema.sql` - テーブル定義、インデックス、トリガー
- `rls-policies.sql` - Row Level Security (RLS) ポリシー
- `functions.sql` - RPC関数とビュー

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

#### ステップ 1: スキーマ作成

`schema.sql` の内容をコピーして実行します。

これにより以下が作成されます：
- ENUM型（member_role, transaction_type, category_type, goal_type, theme_type）
- 11個のテーブル
- インデックス
- updated_at自動更新トリガー
- RLS有効化

#### ステップ 2: RLSポリシー設定

`rls-policies.sql` の内容をコピーして実行します。

これにより、各テーブルに対するRow Level Securityポリシーが設定されます。

#### ステップ 3: 関数とビューの作成

`functions.sql` の内容をコピーして実行します。

これにより以下が作成されます：
- ビュー（v_monthly_summary, v_settlement_balance）
- RPC関数（regenerate_invite_code, copy_budgets_to_next_month, get_settlement_balance, record_settlement, get_monthly_summary, get_category_stats, get_daily_trend）

## ✅ 確認事項

### テーブル確認

SQL Editorで以下を実行して、テーブルが正しく作成されたか確認：

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

以下の11テーブルが表示されるはずです：
- budgets
- categories
- goal_contributions
- goals
- group_members
- groups
- settlements
- transaction_splits
- transactions
- user_settings
- users

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

Supabase Dashboard > Authentication > Providers で以下を設定：

#### Google OAuth
1. Google Cloud ConsoleでOAuth 2.0クライアントIDを作成
2. リダイレクトURI: `https://your-project.supabase.co/auth/v1/callback`
3. Supabase DashboardでGoogleプロバイダーを有効化
4. Client IDとSecretを設定

#### Apple OAuth
1. Apple DeveloperでService IDを作成
2. リダイレクトURI: `https://your-project.supabase.co/auth/v1/callback`
3. Supabase DashboardでAppleプロバイダーを有効化
4. Service IDとSecret Keyを設定

## 📝 注意事項

1. **usersテーブル**: Supabase Authと連携するため、`auth.users`テーブルにユーザーが作成されると自動的に`users`テーブルにもレコードが作成されるように、トリガーを設定することを推奨します（オプション）。

2. **招待コード**: `groups`テーブルの`invite_code`は、グループ作成時に自動生成されます。`regenerate_invite_code`関数を使用して再生成できます。

3. **デフォルトカテゴリ**: グループ作成時にデフォルトカテゴリを自動生成する処理は、アプリケーション側で実装する必要があります。

4. **ストレージ**: レシート画像の保存には、Supabase Storageを使用します。バケット名は`receipts`を推奨します。

## 🐛 トラブルシューティング

### エラー: "relation does not exist"
- テーブルが作成されていない可能性があります。`schema.sql`を再実行してください。

### エラー: "permission denied"
- RLSポリシーが正しく設定されていない可能性があります。`rls-policies.sql`を再実行してください。

### エラー: "function does not exist"
- 関数が作成されていない可能性があります。`functions.sql`を再実行してください。

## 📚 参考資料

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
