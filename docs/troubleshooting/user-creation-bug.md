# ユーザー作成問題の原因調査ドキュメント

**作成日:** 2026年1月13日  
**最終監査:** 2026年1月15日  
**問題:** ログアウトして別のアカウントでGoogleログインしてもuserにデータが増えない。また、手動でアカウント登録もできない。

---

## 調査結果サマリー

### 主要な問題点

1. **手動登録時のユーザー情報設定漏れ（最重要）**
   - `signUp`関数でユーザーを作成した後、`setUser`を呼んでいない
   - ストアにユーザー情報が設定されず、ユーザーがログイン状態にならない

2. **非同期処理のタイミング問題**
   - データベースへの反映遅延により、`loadUser`がユーザーを見つけられない可能性がある
   - 再試行ロジックがないため、一度失敗するとストアにユーザー情報が設定されない

3. **エラーハンドリングの不備**
   - `PGRST116`エラーの場合、単に終了するだけで、再試行がない
   - RLSポリシーエラーの場合、具体的な解決策が提示されない

4. **`isAuthenticated`の二重設定問題（監査で追加）**
   - `useAuthStore`で`setUser`と`setSession`の両方が`isAuthenticated`を設定している
   - 競合状態により認証状態が不整合になる可能性がある

### 推奨される修正方針

1. **`signUp`関数の修正（優先度: 高）**
   - ユーザー作成成功後、`setUser`を明示的に呼び出す

2. **`loadUser`関数の改善（優先度: 高）**
   - ユーザーが見つからない場合、再試行ロジックを追加（最大3回、指数バックオフ）

3. **エラーハンドリングの改善（優先度: 中）**
   - RLSポリシーエラーの場合、具体的な解決策を提示

4. **`useAuthStore`の`isAuthenticated`ロジック統一（優先度: 中）（監査で追加）**
   - `isAuthenticated`を`session`のみに依存させ、二重設定の問題を解消

---

## 1. 問題の概要

### 1.1 報告された問題
1. **Google OAuthログイン後、usersテーブルにレコードが作成されない**
   - ログアウト後、別のアカウントでGoogleログインしても、usersテーブルに新しいレコードが追加されない
   - 既存のユーザーでログインした場合も、usersテーブルにレコードが存在しない可能性がある

2. **手動アカウント登録ができない**
   - メール/パスワードでの新規登録が失敗する
   - エラーメッセージが表示されるか、またはサイレントに失敗する

---

## 2. コードフロー分析

### 2.1 Google OAuthログインのフロー

```
1. Login.tsx: handleOAuthLogin()
   └─> useAuth.signInWithOAuth('google')
       └─> supabase.auth.signInWithOAuth()
           └─> Google認証画面へリダイレクト
               └─> 認証成功後、/#/auth/callback へリダイレクト

2. AuthCallback.tsx: handleAuthCallback()
   ├─> supabase.auth.getSession() でセッション取得
   ├─> usersテーブルにユーザーが存在するか確認
   ├─> 存在しない場合、usersテーブルにINSERT
   └─> setUser(userData) でストアに設定

3. useAuth.ts: onAuthStateChange()
   ├─> セッション変更を検知
   ├─> loadUser(session.user.id) を実行
   └─> usersテーブルからユーザー情報を取得
       ├─> 見つかった場合: setUser(user)
       └─> 見つからない場合: 何もしない（問題点）
```

### 2.2 手動アカウント登録のフロー

```
1. Signup.tsx: handleSubmit()
   └─> useAuth.signUp(email, password, displayName)
       ├─> supabase.auth.signUp() でSupabase Authにユーザー作成
       └─> usersテーブルにINSERT
           └─> エラーが発生する可能性がある

2. useAuth.ts: onAuthStateChange()
   ├─> SIGNED_IN イベントを検知
   ├─> loadUser(session.user.id) を実行
   └─> usersテーブルからユーザー情報を取得
       ├─> 見つかった場合: setUser(user)
       └─> 見つからない場合: 何もしない（問題点）
```

---

## 3. 特定された問題点

### 3.1 問題1: タイミング競合によるユーザー情報の消失

**場所:** `src/hooks/useAuth.ts` の `loadUser` 関数（84-88行目）

```typescript
if (!data) {
  // OAuth認証でユーザーレコードが存在しない場合は作成しない
  // AuthCallbackで処理されるため
  setLoading(false);
  return;
}
```

**問題:**
- `AuthCallback.tsx`でユーザーを作成し、`setUser(userData)`でストアに設定している
- しかし、その後`useAuth.ts`の`onAuthStateChange`が呼ばれ、`loadUser`が実行される
- `loadUser`がユーザーを見つけられない場合（タイミングの問題やデータベースの反映遅延）、何もせずに終了する

**【監査による補足】:**
- `loadUser`は`setUser(null)`を呼んでいないため、`AuthCallback`で設定したユーザー情報は**上書きされずに残る**可能性がある
- ただし、5秒のタイムアウト処理が実装されている（54-75行目）ことに注意

```typescript
// タイムアウト付きクエリ（5秒）
const timeoutPromise = new Promise<never>((_, reject) => 
  setTimeout(() => reject(new Error('Query timeout after 5s')), 5000)
);
```

**影響:**
- Google OAuthログイン後、ユーザー情報がストアに正しく設定されない可能性がある
- ただし、`AuthCallback`が先に完了していれば、ユーザー情報は保持される

### 3.2 問題2: エラーハンドリングの不備

**場所:** `src/hooks/useAuth.ts` の `loadUser` 関数（77-82行目）

```typescript
if (error && error.code !== 'PGRST116') {
  // PGRST116 = レコードが見つからない（OAuth初回ログインの場合）
  console.error('Failed to load user:', error);
  setLoading(false);
  return;
}
```

**問題:**
- `PGRST116`（レコードが見つからない）エラーの場合、何もせずに終了する
- しかし、`AuthCallback`でユーザーを作成した後でも、データベースの反映遅延により`loadUser`が失敗する可能性がある
- エラーが発生しても、ユーザーに適切なフィードバックがない

**影響:**
- ユーザー作成が成功しても、ストアに反映されない
- エラーの原因が特定しにくい

### 3.3 問題3: 手動登録時のユーザー情報の設定漏れ

**場所:** `src/hooks/useAuth.ts` の `signUp` 関数（112-172行目）

```typescript
const { data: insertData, error: insertError } = await supabase
  .from('users')
  .insert(userData)
  .select();

if (insertError) {
  console.error('signUp: Failed to create user record:', {
    message: insertError.message,
    code: insertError.code,
    details: insertError.details,
    hint: insertError.hint,
  });
  return { error: insertError as AuthError };
}

console.log('signUp: User record created successfully:', insertData);
```

**問題:**
1. **ユーザー情報がストアに設定されない**
   - `signUp`関数でユーザーを作成した後、`setUser`を呼んでいない
   - `onAuthStateChange`が呼ばれて`loadUser`が実行されるが、タイミングの問題でユーザーが見つからない可能性がある
   - 結果として、ストアにユーザー情報が設定されない

2. **エラーハンドリングの不備**
   - RLSポリシーエラーの場合、エラーメッセージが返されるが、具体的な原因が分かりにくい
   - `Signup.tsx`でエラーメッセージを表示しているが、RLSポリシーの問題かどうかの判定が不完全

**影響:**
- 手動登録が成功しても、ストアにユーザー情報が設定されない
- ユーザーがログイン状態にならない、または正しく動作しない
- エラーが発生した場合、ユーザーが原因を特定しにくい

### 3.4 問題4: AuthCallbackとuseAuthの重複処理

**場所:** `src/screens/auth/AuthCallback.tsx` と `src/hooks/useAuth.ts`

**問題:**
- `AuthCallback.tsx`でユーザーを作成し、`setUser`でストアに設定している
- 同時に、`useAuth.ts`の`onAuthStateChange`も実行され、`loadUser`が呼ばれる
- 2つの処理が競合し、どちらが先に完了するかによって結果が変わる可能性がある

**影響:**
- ユーザー情報の取得が不安定になる
- タイミングによっては、ユーザー情報が正しく設定されない

---

## 4. 根本原因の分析

### 4.1 主な原因

1. **手動登録時のユーザー情報設定漏れ**
   - `signUp`関数でユーザーを作成した後、`setUser`を呼んでいない
   - `onAuthStateChange`が呼ばれて`loadUser`が実行されるが、タイミングの問題でユーザーが見つからない可能性がある
   - 結果として、ストアにユーザー情報が設定されず、ユーザーがログイン状態にならない

2. **非同期処理のタイミング問題**
   - `AuthCallback`でユーザーを作成後、データベースへの反映が完了する前に`loadUser`が実行される可能性がある
   - `loadUser`がユーザーを見つけられない場合、何もせずに終了し、ストアの状態が不整合になる
   - 手動登録の場合も同様に、ユーザー作成後すぐに`loadUser`が実行され、ユーザーが見つからない可能性がある

3. **エラーハンドリングの不備**
   - `PGRST116`エラー（レコードが見つからない）の場合、単に終了するだけで、再試行やフォールバック処理がない
   - ユーザー作成が成功しても、読み込みが失敗する可能性がある
   - RLSポリシーエラーの場合、具体的な解決策が提示されない

4. **重複処理の競合**
   - `AuthCallback`と`useAuth`の両方でユーザー情報を取得・設定しようとしている
   - どちらが正しい状態を保持するかが不明確
   - 手動登録の場合、`signUp`でユーザーを作成するが、ストアへの設定は`loadUser`に依存している

5. **`isAuthenticated`の二重設定問題（監査で追加）**
   - `useAuthStore`で`setUser`と`setSession`の両方が`isAuthenticated`を設定している
   ```typescript
   setUser: (user) =>
     set({
       user,
       isAuthenticated: user !== null,  // ← ここで設定
     }),

   setSession: (session) =>
     set({
       session,
       isAuthenticated: session !== null,  // ← ここでも設定
     }),
   ```
   - `setSession(session)` → `isAuthenticated: true`
   - その後 `setUser(null)` → `isAuthenticated: false`
   - という競合が発生する可能性がある

### 4.2 データベース側の問題の可能性

1. **RLSポリシーの問題**
   - `users_insert_own`ポリシーが正しく設定されていない可能性がある
   - ポリシーが存在しても、実際に動作していない可能性がある

2. **トランザクションの問題**
   - Supabase Authでユーザーが作成されても、`users`テーブルへのINSERTが失敗する可能性がある
   - エラーが適切にキャッチされていない可能性がある

---

## 5. 想定されるシナリオ

### シナリオ1: Google OAuthログイン（新規ユーザー）

```
1. Google認証成功
2. AuthCallback.tsx が実行される
3. usersテーブルにINSERT（成功）
4. setUser(userData) でストアに設定
5. useAuth.ts の onAuthStateChange が実行される
6. loadUser が実行される
7. データベースの反映遅延により、ユーザーが見つからない
8. loadUser が何もせずに終了（setUser(null)は呼ばれない）
9. 【監査による補足】AuthCallbackで設定したユーザー情報は保持される可能性が高い
   ただし、onAuthStateChangeとAuthCallbackの実行順序によっては不整合になる可能性あり
```

### シナリオ2: Google OAuthログイン（既存ユーザー）

```
1. Google認証成功
2. AuthCallback.tsx が実行される
3. usersテーブルにユーザーが存在することを確認
4. setUser(userData) でストアに設定
5. useAuth.ts の onAuthStateChange が実行される
6. loadUser が実行される
7. ユーザーが見つかる
8. setUser(user) でストアに設定（上書き）
9. 正常に動作する
```

### シナリオ3: 手動アカウント登録（成功ケース）

**【監査による補足: 実行順序の詳細】**
```
1. signUp() が実行される
2. supabase.auth.signUp() でSupabase Authにユーザー作成（成功）
   ↓ この時点で onAuthStateChange が SIGNED_IN イベントで発火（非同期）
3. usersテーブルにINSERT（成功）
4. signUp() が完了（エラーなし）
   ※ しかし signUp() は setUser() を呼んでいない（最重要問題）
5. Signup.tsx が navigate('/onboarding/group-setup') を実行
6. 同時に loadUser() が非同期で実行される
7. loadUser() 実行時点で INSERT が完了しているかは非同期処理の順序による
8. loadUser がユーザーを見つけても、Signup.tsx のナビゲーション後の状態に影響
9. ストアにユーザー情報が設定されない、または設定が遅延する（問題点）
```

**補足: なぜ問題が起きるか**
- `supabase.auth.signUp()`成功時点で`onAuthStateChange`が発火する
- `loadUser()`は非同期で実行されるが、`usersテーブルへのINSERT`がまだ完了していない可能性がある
- `signUp()`が`setUser()`を呼んでいないため、唯一のユーザー情報設定手段が`loadUser()`に依存している

### シナリオ4: 手動アカウント登録（失敗ケース）

```
1. signUp() が実行される
2. supabase.auth.signUp() でSupabase Authにユーザー作成（成功）
3. usersテーブルにINSERT（失敗）
   - RLSポリシーエラー
   - データベースエラー
4. エラーが返される
5. Signup.tsx でエラーメッセージを表示
6. ユーザー登録が完了しない
```

---

## 6. 検証が必要な項目

### 6.1 データベース側の確認

1. **RLSポリシーの確認**
   ```sql
   -- usersテーブルのRLSポリシーを確認
   SELECT * FROM pg_policies WHERE tablename = 'users';
   ```

2. **usersテーブルの確認**
   ```sql
   -- usersテーブルの内容を確認
   SELECT * FROM users ORDER BY created_at DESC LIMIT 10;
   ```

3. **Supabase Auth Logsの確認**
   - Supabase Dashboard → Logs → Auth Logs
   - 認証成功/失敗のログを確認
   - エラーメッセージの有無を確認

### 6.2 フロントエンド側の確認

1. **ブラウザコンソールのログ確認**
   - `Auth callback error:` の有無
   - `Failed to create user record:` の有無
   - `Failed to load user:` の有無

2. **ネットワークタブの確認**
   - `/auth/v1/callback` のリクエスト/レスポンス
   - `/rest/v1/users` のINSERTリクエストの成功/失敗

3. **ストアの状態確認**
   - `useAuthStore` の `user` の値
   - `useAuthStore` の `session` の値
   - `isLoading` の状態

---

## 7. 推奨される修正方針

### 7.1 即座に修正すべき問題

1. **`signUp`関数の改善**
   - ユーザー作成成功後、`setUser`を明示的に呼び出してストアに設定
   - または、作成したユーザー情報を返し、呼び出し側で`setUser`を呼ぶ
   - エラーハンドリングを改善し、RLSポリシーエラーの場合に具体的な解決策を提示

2. **`loadUser`関数の改善**
   - ユーザーが見つからない場合、再試行ロジックを追加（最大3回、指数バックオフ）
   - エラーハンドリングを改善し、適切なログを出力
   - `PGRST116`エラーの場合でも、一定時間待ってから再試行
   - **【監査による補足】** 既に5秒のタイムアウト処理は実装されているが、再試行ロジックはない

3. **`AuthCallback`と`useAuth`の処理の統合**
   - `AuthCallback`でユーザーを作成した後、`loadUser`を明示的に呼び出す
   - または、`AuthCallback`でのユーザー作成を`useAuth`に委譲する
   - 重複処理を避けるため、どちらか一方に処理を集約

4. **エラーメッセージの改善**
   - RLSポリシーエラーの場合、具体的な解決策を提示
   - ユーザーに分かりやすいエラーメッセージを表示

5. **`useAuthStore`の`isAuthenticated`ロジック統一（監査で追加）**
   - `isAuthenticated`を`session !== null`のみに依存させる
   - `setUser`では`isAuthenticated`を設定しないように変更
   - これにより、認証状態の二重設定による競合を防止

### 7.2 長期的な改善

1. **ユーザー作成処理の統一**
   - OAuthログインと手動登録で、同じロジックを使用する
   - ユーザー作成処理を1つの関数に集約

2. **リトライロジックの実装**
   - データベースの反映遅延に対応するため、リトライロジックを追加
   - 指数バックオフを使用した再試行

3. **テストの追加**
   - ユーザー作成のユニットテスト
   - OAuthログインの統合テスト
   - エラーハンドリングのテスト

---

## 8. 次のステップ

1. **データベース側の確認**
   - RLSポリシーが正しく設定されているか確認
   - usersテーブルにレコードが作成されているか確認

2. **ログの収集**
   - ブラウザコンソールのログを収集
   - Supabase Auth Logsを確認

3. **修正の実装**
   - 上記の問題点を修正
   - テストを実行して動作確認

---

## 9. 具体的なコードの問題点

### 9.1 signUp関数の問題

**現在のコード（問題あり）:**
```typescript
const signUp = async (
  email: string,
  password: string,
  displayName: string
): Promise<{ error: AuthError | null }> => {
  // ... Supabase Authにユーザー作成 ...
  
  // ユーザー情報をusersテーブルに作成
  if (data.user) {
    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .insert(userData)
      .select();

    if (insertError) {
      return { error: insertError as AuthError };
    }
    
    // ❌ 問題: setUserを呼んでいない
    // ストアにユーザー情報が設定されない
  }

  return { error: null };
};
```

**問題点:**
- ユーザー作成成功後、`setUser`を呼んでいない
- `onAuthStateChange`が呼ばれて`loadUser`が実行されるが、タイミングの問題でユーザーが見つからない可能性がある
- 結果として、ストアにユーザー情報が設定されず、ユーザーがログイン状態にならない

### 9.2 loadUser関数の問題

**現在のコード（問題あり）:**
```typescript
const loadUser = async (userId: string) => {
  // ... クエリ実行 ...
  
  if (error && error.code !== 'PGRST116') {
    console.error('Failed to load user:', error);
    setLoading(false);
    return; // ❌ 問題: エラーが発生した場合、何もせずに終了
  }

  if (!data) {
    // OAuth認証でユーザーレコードが存在しない場合は作成しない
    // AuthCallbackで処理されるため
    setLoading(false);
    return; // ❌ 問題: ユーザーが見つからない場合、何もせずに終了
  }

  setUser(user);
  setLoading(false);
};
```

**問題点:**
- `PGRST116`エラー（レコードが見つからない）の場合、単に終了するだけで、再試行がない
- データベースの反映遅延により、ユーザーが見つからない可能性がある
- 手動登録の場合、`signUp`でユーザーを作成した後、`loadUser`が実行されるが、ユーザーが見つからない場合、ストアにユーザー情報が設定されない

### 9.3 AuthCallbackの問題

**現在のコード（部分的に問題あり）:**
```typescript
const handleAuthCallback = async () => {
  // ... セッション取得 ...
  
  // ユーザーが存在しない場合は作成
  if (!existingUser || checkError?.code === 'PGRST116') {
    const { error: insertError } = await supabase
      .from('users')
      .insert(newUserData)
      .select();

    if (insertError) {
      throw new Error('ユーザー情報の作成に失敗しました');
    }

    // ✅ 良い: setUserを呼んでいる
    setUser(userData);
  } else {
    // ✅ 良い: 既存ユーザーの場合もsetUserを呼んでいる
    setUser(userData);
  }

  navigate('/');
};
```

**問題点:**
- `AuthCallback`でユーザーを作成し、`setUser`でストアに設定している（これは正しい）
- しかし、その後`useAuth.ts`の`onAuthStateChange`が呼ばれて`loadUser`が実行される可能性がある
- `loadUser`がユーザーを見つけられない場合、何もせずに終了するが、既に`AuthCallback`で`setUser`を呼んでいるので、実際には問題ない可能性がある
- ただし、タイミングによっては、`loadUser`が`setUser(null)`を呼ぶ可能性がある（現在のコードでは呼んでいないが、将来的に問題になる可能性がある）

---

## 10. 修正の優先順位

### 優先度: 高（即座に修正）

1. **`signUp`関数の修正**
   - ユーザー作成成功後、`setUser`を明示的に呼び出す
   - これにより、手動登録時にストアにユーザー情報が確実に設定される

2. **`loadUser`関数の改善**
   - ユーザーが見つからない場合、再試行ロジックを追加
   - データベースの反映遅延に対応するため、最大3回まで再試行（指数バックオフ）

### 優先度: 中（できるだけ早く修正）

3. **エラーハンドリングの改善**
   - RLSポリシーエラーの場合、具体的な解決策を提示
   - ユーザーに分かりやすいエラーメッセージを表示

4. **`AuthCallback`と`useAuth`の処理の統合**
   - 重複処理を避けるため、どちらか一方に処理を集約
   - または、処理の順序を明確にする

5. **`useAuthStore`の`isAuthenticated`ロジック統一（監査で追加）**
   - `setUser`と`setSession`の両方が`isAuthenticated`を設定している問題を解消
   - `isAuthenticated`を`session`のみに依存させる

### 優先度: 低（長期的な改善）

5. **テストの追加**
   - ユーザー作成のユニットテスト
   - OAuthログインの統合テスト
   - エラーハンドリングのテスト

---

## 11. 監査結果サマリー（2026年1月15日追加）

### 監査で確認された正確な点

| 項目 | 評価 |
|------|------|
| 問題の特定 | **良好**（主要な問題は正しく特定） |
| コード引用の正確性 | **良好**（行番号・コード内容は正確） |
| 修正方針 | **妥当** |

### 監査で追加・補足された点

1. **`isAuthenticated`の二重設定問題**（セクション4.1に追加）
   - `useAuthStore`の設計上の問題を新たに特定

2. **タイムアウト処理の存在**（セクション3.1に補足）
   - 既に5秒のタイムアウト処理が実装されていることを追記

3. **シナリオ1の説明補足**（セクション5に補足）
   - `loadUser`は`setUser(null)`を呼んでいないため、AuthCallbackで設定した値は保持される可能性があることを追記

4. **シナリオ3の詳細化**（セクション5に補足）
   - `onAuthStateChange`と`signUp`の非同期実行順序の詳細を追記

### 監査結論

調査書は実用的なレベルで正確であり、記載された修正を実施すれば問題の大部分は解消されると考えられる。特に「手動登録時の`setUser`漏れ」は最重要の問題として正しく特定されている。

---

## 12. ネクストアクション（2026年1月15日策定）

### 12.1 修正実施方針の選択

監査結果に基づき、以下の2つの修正アプローチを提案します。

#### オプションA: Quick Fix（段階的修正）
**手順:**
1. 最重要問題（`signUp`の`setUser`漏れ）を優先修正
2. 動作確認後、順次他の問題を修正
3. 各修正後にテストを実行

**メリット:**
- 早期に最重要問題を解消できる
- 各修正の影響範囲を確認しながら進められる
- 問題が発生した場合、原因を特定しやすい

**デメリット:**
- 複数回のテスト・デプロイが必要
- 根本的な設計問題（重複処理、二重設定）は後回し

**推奨ケース:** 現在の問題が緊急で、早期に解決が必要な場合

---

#### オプションB: Comprehensive Fix（包括的修正）
**手順:**
1. 認証フローの全体的な設計を見直し
2. 重複処理、二重設定、エラーハンドリングを一括で改善
3. 統合テストで全体的な動作を確認

**メリット:**
- 根本的な設計問題を解消できる
- 将来的なメンテナンス性が向上
- 一度のテスト・デプロイで完了

**デメリット:**
- 修正範囲が広く、時間がかかる
- 影響範囲が大きいため、予期しない副作用のリスクがある

**推奨ケース:** 時間的余裕があり、根本的な改善を目指す場合

---

### 12.2 【オプションA】Quick Fix の実施計画

#### フェーズ1: 最重要問題の修正（優先度: 高）

**修正1-1: `signUp`関数に`setUser`を追加**

**ファイル:** `src/hooks/useAuth.ts`（112-172行目）

**修正内容:**
```typescript
// 修正前（164-167行目）
console.log('signUp: User record created successfully:', insertData);
      }

      return { error: null };

// 修正後
console.log('signUp: User record created successfully:', insertData);
        
        // 作成したユーザー情報をストアに設定
        if (insertData && insertData.length > 0) {
          const createdUser: User = {
            id: insertData[0].id,
            email: insertData[0].email,
            displayName: insertData[0].display_name,
            avatarUrl: insertData[0].avatar_url || null,
            createdAt: insertData[0].created_at,
            updatedAt: insertData[0].updated_at,
          };
          setUser(createdUser);
          console.log('signUp: User set in store:', createdUser);
        }
      }

      return { error: null };
```

**テスト手順:**
1. 手動アカウント登録を実行
2. ブラウザコンソールで「User set in store」ログを確認
3. React DevToolsで`useAuthStore`の`user`が設定されていることを確認
4. オンボーディング画面に正しく遷移することを確認

---

**修正1-2: `Signup.tsx`のナビゲーション処理を改善**

**ファイル:** `src/screens/auth/Signup.tsx`（42-46行目）

**修正内容:**
```typescript
// 修正前
} else {
  showToast('アカウントを作成しました', 'success');
  // サインアップ後、オンボーディング画面へ
  navigate('/onboarding/group-setup');
}

// 修正後
} else {
  showToast('アカウントを作成しました', 'success');
  // setLoading(false)を追加して、ローディング状態を解除
  setIsLoading(false);
  // 少し待ってからナビゲーション（ストアの更新を待つ）
  setTimeout(() => {
    navigate('/onboarding/group-setup');
  }, 100);
}
```

**理由:** `signUp`でストアが更新された後にナビゲーションを実行することで、ProtectedRouteがユーザー情報を正しく認識できる

---

#### フェーズ2: エラーハンドリングの改善（優先度: 中）

**修正2-1: `loadUser`に再試行ロジックを追加**

**ファイル:** `src/hooks/useAuth.ts`（51-107行目）

**修正内容:**
```typescript
/**
 * ユーザー情報を読み込む（再試行ロジック付き）
 */
const loadUser = async (userId: string, retryCount = 0) => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1000; // 1秒
  
  try {
    // タイムアウト付きクエリ（5秒）
    const queryPromise = supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout after 5s')), 5000)
    );
    
    let data = null;
    let error = null;
    
    try {
      const result = await Promise.race([queryPromise, timeoutPromise]);
      data = result.data;
      error = result.error;
    } catch (e) {
      console.error('User query timeout or error:', e);
      setLoading(false);
      return;
    }

    if (error && error.code !== 'PGRST116') {
      console.error('Failed to load user:', error);
      setLoading(false);
      return;
    }

    if (!data) {
      // ユーザーが見つからない場合、再試行
      if (retryCount < MAX_RETRIES) {
        console.log(`User not found, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (retryCount + 1)));
        return loadUser(userId, retryCount + 1);
      }
      
      // 最大再試行回数を超えた場合
      console.warn('User not found after max retries. OAuth callback will handle user creation.');
      setLoading(false);
      return;
    }

    // データベースのスネークケースをキャメルケースに変換
    const user: User = {
      id: data.id,
      email: data.email,
      displayName: data.display_name,
      avatarUrl: data.avatar_url,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    setUser(user);
    setLoading(false);
  } catch (error) {
    console.error('Failed to load user:', error);
    setLoading(false);
  }
};
```

**テスト手順:**
1. 手動アカウント登録を実行
2. ブラウザコンソールで再試行ログを確認
3. 最終的にユーザー情報が正しく読み込まれることを確認

---

#### フェーズ3: ストアの改善（優先度: 中）

**修正3-1: `useAuthStore`の`isAuthenticated`ロジックを統一**

**ファイル:** `src/stores/useAuthStore.ts`（34-44行目）

**修正内容:**
```typescript
// 修正前
setUser: (user) =>
  set({
    user,
    isAuthenticated: user !== null,
  }),

setSession: (session) =>
  set({
    session,
    isAuthenticated: session !== null,
  }),

// 修正後
setUser: (user) =>
  set({
    user,
    // isAuthenticatedはsessionのみで判定するため、ここでは設定しない
  }),

setSession: (session) =>
  set({
    session,
    isAuthenticated: session !== null,  // sessionのみで判定
  }),
```

**理由:** 
- 認証状態は`session`の存在のみで判定すべき（Supabase Authの仕様に合わせる）
- `user`と`session`の両方で`isAuthenticated`を設定すると、競合状態が発生する可能性がある

**テスト手順:**
1. ログイン/ログアウトを繰り返し、`isAuthenticated`が正しく動作することを確認
2. OAuth認証と手動認証の両方でテスト

---

### 12.3 【オプションB】Comprehensive Fix の実施計画

#### アプローチ: 認証フローの全体的な再設計

**設計方針:**
1. **ユーザー情報の取得・設定を一元化**
   - `useAuth`のみがユーザー情報を設定する責任を持つ
   - `AuthCallback`はユーザー作成のみを行い、設定は`useAuth`に委譲

2. **`onAuthStateChange`を信頼する設計**
   - `onAuthStateChange`が確実にユーザー情報を設定する
   - 再試行ロジックを実装し、タイミング問題を解消

3. **認証状態の管理を簡素化**
   - `isAuthenticated`は`session !== null`のみで判定
   - `user`情報は別途管理（認証状態とユーザー情報を分離）

**主要な変更点:**

**変更1: `useAuth.ts`の全面的な改善**
- `loadUser`に再試行ロジックを追加
- `signUp`に`setUser`を追加
- 重複処理を防ぐためのフラグ管理

**変更2: `AuthCallback.tsx`の簡素化**
- ユーザー作成後、`setUser`を呼ばない
- `onAuthStateChange`に処理を委譲

**変更3: `useAuthStore.ts`の改善**
- `isAuthenticated`の判定ロジックを統一

**実装の詳細は「Option B 実装ガイド」として別ドキュメントを作成することを推奨**

---

### 12.4 実施チェックリスト

#### 事前準備
- [ ] 現在のコードをGitでコミット（ロールバック用）
- [ ] 開発環境でテスト環境を準備
- [ ] Supabase Dashboardでテストユーザーを削除（クリーンな状態でテスト）

#### 修正実施
- [ ] **フェーズ1-1**: `signUp`に`setUser`を追加
- [ ] **フェーズ1-2**: `Signup.tsx`のナビゲーション処理を改善
- [ ] 手動登録のテスト実行（新規ユーザー）
- [ ] **フェーズ2-1**: `loadUser`に再試行ロジックを追加
- [ ] OAuth認証のテスト実行（新規ユーザー）
- [ ] OAuth認証のテスト実行（既存ユーザー）
- [ ] **フェーズ3-1**: `useAuthStore`の改善
- [ ] 全体的な認証フローのテスト

#### テスト項目
- [ ] 手動登録（新規ユーザー）→ オンボーディング画面に遷移
- [ ] 手動登録（既存メール）→ エラーメッセージ表示
- [ ] Google OAuth（新規ユーザー）→ オンボーディング画面に遷移
- [ ] Google OAuth（既存ユーザー）→ ホーム画面に遷移
- [ ] ログアウト → ログイン画面に遷移
- [ ] ログイン（手動）→ ホーム画面に遷移
- [ ] ブラウザリロード後もログイン状態が保持されることを確認

#### 確認事項
- [ ] ブラウザコンソールにエラーログがないことを確認
- [ ] React DevToolsで`useAuthStore`の状態を確認
- [ ] Supabase Dashboardで`users`テーブルにレコードが作成されていることを確認
- [ ] 複数のブラウザ/デバイスでテスト

#### 完了後
- [ ] 修正内容をGitでコミット
- [ ] プルリクエストを作成（レビュー用）
- [ ] このドキュメントに「実施結果」セクションを追加

---

### 12.5 推奨: オプションAから開始

**理由:**
1. 最重要問題（`signUp`の`setUser`漏れ）は明確で、修正の影響範囲も限定的
2. 早期に問題を解決し、ユーザー体験を改善できる
3. フェーズ2, 3は独立しているため、後から追加修正が可能

**次のステップ:**
1. オプションAのフェーズ1を実施
2. 動作確認後、フェーズ2, 3を順次実施
3. 全体的な動作に問題がなければ、オプションBの検討は不要

---

## 13. 実施結果（オプションB: Comprehensive Fix）

**実施日:** 2026年1月15日  
**実施方針:** オプションB（包括的修正）に従って認証フロー全体を再設計

### 13.1 実施した修正内容

#### 修正1: `useAuthStore.ts` - `isAuthenticated`ロジックの統一

**変更内容:**
- `setUser`から`isAuthenticated`の設定を削除
- `isAuthenticated`は`session !== null`のみで判定するように変更

**理由:**
- 認証状態とユーザー情報の管理を分離
- `setUser`と`setSession`の両方が`isAuthenticated`を設定することによる競合状態を解消

**ファイル:** `src/stores/useAuthStore.ts`（34-44行目）

---

#### 修正2: `useAuth.ts` - `loadUser`に再試行ロジックを追加

**変更内容:**
- `loadUser`関数に再試行ロジックを追加（最大3回、指数バックオフ）
- ユーザーが見つからない場合（`PGRST116`エラーまたは`data === null`）、自動的に再試行
- 再試行間隔: 1秒、2秒、4秒（指数バックオフ）

**理由:**
- データベースへの反映遅延に対応
- OAuth認証の場合、`AuthCallback`でユーザーが作成されるまでの時間を考慮
- `onAuthStateChange`を信頼する設計として、確実にユーザー情報を取得

**ファイル:** `src/hooks/useAuth.ts`（48-107行目）

**主な変更点:**
```typescript
const loadUser = async (userId: string, retryCount = 0) => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1000;
  
  // ... クエリ実行 ...
  
  if (!data || error?.code === 'PGRST116') {
    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));
      return loadUser(userId, retryCount + 1);
    }
    // 最大再試行回数を超えた場合の処理
  }
  // ...
};
```

---

#### 修正3: `useAuth.ts` - `signUp`に`setUser`を追加

**変更内容:**
- `signUp`関数でユーザー作成成功後、`setUser`を明示的に呼び出す
- 作成したユーザー情報をストアに設定

**理由:**
- 手動登録時にストアにユーザー情報が確実に設定される
- `onAuthStateChange`が呼ばれる前にユーザー情報が利用可能になる

**ファイル:** `src/hooks/useAuth.ts`（164-180行目）

**主な変更点:**
```typescript
if (insertData && insertData.length > 0) {
  const createdUser: User = {
    id: insertData[0].id,
    email: insertData[0].email,
    displayName: insertData[0].display_name,
    avatarUrl: insertData[0].avatar_url || null,
    createdAt: insertData[0].created_at,
    updatedAt: insertData[0].updated_at,
  };
  setUser(createdUser);
  console.log('signUp: User set in store:', createdUser);
}
```

---

#### 修正4: `AuthCallback.tsx` - ユーザー情報設定の委譲

**変更内容:**
- `setUser`呼び出しを削除
- ユーザー情報の設定を`onAuthStateChange`（`useAuth.loadUser`）に委譲
- ナビゲーション前に500ms待機（`onAuthStateChange`の実行時間を確保）
- 不要なimport（`useAuthStore`, `User`型）を削除

**理由:**
- ユーザー情報の取得・設定を`useAuth`に一元化
- 重複処理を避け、設計を簡素化
- `onAuthStateChange`を信頼する設計として、確実にユーザー情報を設定

**ファイル:** `src/screens/auth/AuthCallback.tsx`（全体）

**主な変更点:**
- `setUser(userData)`の呼び出しを削除
- ユーザー作成後、`await new Promise(resolve => setTimeout(resolve, 500))`を追加
- コメントで設計方針を明確化

---

### 13.2 設計方針の実現

#### ✅ ユーザー情報の取得・設定を一元化
- `useAuth`のみがユーザー情報を設定する責任を持つ
- `AuthCallback`はユーザー作成のみを行い、設定は`useAuth`に委譲

#### ✅ `onAuthStateChange`を信頼する設計
- `onAuthStateChange`が確実にユーザー情報を設定する
- 再試行ロジックを実装し、タイミング問題を解消

#### ✅ 認証状態の管理を簡素化
- `isAuthenticated`は`session !== null`のみで判定
- `user`情報は別途管理（認証状態とユーザー情報を分離）

---

### 13.3 修正後の動作フロー

#### 手動登録フロー
```
1. signUp() 実行
2. supabase.auth.signUp() 成功 → onAuthStateChange 発火（非同期）
3. usersテーブルにINSERT
4. setUser(createdUser) でストアに設定 ← 新規追加
5. Signup.tsx が navigate('/onboarding/group-setup') 実行
6. onAuthStateChange が loadUser() を実行
7. loadUser() がユーザーを取得（再試行ロジック付き）
8. setUser(user) でストアを更新（既に設定済みでも更新）
```

#### OAuth認証フロー
```
1. Google認証成功
2. AuthCallback.tsx が実行される
3. usersテーブルにINSERT（存在しない場合）
4. 500ms待機（onAuthStateChangeの実行時間を確保）
5. navigate('/') 実行
6. onAuthStateChange が loadUser() を実行
7. loadUser() がユーザーを取得（再試行ロジック付き）
8. setUser(user) でストアに設定 ← AuthCallbackでは設定しない
```

---

### 13.4 テスト項目

以下のテストを実施する必要があります：

- [ ] 手動登録（新規ユーザー）→ オンボーディング画面に遷移
- [ ] 手動登録（既存メール）→ エラーメッセージ表示
- [ ] Google OAuth（新規ユーザー）→ ホーム画面に遷移
- [ ] Google OAuth（既存ユーザー）→ ホーム画面に遷移
- [ ] ログアウト → ログイン画面に遷移
- [ ] ログイン（手動）→ ホーム画面に遷移
- [ ] ブラウザリロード後もログイン状態が保持されることを確認
- [ ] ブラウザコンソールにエラーログがないことを確認
- [ ] React DevToolsで`useAuthStore`の状態を確認
- [ ] Supabase Dashboardで`users`テーブルにレコードが作成されていることを確認

---

### 13.5 注意事項

1. **AuthCallbackの500ms待機**
   - これは`onAuthStateChange`が実行される時間を確保するための暫定措置
   - 将来的には、より確実な方法（イベント待機など）に置き換えることを検討

2. **再試行ロジックの最大回数**
   - 現在は3回に設定されているが、環境によっては調整が必要な可能性がある

3. **`signUp`と`onAuthStateChange`の重複設定**
   - `signUp`で`setUser`を呼び、その後`onAuthStateChange`でも`setUser`が呼ばれる
   - これは問題ないが、最終的には`onAuthStateChange`のみに統一することも検討可能

---

## 14. 参考資料

- [DEBUG_OAUTH.md](./DEBUG_OAUTH.md) - OAuth認証のデバッグガイド
- [04-auth-design.md](./architecture/04-auth-design.md) - 認証設計ドキュメント
- [rls-policies.sql](./supabase/rls-policies.sql) - RLSポリシーの定義

---

**調査者:** AI Assistant  
**最終更新:** 2026年1月13日  
**監査日:** 2026年1月15日  
**監査内容:** 実際のコードとの整合性確認、欠落している問題点の追加、不正確な記述の補足  
**ネクストアクション策定日:** 2026年1月15日  
**修正実施日:** 2026年1月15日  
**修正方針:** オプションB（Comprehensive Fix）

---

## 15. 現在の状況と引き継ぎ事項（2026年1月15日）

### 15.1 現在の状況

**問題:** ユーザー登録後、ホーム画面に遷移したが、`public.users`テーブルにレコードが作成されていない。

**実施した修正:**
1. ✅ `useAuth.ts`の`signUp`関数から`public.users`への直接INSERTを削除
2. ✅ `AuthCallback.tsx`から`public.users`への直接INSERTを削除
3. ✅ PostgreSQLトリガー（`handle_new_user`）の作成SQLを提供
4. ✅ `useAuthStore`の`isAuthenticated`ロジックを統一（`session`のみに依存）

### 15.2 ログ分析結果（2026年1月15日）

**ログファイル:** `/Users/tetsuichikawa/Workspace/ourhome-finance/.cursor/debug.log`

**重要な発見:**

1. **signUpは成功している**
   ```json
   {"location":"useAuth.ts:145","message":"signUp: Starting","data":{"email":"akisue138@gmail.com","displayName":"あああ"},"timestamp":1768466339384}
   {"location":"useAuth.ts:170","message":"signUp: Auth success","data":{"userId":"a456e668-a325-48da-ba62-4efd37ca50eb","email":"akisue138@gmail.com"},"timestamp":1768466341292}
   ```
   - ✅ `supabase.auth.signUp()`は成功
   - ✅ 新しいユーザーID: `a456e668-a325-48da-ba62-4efd37ca50eb`

2. **セッションが古いユーザーIDのまま**
   - ❌ その後の`loadUser`は古いユーザーID（`172f1a47-6dd9-402c-ae4f-aa6b1a1217b7`）で呼ばれている
   - ❌ 新しいユーザーのセッションに切り替わっていない

3. **`public.users`テーブルにレコードが作成されていない**
   - ❌ トリガーが動作していない可能性
   - ❌ または、トリガーは動作したが、別の問題が発生している可能性

### 15.3 確認が必要な項目

以下のSQLをSupabase SQL Editorで実行して、状況を確認する必要があります：

```sql
-- 1. auth.usersに新しいユーザーが存在するか確認
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'akisue138@gmail.com';

-- 2. public.usersにユーザーが存在するか確認
SELECT id, email, display_name, created_at 
FROM public.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. トリガーが存在するか確認
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public' OR event_object_schema = 'auth';

-- 4. トリガー関数が存在するか確認
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'handle_new_user';
```

### 15.4 想定される原因

1. **トリガーが作成されていない**
   - 提供したSQLが実行されていない
   - または、実行時にエラーが発生した

2. **トリガーは存在するが、動作していない**
   - トリガーの定義に問題がある
   - `SECURITY DEFINER`が正しく設定されていない
   - RLSポリシーがトリガー関数の実行を妨げている

3. **メール確認が有効になっている**
   - Supabaseの設定でメール確認が必須の場合、`auth.users`にユーザーが作成されても、確認完了まで`public.users`へのINSERTが遅延する可能性
   - ただし、トリガーは`AFTER INSERT ON auth.users`なので、通常は即座に実行されるはず

4. **セッション管理の問題**
   - `signUp`後、新しいユーザーのセッションが確立されていない
   - `onAuthStateChange`が新しいセッションを検出していない

### 15.5 次のステップ

1. **即座に確認すべき項目:**
   - [ ] Supabase SQL Editorで上記の4つのSQLを実行
   - [ ] `auth.users`に`akisue138@gmail.com`が存在するか確認
   - [ ] `public.users`に同じユーザーが存在するか確認
   - [ ] トリガーと関数が存在するか確認

2. **トリガーが存在しない場合:**
   - 以下のSQLを実行してトリガーを作成：
   ```sql
   CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS TRIGGER AS $$
   BEGIN
     INSERT INTO public.users (id, email, display_name, avatar_url)
     VALUES (
       NEW.id,
       NEW.email,
       COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
       NEW.raw_user_meta_data->>'avatar_url'
     );
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   CREATE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
   ```

3. **トリガーが存在するが動作していない場合:**
   - トリガー関数のログを追加して、実行されているか確認
   - `SECURITY DEFINER`が正しく設定されているか確認
   - RLSポリシーがトリガー関数の実行を妨げていないか確認

4. **セッション管理の問題の場合:**
   - `signUp`後、明示的に`supabase.auth.getSession()`を呼び出してセッションを取得
   - `onAuthStateChange`が正しく動作しているか確認
   - メール確認設定を確認（確認が必須の場合、確認完了までセッションが確立されない）

### 15.6 デバッグログの場所

- **ログファイル:** `/Users/tetsuichikawa/Workspace/ourhome-finance/.cursor/debug.log`
- **ログ形式:** NDJSON（1行1JSONオブジェクト）
- **ログサーバー:** `http://127.0.0.1:7242/ingest/a6e9385b-8e06-4366-a440-e52a9ac06ff6`

### 15.7 関連ファイル

- `/Users/tetsuichikawa/Workspace/ourhome-finance/src/hooks/useAuth.ts` - 認証ロジック
- `/Users/tetsuichikawa/Workspace/ourhome-finance/src/screens/auth/AuthCallback.tsx` - OAuthコールバック処理
- `/Users/tetsuichikawa/Workspace/ourhome-finance/src/stores/useAuthStore.ts` - 認証状態管理

### 15.8 注意事項

- デバッグログは現在も有効です。新しいテストを実行する前に、ログファイルをクリアしてください
- トリガーの作成は、Supabase DashboardのSQL Editorで実行する必要があります
- トリガーは`SECURITY DEFINER`で実行されるため、RLSポリシーをバイパスします
