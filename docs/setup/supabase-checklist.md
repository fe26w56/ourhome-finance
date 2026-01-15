# Supabase 設定チェックリスト

## 🎯 現在の問題
**Googleログイン後、usersテーブルにレコードが作成されない**

---

## ✅ 必須設定チェックリスト

### 1. 環境変数の確認

- [ ] `.env`ファイルが存在する
- [ ] `VITE_SUPABASE_URL`が設定されている
- [ ] `VITE_SUPABASE_ANON_KEY`が設定されている

**確認方法:**
```bash
cat .env
```

**期待される内容:**
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 2. Supabase Authentication 設定

#### 2.1 Site URL
- [ ] `http://localhost:3000` が設定されている

**確認場所:**
Supabase Dashboard → Authentication → URL Configuration → Site URL

#### 2.2 Redirect URLs
- [ ] `http://localhost:3000/**` が追加されている
- [ ] `http://localhost:3000/#/auth/callback` が追加されている
- [ ] `#` が含まれている（重要！）

**確認場所:**
Supabase Dashboard → Authentication → URL Configuration → Redirect URLs

---

### 3. Google OAuth Provider 設定

- [ ] Google Providerが**有効**になっている
- [ ] **Client ID**が入力されている
- [ ] **Client Secret**が入力されている

**確認場所:**
Supabase Dashboard → Authentication → Providers → Google

**Client IDとSecretの取得:**
[Google Cloud Console](https://console.cloud.google.com/) → APIとサービス → 認証情報

---

### 4. Google Cloud Console 設定

- [ ] OAuth 2.0 クライアントIDが作成されている
- [ ] 承認済みのリダイレクトURIに以下が追加されている:
  ```
  https://[your-project-ref].supabase.co/auth/v1/callback
  ```

**確認場所:**
Google Cloud Console → APIとサービス → 認証情報

**プロジェクト参照IDの確認:**
Supabase Dashboard → Settings → API → Project URL

---

### 5. データベーススキーマの確認

- [ ] `users`テーブルが存在する
- [ ] `groups`テーブルが存在する
- [ ] `group_members`テーブルが存在する

**確認場所:**
Supabase Dashboard → Table Editor

**作成方法:**
Supabase Dashboard → SQL Editor で `/docs/supabase/schema.sql` を実行

---

### 6. RLS (Row Level Security) ポリシーの確認

#### 6.1 usersテーブルのRLS状態
- [ ] RLSが**有効**になっている

**確認場所:**
Supabase Dashboard → Table Editor → users → 右上の盾アイコン

#### 6.2 usersテーブルのポリシー
- [ ] `users_select_own` が存在する
- [ ] `users_insert_own` が存在する（**最重要！**）
- [ ] `users_update_own` が存在する

**確認場所:**
Supabase Dashboard → Table Editor → users → Policies タブ

**修復方法:**
Supabase Dashboard → SQL Editor で以下のスクリプトを実行:
```sql
-- /docs/supabase/check-rls-policies.sql の内容を実行
```

または

```sql
-- 最小限の修復
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_insert_own" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);
```

---

### 7. アプリケーション設定の確認

- [ ] `App.tsx`に`/auth/callback`ルートが存在する
- [ ] `AuthCallback.tsx`が正しくインポートされている

**確認場所:**
`/Users/tetsuichikawa/Workspace/ourhome-finance/App.tsx`

**期待されるコード:**
```typescript
<Route path="/auth/callback" element={<AuthCallback />} />
```

---

## 🧪 テスト手順

### 手順1: ブラウザの準備
1. [ ] ブラウザの開発者ツールを開く（F12）
2. [ ] Consoleタブを開く
3. [ ] ブラウザのキャッシュをクリア（⌘+Shift+R または Ctrl+Shift+R）

### 手順2: Googleログインを実行
1. [ ] http://localhost:3000 にアクセス
2. [ ] Welcome画面が表示される
3. [ ] 「Google」ボタンをクリック
4. [ ] Googleアカウントを選択
5. [ ] 権限を承認

### 手順3: リダイレクトURLの確認
ログイン後、ブラウザのURLバーを確認:

- [ ] `http://localhost:3000/#/auth/callback?...` になっている
- [ ] `#`が含まれている

❌ **もし以下のURLなら、Supabase設定が間違っています:**
- `http://localhost:3000/auth/callback?...` (# がない)
- `http://localhost:3000?...` (callbackがない)

### 手順4: AuthCallback画面の確認
「認証中...」画面に表示されるデバッグ情報を確認:

#### ✅ 正常な場合:
```
1. セッション取得開始
✅ ユーザー取得成功: your-email@gmail.com
2. usersテーブル確認開始
ユーザーID: xxxxxxxxx
既存ユーザー確認エラー: PGRST116 - ...
3. ユーザーレコード作成開始
INSERT結果: データあり
✅ ユーザーレコード作成成功: ユーザー名
4. ユーザー情報をストアに設定
5. グループ確認開始
グループ数: 0
✅ グループなし -> オンボーディング画面へ
```

#### ❌ RLSポリシーエラーの場合:
```
3. ユーザーレコード作成開始
❌ ユーザー作成エラー: new row violates row-level security policy
エラーコード: 42501
エラー詳細: ...
ヒント: ...
```

→ **解決策:** RLSポリシー`users_insert_own`が存在しません。上記「6. RLSポリシーの確認」を実施してください。

### 手順5: ブラウザコンソールの確認
Consoleタブでエラーがないか確認:

- [ ] エラーメッセージがない
- [ ] `Failed to create user record`がない

### 手順6: usersテーブルの確認
Supabase Dashboard → Table Editor → users

- [ ] 新しいレコードが作成されている
- [ ] `id`がSupabase AuthのユーザーIDと一致している
- [ ] `email`がGoogleアカウントのメールアドレスと一致している

---

## 🔥 緊急対応

### 問題: RLSポリシーエラーが発生する

**最速の解決策（Supabase SQL Editorで実行）:**

```sql
-- 1. RLSを有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. 必須ポリシーを作成
CREATE POLICY "users_insert_own" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 3. 確認
SELECT policyname FROM pg_policies WHERE tablename = 'users';
```

### 問題: セッションエラーが発生する

**解決策:**
1. Supabase Dashboard → Authentication → URL Configuration
2. Redirect URLsに以下を追加:
   ```
   http://localhost:3000/**
   http://localhost:3000/#/auth/callback
   ```
3. **Save**をクリック
4. ブラウザのキャッシュをクリア
5. 再度ログイン

---

## 📋 完了確認

すべてのチェックボックスにチェックが入ったら、以下を実行:

1. [ ] ブラウザのキャッシュをクリア
2. [ ] http://localhost:3000 にアクセス
3. [ ] Googleログインを実行
4. [ ] オンボーディング画面に遷移する
5. [ ] Supabase Dashboard → Table Editor → users でレコードを確認

✅ **レコードが作成されていれば成功！**

---

## 📞 まだ解決しない場合

以下の情報を収集してください:

1. [ ] AuthCallback画面のデバッグ情報（スクリーンショット）
2. [ ] ブラウザコンソールのエラーメッセージ（全文コピー）
3. [ ] Supabase Logsのスクリーンショット
4. [ ] ブラウザのURLバー（ログイン後）
5. [ ] RLSポリシーの一覧（SQL実行結果）

**デバッグガイド:**
`/docs/DEBUG_OAUTH.md` を参照

---

**最終更新:** 2026年1月13日
