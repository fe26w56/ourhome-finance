# OAuth デバッグガイド

## 現在の問題

Googleログイン後、usersテーブルにレコードが作成されない

## デバッグ手順

### ステップ1: Googleログインを実行

1. ブラウザで http://localhost:3000 にアクセス
2. ブラウザの開発者ツールを開く（F12）
3. **Consoleタブ**を開く
4. Welcome画面で「Google」ボタンをクリック
5. Googleアカウントでログイン

### ステップ2: リダイレクトURLを確認

ログイン後、ブラウザのURLバーを確認：

#### 期待されるURL:
```
http://localhost:3000/#/auth/callback?...
```

#### もし以下のURLになっている場合、Supabase設定が間違っています:
```
http://localhost:3000/auth/callback?...  (# がない)
http://localhost:3000?...                (callbackがない)
```

**解決策:**
- Supabase Dashboard → Authentication → URL Configuration
- Redirect URLsに以下を追加:
  ```
  http://localhost:3000/**
  http://localhost:3000/#/auth/callback
  ```

### ステップ3: AuthCallback画面のデバッグ情報を確認

AuthCallback画面（「認証中...」画面）に表示されるデバッグ情報を確認：

#### ✅ 正常な場合:
```
デバッグ情報:
1. セッション取得開始
✅ ユーザー取得成功: your-email@gmail.com
2. usersテーブル確認開始
3. ユーザーレコード作成開始
✅ ユーザーレコード作成成功: ユーザー名
4. ユーザー情報をストアに設定
5. グループ確認開始
グループ数: 0
✅ グループなし -> オンボーディング画面へ
```

#### ❌ RLSポリシーエラーの場合:
```
デバッグ情報:
1. セッション取得開始
✅ ユーザー取得成功: your-email@gmail.com
2. usersテーブル確認開始
3. ユーザーレコード作成開始
❌ ユーザー作成エラー: new row violates row-level security policy
```

#### ❌ セッションエラーの場合:
```
デバッグ情報:
1. セッション取得開始
❌ セッションまたはユーザーが存在しません
```

### ステップ4: ブラウザコンソールのログを確認

Consoleタブで以下のログを確認：

#### 正常な場合:
```javascript
Auth callback error: なし
```

#### エラーがある場合:
```javascript
Failed to create user record: { message: "...", code: "...", details: "..." }
Auth callback error: Error: ユーザー情報の作成に失敗しました
Debug logs: [...]
```

### ステップ5: Supabase Logsを確認

1. [Supabase Dashboard](https://app.supabase.com/) にアクセス
2. プロジェクトを選択
3. **Logs** → **Auth Logs** を開く
4. 最新のログを確認

#### 確認すべきポイント:
- ✅ `auth.signInWithOAuth` リクエストが届いているか
- ✅ `auth.callback` が成功しているか
- ❌ エラーメッセージがないか

### ステップ6: RLSポリシーの確認

1. Supabase Dashboard → **Table Editor** → **users**
2. 右上の**Policies**をクリック
3. 以下のポリシーが存在するか確認:

#### users_insert_own
```sql
Policy Name: users_insert_own
Command: INSERT
Check: (auth.uid() = id)
```

**もし存在しない場合:**

Supabase Dashboard → **SQL Editor** で以下を実行:

```sql
-- usersテーブルのRLSを有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 自分のレコードを挿入できるポリシー
CREATE POLICY "users_insert_own" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 自分のレコードを読み取れるポリシー
CREATE POLICY "users_select_own" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- 自分のレコードを更新できるポリシー
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

### ステップ7: usersテーブルの確認

1. Supabase Dashboard → **Table Editor** → **users**
2. テーブルの内容を確認

#### レコードが存在しない場合:
- RLSポリシーが適用されていない可能性
- INSERT時にエラーが発生している可能性

#### レコードが存在する場合:
- 問題なし！ブラウザのキャッシュをクリアして再度ログイン

## よくあるエラーと解決策

### エラー1: "new row violates row-level security policy"

**原因:** `users_insert_own` ポリシーが存在しない

**解決策:**
```sql
CREATE POLICY "users_insert_own" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);
```

### エラー2: "認証に失敗しました"（セッションエラー）

**原因:** Supabaseのリダイレクト設定が間違っている

**解決策:**
- Redirect URLsに `http://localhost:3000/#/auth/callback` を追加
- `#` を含めることを忘れない

### エラー3: AuthCallback画面に到達しない

**原因:** App.tsxにルートが追加されていない

**解決策:**
`App.tsx` に以下のルートが存在するか確認:
```typescript
<Route path="/auth/callback" element={<AuthCallback />} />
```

### エラー4: "User not authenticated"

**原因:** セッションが正しく取得できていない

**解決策:**
1. ブラウザのキャッシュをクリア
2. Supabaseの設定を再確認
3. ブラウザを再起動

## 緊急対応: RLSを一時的に無効化（テスト用のみ）

⚠️ **本番環境では絶対に実行しないでください**

```sql
-- usersテーブルのRLSを一時的に無効化
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

これでINSERTが成功する場合、RLSポリシーの問題です。

テスト後、必ず再度有効化してください:
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

## 次のステップ

上記のステップで問題が解決しない場合、以下の情報を収集してください:

1. AuthCallback画面のデバッグ情報（スクリーンショット）
2. ブラウザコンソールのエラーメッセージ
3. Supabase Auth Logsのスクリーンショット
4. ブラウザのURLバー（ログイン後）

---

**最終更新:** 2026年1月13日
