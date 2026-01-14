# Supabase セットアップガイド

## 前提条件
- Supabaseアカウント
- Google Cloud Console アカウント（Google OAuth用）

## 1. Supabaseプロジェクトの作成

1. [Supabase Dashboard](https://app.supabase.com/) にログイン
2. "New project" をクリック
3. プロジェクト情報を入力：
   - **Name**: ourhome-finance（任意の名前）
   - **Database Password**: 強力なパスワードを設定
   - **Region**: Japan (Tokyo) 推奨
4. "Create new project" をクリック

## 2. データベーススキーマの作成

### 2.1 スキーマの適用

1. Supabase Dashboard → **SQL Editor**
2. 以下のファイルを順番に実行：

#### ステップ1: スキーマ作成
`/docs/supabase/schema.sql` の内容をコピーして実行

#### ステップ2: RLSポリシー作成
`/docs/supabase/rls-policies.sql` の内容をコピーして実行

#### ステップ3: 関数作成
`/docs/supabase/functions.sql` の内容をコピーして実行

### 2.2 確認

Table Editorで以下のテーブルが作成されているか確認：
- ✅ users
- ✅ groups
- ✅ group_members
- ✅ categories
- ✅ transactions
- ✅ transaction_splits
- ✅ settlements
- ✅ budgets
- ✅ goals
- ✅ goal_contributions
- ✅ user_settings

## 3. 環境変数の設定

### 3.1 Supabase接続情報の取得

1. Supabase Dashboard → **Settings** → **API**
2. 以下の情報をコピー：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbG...`

### 3.2 .envファイルの作成

プロジェクトルートに`.env`ファイルを作成（既存の場合は編集）：

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **注意**: `.env`ファイルは`.gitignore`に含まれているため、Gitにコミットされません。

## 4. Google OAuth の設定

### 4.1 Google Cloud Console での設定

#### ステップ1: プロジェクト作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを作成または選択

#### ステップ2: OAuth同意画面の設定

1. **APIとサービス** → **OAuth同意画面**
2. ユーザータイプ: **外部** を選択
3. **作成** をクリック
4. アプリ情報を入力：
   - **アプリ名**: OurHome Finance
   - **ユーザーサポートメール**: あなたのメールアドレス
   - **デベロッパーの連絡先情報**: あなたのメールアドレス
5. **保存して次へ** をクリック
6. スコープ: そのまま**保存して次へ**
7. テストユーザー: 必要に応じて追加
8. **保存して次へ** → **ダッシュボードに戻る**

#### ステップ3: OAuth 2.0 クライアントIDの作成

1. **APIとサービス** → **認証情報**
2. **+ 認証情報を作成** → **OAuth クライアント ID**
3. アプリケーションの種類: **ウェブ アプリケーション**
4. 名前: **OurHome Finance Web Client**
5. **承認済みのリダイレクト URI** の **+ URIを追加** をクリック
6. 以下を追加（**YOUR_PROJECT_REF**は後で置き換えます）：
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```
7. **作成** をクリック
8. 表示される **クライアント ID** と **クライアント シークレット** をコピー

#### ステップ4: Supabaseプロジェクト参照IDの取得

1. Supabase Dashboard に戻る
2. **Settings** → **API**
3. **Project URL** をコピー: `https://xxxxx.supabase.co`
4. `xxxxx` の部分があなたのプロジェクト参照IDです

#### ステップ5: リダイレクトURIの更新

1. Google Cloud Consoleに戻る
2. 先ほど作成したOAuthクライアントを編集
3. リダイレクトURIを更新：
   ```
   https://xxxxx.supabase.co/auth/v1/callback
   ```
   （`xxxxx`を実際のプロジェクト参照IDに置き換え）
4. **保存**

### 4.2 Supabase での Google Provider 設定

1. Supabase Dashboard → **Authentication** → **Providers**
2. **Google** を選択
3. **Enable Google** をオンにする
4. 以下を入力：
   - **Client ID**: Google Cloud ConsoleでコピーしたクライアントID
   - **Client Secret**: Google Cloud Consoleでコピーしたクライアントシークレット
5. **Save** をクリック

## 5. リダイレクトURLの設定

### 5.1 ローカル開発環境

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. 以下を設定：

#### Site URL
```
http://localhost:3000
```

#### Redirect URLs
以下の**両方**を追加（1行ずつ）：
```
http://localhost:3000/**
http://localhost:3000/#/auth/callback
```

⚠️ **重要**: 
- `**` はワイルドカードです
- `#` を含めることを忘れないでください（HashRouter使用時）

3. **Save** をクリック

### 5.2 本番環境（デプロイ後）

本番環境では、以下に変更してください：

#### Site URL
```
https://your-domain.com
```

#### Redirect URLs
```
https://your-domain.com/**
https://your-domain.com/#/auth/callback
```

## 6. 動作確認

### 6.1 データベース接続の確認

```bash
# 開発サーバーを起動
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスし、エラーが表示されないことを確認

### 6.2 Google OAuth の確認

1. Welcome画面で **Google** ボタンをクリック
2. Googleアカウントを選択
3. 権限を承認
4. `/auth/callback` にリダイレクトされる
5. 「認証中...」が表示される
6. デバッグ情報が表示される（開発時）
7. `/onboarding/group-setup` に自動遷移する

✅ ここまで正常に動作すれば、セットアップ完了です！

### 6.3 usersテーブルの確認

1. Supabase Dashboard → **Table Editor** → **users**
2. 新しいレコードが作成されているか確認：
   - `id`: あなたのSupabase AuthユーザーID
   - `email`: Googleアカウントのメールアドレス
   - `display_name`: Google名またはメールアドレス

## トラブルシューティング

### 問題: "認証に失敗しました"

**解決策:**
1. Google Providerが有効になっているか確認
2. Client IDとClient Secretが正しいか確認
3. リダイレクトURLに `#` が含まれているか確認

### 問題: "ユーザー情報の作成に失敗しました"

**解決策:**
```sql
-- Supabase SQL Editorで実行
CREATE POLICY "users_insert_own" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);
```

### 問題: リダイレクトループが発生

**解決策:**
1. Redirect URLsに `http://localhost:3000/**` が含まれているか確認
2. ブラウザのキャッシュをクリア
3. Supabaseのセッションをリセット

詳細なトラブルシューティングは `/docs/oauth-troubleshooting.md` を参照してください。

## セキュリティ上の注意

### 本番環境へのデプロイ前に

1. **RLSポリシーの確認**
   - すべてのテーブルでRow Level Securityが有効になっているか確認
   - 適切なポリシーが設定されているか確認

2. **環境変数の保護**
   - `.env` ファイルをGitにコミットしない
   - 本番環境では環境変数を安全に管理（Vercel、Netlifyなど）

3. **OAuth設定の更新**
   - 本番ドメインでリダイレクトURLを更新
   - Google Cloud ConsoleでリダイレクトURIを更新

4. **API Keyの保護**
   - `anon key` は公開されても安全（RLSで保護されている）
   - `service_role key` は**絶対に**クライアント側に公開しない

---

**最終更新:** 2026年1月13日
