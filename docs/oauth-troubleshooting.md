# OAuth認証 トラブルシューティングガイド

## 問題: Googleログイン後にグループ作成画面に遷移しない

### 確認手順

#### 1. Supabaseのリダイレクト設定を確認

**Supabase Dashboard → Authentication → URL Configuration**

以下の設定が正しいか確認してください：

##### Site URL
```
http://localhost:3000
```

##### Redirect URLs（重要！）
以下のURLを**すべて**追加してください：
```
http://localhost:3000/**
http://localhost:3000/#/auth/callback
```

⚠️ **注意**: 
- `http://localhost:3000/**` は必須です。
- `http://localhost:3000/#/auth/callback` は**HashRouter用**です。`#`を含める必要があります。
- これらがないと、Supabaseが認証後に正しくリダイレクトしません。

#### 2. Google OAuth設定を確認

**Supabase Dashboard → Authentication → Providers → Google**

- ✅ Enabledがオンになっているか
- ✅ Client IDが入力されているか
- ✅ Client Secretが入力されているか

#### 3. Google Cloud Consoleの設定を確認

**Google Cloud Console → APIとサービス → 認証情報**

承認済みのリダイレクトURIに以下が追加されているか確認：
```
https://[your-project-ref].supabase.co/auth/v1/callback
```

プロジェクト参照IDは、Supabase Dashboard → Settings → API → Project URL で確認できます。

#### 4. RLSポリシーを確認

**Supabase Dashboard → Table Editor → users → Policies**

以下のポリシーが存在するか確認：

```sql
-- Policy name: users_insert_own
CREATE POLICY "users_insert_own" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);
```

なければ、以下のSQLを実行：

```sql
CREATE POLICY "users_insert_own" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);
```

### デバッグ方法

#### 1. ブラウザのコンソールを確認

1. ブラウザで開発者ツールを開く（F12）
2. Consoleタブを開く
3. Googleログインを試す
4. エラーメッセージや「Debug logs:」を確認

#### 2. AuthCallback画面のデバッグ情報を確認

Googleログイン後、AuthCallback画面に以下のような情報が表示されます：

```
デバッグ情報:
1. セッション取得開始
✅ ユーザー取得成功: user@example.com
2. usersテーブル確認開始
3. ユーザーレコード作成開始
✅ ユーザーレコード作成成功: ユーザー名
4. グループ確認開始
グループ数: 0
✅ グループなし -> オンボーディング画面へ
```

#### 3. Supabase Logsを確認

**Supabase Dashboard → Logs → Auth Logs**

- 認証リクエストが届いているか
- エラーが発生していないか

### よくあるエラーと解決策

#### エラー: "認証に失敗しました"

**原因:**
- Supabaseのリダイレクト設定が間違っている
- Google OAuth設定が不完全

**解決策:**
1. Redirect URLsに `http://localhost:3000/**` が含まれているか確認
2. Google Providerが有効になっているか確認

#### エラー: "ユーザー情報の作成に失敗しました"

**原因:**
- RLSポリシー `users_insert_own` が存在しない
- `users`テーブルへのINSERT権限がない

**解決策:**
```sql
-- Supabase SQL Editorで実行
CREATE POLICY "users_insert_own" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);
```

#### エラー: "グループ取得エラー"

**原因:**
- RLSポリシーが正しく設定されていない
- `group_members`テーブルへのアクセス権限がない

**解決策:**
`/docs/supabase/rls-policies.sql` のポリシーをすべて適用してください。

#### 問題: ログイン後、何も起こらない

**原因:**
- AuthCallback画面にルーティングされていない
- `App.tsx`にルートが追加されていない

**解決策:**
`App.tsx` に以下のルートが存在するか確認：
```typescript
<Route path="/auth/callback" element={<AuthCallback />} />
```

#### 問題: "認証中..."画面のまま動かない

**原因:**
- JavaScript エラーが発生している
- ネットワークエラー

**解決策:**
1. ブラウザのコンソールでエラーを確認
2. ネットワークタブでリクエストを確認
3. デバッグ情報を確認

### 手動テスト手順

#### ステップ1: 設定の確認

```bash
# ローカルサーバーが起動しているか確認
# ブラウザで http://localhost:3000 にアクセス
```

#### ステップ2: Googleログインテスト

1. Welcome画面で「Google」ボタンをクリック
2. Googleアカウントを選択（またはログイン）
3. 権限を承認
4. **期待される動作:**
   - `/auth/callback` にリダイレクト
   - 「認証中...」が表示される
   - デバッグ情報が表示される
   - `/onboarding/group-setup` に自動遷移

#### ステップ3: usersテーブルの確認

**Supabase Dashboard → Table Editor → users**

新しいレコードが作成されているか確認：
- `id`: Supabase AuthのユーザーID
- `email`: Googleアカウントのメールアドレス
- `display_name`: Google名またはメールアドレス

#### ステップ4: グループ作成

1. オンボーディング画面でグループを作成
2. プロフィール設定（スキップ可能）
3. カテゴリテンプレート選択（スキップ可能）
4. ホーム画面に遷移

#### ステップ5: 2回目のログイン

1. ログアウト
2. もう一度Googleログイン
3. **期待される動作:**
   - すでにグループがあるため、ホーム画面に直接遷移
   - 前回作成したグループが選択されている

### まだ動作しない場合

以下の情報を収集してください：

1. ブラウザのコンソールログ
2. AuthCallback画面のデバッグ情報
3. Supabase Logsのエラーメッセージ
4. `users`テーブルにレコードが作成されているか
5. Supabaseのリダイレクト設定のスクリーンショット

## 本番環境へのデプロイ時

本番環境では、以下の設定を更新してください：

### Supabase設定

**Site URL:**
```
https://your-domain.com
```

**Redirect URLs:**
```
https://your-domain.com/**
https://your-domain.com/#/auth/callback
```

⚠️ **注意**: `#`を含めることを忘れないでください（HashRouter使用時）

### Google Cloud Console

**承認済みのリダイレクトURI:**
```
https://[your-project-ref].supabase.co/auth/v1/callback
```

### コード内のリダイレクトURL

`useAuth.ts`の`signInWithOAuth`関数:
```typescript
redirectTo: `${window.location.origin}/auth/callback`,
```
→ これは自動的に本番URLを使用するため、変更不要

---

**最終更新:** 2026年1月13日
