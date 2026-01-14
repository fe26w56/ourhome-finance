# OAuth認証 セットアップガイド

## 実装日
2026年1月13日

## 問題の修正

### 問題
Googleでログインしても、グループが作成されず、ユーザーも登録されませんでした。

### 原因
1. OAuth認証後に`users`テーブルへのレコード作成処理がなかった
2. OAuth認証後のコールバック処理が不完全だった
3. グループ有無の確認と画面遷移が行われていなかった

### 修正内容

#### 1. AuthCallback画面の作成
`/src/screens/auth/AuthCallback.tsx`

OAuth認証後にリダイレクトされる画面で、以下の処理を実行：
1. セッションの取得
2. `users`テーブルにユーザーレコードが存在するか確認
3. 存在しない場合は自動作成（OAuth初回ログイン時）
4. グループの有無を確認
5. 適切な画面へ遷移
   - グループあり → ホーム画面
   - グループなし → オンボーディング画面

#### 2. useAuth.ts の修正
- `loadUser`関数を修正し、OAuth初回ログイン時のエラーハンドリングを改善
- レコードが見つからない場合でもエラーを投げない

#### 3. Welcome画面の修正
- GoogleとAppleボタンに`onClick`ハンドラーを追加
- `signInWithOAuth`を実行するように修正

#### 4. App.tsx にルート追加
```typescript
<Route path="/auth/callback" element={<AuthCallback />} />
```

## Supabase設定（必須）

OAuth認証を動作させるには、Supabaseプロジェクトで以下の設定が必要です。

### 1. Google OAuth Providerの有効化

1. Supabase Dashboard → Authentication → Providers
2. Google Providerを選択
3. 「Enable」をオンにする
4. Google Cloud Consoleで取得した以下の情報を入力：
   - **Client ID** (Google OAuth 2.0クライアントID)
   - **Client Secret** (Google OAuth 2.0クライアントシークレット)

### 2. リダイレクトURLの設定

Supabase Dashboard → Authentication → URL Configuration で以下を設定：

#### Site URL
```
http://localhost:3000
```
（本番環境では実際のドメインに変更）

#### Redirect URLs
```
http://localhost:3000/auth/callback
http://localhost:3000/**
```
（本番環境では実際のドメインに変更）

### 3. Google Cloud Console設定

Google OAuth 2.0を使用するには、Google Cloud Consoleで以下の設定が必要です：

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを作成または選択
3. 「APIとサービス」 → 「OAuth同意画面」
4. ユーザータイプを選択（外部）し、アプリ情報を入力
5. 「APIとサービス」 → 「認証情報」
6. 「認証情報を作成」 → 「OAuthクライアントID」
7. アプリケーションの種類: **ウェブアプリケーション**
8. 承認済みのリダイレクトURIに以下を追加：
   ```
   https://[your-project-ref].supabase.co/auth/v1/callback
   ```
   （Supabaseプロジェクトの参照IDは、Supabase Dashboard → Settings → APIで確認）

9. 作成後、**クライアントID**と**クライアントシークレット**をコピー
10. これらをSupabase DashboardのGoogle Provider設定に貼り付け

## OAuth認証フロー

### Googleログインの場合

```
1. ユーザーがWelcome画面で「Google」ボタンをクリック
2. signInWithOAuth('google') が実行される
3. Googleの認証画面にリダイレクト
4. ユーザーがGoogleアカウントで認証
5. /auth/callback にリダイレクト
6. AuthCallback画面で以下を実行：
   a. セッションを取得
   b. usersテーブルにレコードが存在するか確認
   c. 存在しない場合は自動作成（初回ログイン時）
   d. グループの有無を確認
7. 適切な画面へ遷移：
   - グループあり → / (ホーム画面)
   - グループなし → /onboarding/group-setup
```

### ユーザー情報の自動作成

OAuth初回ログイン時、以下の情報から`users`テーブルのレコードを作成：

```typescript
{
  id: user.id,                              // Supabase AuthのユーザーID
  email: user.email,                        // メールアドレス
  display_name: user.user_metadata?.full_name || 
                user.user_metadata?.name || 
                user.email?.split('@')[0] || 
                'ユーザー',                  // 表示名
  avatar_url: user.user_metadata?.avatar_url || null  // アバター画像
}
```

## テスト手順

### 1. 新規ユーザー（OAuth初回ログイン）

1. Welcome画面で「Google」ボタンをクリック
2. Googleアカウントで認証
3. `/auth/callback` にリダイレクトされる
4. 「認証中...」が表示される
5. 自動的に`users`テーブルにレコードが作成される
6. グループがないため、`/onboarding/group-setup` に遷移
7. グループを作成またはグループに参加
8. ホーム画面に遷移

### 2. 既存ユーザー（OAuth 2回目以降）

1. Welcome画面で「Google」ボタンをクリック
2. Googleアカウントで認証（既に認証済みの場合は自動的に進む）
3. `/auth/callback` にリダイレクトされる
4. グループが存在するため、最初のグループが自動選択される
5. `/` (ホーム画面) に遷移

## トラブルシューティング

### エラー: "認証に失敗しました"

**原因:**
- Supabaseでセッションが取得できない
- OAuth認証が正常に完了していない

**解決策:**
1. Supabase DashboardでGoogle Providerが有効になっているか確認
2. リダイレクトURLが正しく設定されているか確認
3. Google Cloud ConsoleでOAuthクライアントIDが正しく設定されているか確認

### エラー: "ユーザー情報の作成に失敗しました"

**原因:**
- `users`テーブルへのINSERT権限がない
- RLS（Row Level Security）ポリシーが正しく設定されていない

**解決策:**
1. Supabase Dashboardで`users`テーブルのRLSポリシーを確認
2. 以下のポリシーが設定されているか確認：
   ```sql
   CREATE POLICY "Users can insert their own record"
   ON users FOR INSERT
   WITH CHECK (auth.uid() = id);
   ```

### エラー: OAuth認証後、無限ループする

**原因:**
- リダイレクトURLの設定が間違っている
- コールバック処理でエラーが発生している

**解決策:**
1. ブラウザのコンソールでエラーログを確認
2. Supabase DashboardのLogsでエラーを確認
3. リダイレクトURLが`/auth/callback`になっているか確認

## 関連ファイル

### 新規作成
- `/src/screens/auth/AuthCallback.tsx` - OAuth認証コールバック画面
- `/docs/oauth-setup.md` - このドキュメント

### 修正
- `/src/hooks/useAuth.ts` - loadUser関数の修正
- `/src/screens/onboarding/Welcome.tsx` - OAuth処理の追加
- `/App.tsx` - コールバックルートの追加

---

**実装者:** AI Assistant  
**最終更新:** 2026年1月13日
