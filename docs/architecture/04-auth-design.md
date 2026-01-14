# 認証・権限設計

## 概要

本ドキュメントでは、Supabase Authを使用した認証・認可の設計を定義します。

---

## 認証方式

### サポートする認証方法

| 方法 | 優先度 | 説明 |
|------|--------|------|
| メール + パスワード | 必須 | 基本的な認証方法 |
| Google OAuth | 推奨 | ソーシャルログイン |
| Apple OAuth | 推奨 | iOS向け（App Store要件） |
| Magic Link | 任意 | パスワードレス認証 |

---

## 認証フロー

### 1. 新規登録フロー

```
┌─────────────────────────────────────────────────────────────┐
│                    新規登録画面                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  メールアドレス: [________________]                   │   │
│  │  パスワード:     [________________]                   │   │
│  │  表示名:         [________________]                   │   │
│  │                                                       │   │
│  │  [新規登録]                                          │   │
│  │                                                       │   │
│  │  ─────────── または ───────────                       │   │
│  │                                                       │   │
│  │  [G] Googleで登録  [🍎] Appleで登録                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   メール確認待ち                             │
│  確認メールを送信しました。メール内のリンクをクリックして     │
│  ください。                                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (メール確認完了)
┌─────────────────────────────────────────────────────────────┐
│                 オンボーディング                             │
│  1. グループ作成 or 参加                                    │
│  2. 初期設定（任意）                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      ホーム画面                              │
└─────────────────────────────────────────────────────────────┘
```

### 2. ログインフロー

```
┌─────────────────────────────────────────────────────────────┐
│                      ログイン画面                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  メールアドレス: [________________]                   │   │
│  │  パスワード:     [________________]                   │   │
│  │                                                       │   │
│  │  [ログイン]                                          │   │
│  │                                                       │   │
│  │  パスワードをお忘れですか？                           │   │
│  │                                                       │   │
│  │  ─────────── または ───────────                       │   │
│  │                                                       │   │
│  │  [G] Googleでログイン  [🍎] Appleでログイン           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  認証成功？      │
                    └────────┬────────┘
                   Yes │           │ No
                       ▼           ▼
              ┌─────────────┐  ┌─────────────┐
              │ グループ    │  │ エラー表示   │
              │ 所属確認    │  │ 再試行促す   │
              └──────┬──────┘  └─────────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
    ┌───────────┐        ┌───────────┐
    │ グループ  │        │ グループ  │
    │ あり      │        │ なし      │
    └─────┬─────┘        └─────┬─────┘
          │                    │
          ▼                    ▼
    ┌───────────┐        ┌───────────┐
    │ ホーム    │        │ 作成/参加 │
    │ 画面へ    │        │ 画面へ    │
    └───────────┘        └───────────┘
```

### 3. パスワードリセットフロー

```
パスワードリセット要求
        │
        ▼
リセットメール送信
        │
        ▼
メール内リンククリック
        │
        ▼
新パスワード設定画面
        │
        ▼
パスワード更新完了
        │
        ▼
ログイン画面へリダイレクト
```

---

## OAuth設定

### Google OAuth

```typescript
// Supabase Dashboard で設定
// Authentication > Providers > Google

{
  enabled: true,
  client_id: 'GOOGLE_CLIENT_ID',
  secret: 'GOOGLE_CLIENT_SECRET',
}
```

**取得するスコープ**:
- `email`
- `profile`

### Apple OAuth

```typescript
// Supabase Dashboard で設定
// Authentication > Providers > Apple

{
  enabled: true,
  client_id: 'APPLE_SERVICE_ID',
  secret: 'APPLE_SECRET_KEY',
}
```

---

## セッション管理

### セッション設定

```typescript
// Supabase Dashboard で設定
// Authentication > Settings

{
  // セッション有効期間
  jwt_expiry: 3600, // 1時間
  
  // リフレッシュトークン有効期間
  refresh_token_expiry: 604800, // 7日間
  
  // 自動リフレッシュ
  auto_refresh_token: true,
}
```

### クライアント側のセッション管理

```typescript
// セッション監視
useEffect(() => {
  // 初期セッション取得
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
    setUser(session?.user ?? null);
  });

  // セッション変更を監視
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);
    setUser(session?.user ?? null);
  });

  return () => subscription.unsubscribe();
}, []);
```

### トークンリフレッシュ

```typescript
// 自動リフレッシュ（Supabaseクライアントが自動処理）
// 手動リフレッシュが必要な場合:
const { data, error } = await supabase.auth.refreshSession();
```

---

## 権限管理

### 権限レベル定義

```typescript
enum MemberRole {
  OWNER = 'owner',   // グループ作成者、全権限
  ADMIN = 'admin',   // 管理者、メンバー管理以外の全権限
  MEMBER = 'member', // 一般メンバー、自分の取引の編集/削除
  VIEWER = 'viewer', // 閲覧者、閲覧のみ
}
```

### 権限マトリックス

| 操作 | owner | admin | member | viewer |
|------|:-----:|:-----:|:------:|:------:|
| 取引閲覧 | ✅ | ✅ | ✅ | ✅ |
| 取引作成 | ✅ | ✅ | ✅ | ❌ |
| 自分の取引編集 | ✅ | ✅ | ✅ | ❌ |
| 他人の取引編集 | ✅ | ✅ | ❌ | ❌ |
| 自分の取引削除 | ✅ | ✅ | ✅ | ❌ |
| 他人の取引削除 | ✅ | ✅ | ❌ | ❌ |
| 予算編集 | ✅ | ✅ | ❌ | ❌ |
| カテゴリ管理 | ✅ | ✅ | ❌ | ❌ |
| 目標管理 | ✅ | ✅ | ✅ | ❌ |
| メンバー招待 | ✅ | ✅ | ❌ | ❌ |
| メンバー権限変更 | ✅ | ❌ | ❌ | ❌ |
| メンバー削除 | ✅ | ❌ | ❌ | ❌ |
| グループ設定変更 | ✅ | ❌ | ❌ | ❌ |
| グループ削除 | ✅ | ❌ | ❌ | ❌ |

### 権限チェックユーティリティ

```typescript
// types/auth.ts
interface Permission {
  canViewTransactions: boolean;
  canCreateTransactions: boolean;
  canEditOwnTransactions: boolean;
  canEditAllTransactions: boolean;
  canDeleteOwnTransactions: boolean;
  canDeleteAllTransactions: boolean;
  canEditBudgets: boolean;
  canManageCategories: boolean;
  canManageGoals: boolean;
  canInviteMembers: boolean;
  canChangeMemberRoles: boolean;
  canRemoveMembers: boolean;
  canEditGroupSettings: boolean;
  canDeleteGroup: boolean;
}

function getPermissions(role: MemberRole): Permission {
  switch (role) {
    case MemberRole.OWNER:
      return {
        canViewTransactions: true,
        canCreateTransactions: true,
        canEditOwnTransactions: true,
        canEditAllTransactions: true,
        canDeleteOwnTransactions: true,
        canDeleteAllTransactions: true,
        canEditBudgets: true,
        canManageCategories: true,
        canManageGoals: true,
        canInviteMembers: true,
        canChangeMemberRoles: true,
        canRemoveMembers: true,
        canEditGroupSettings: true,
        canDeleteGroup: true,
      };
    case MemberRole.ADMIN:
      return {
        canViewTransactions: true,
        canCreateTransactions: true,
        canEditOwnTransactions: true,
        canEditAllTransactions: true,
        canDeleteOwnTransactions: true,
        canDeleteAllTransactions: true,
        canEditBudgets: true,
        canManageCategories: true,
        canManageGoals: true,
        canInviteMembers: true,
        canChangeMemberRoles: false,
        canRemoveMembers: false,
        canEditGroupSettings: false,
        canDeleteGroup: false,
      };
    case MemberRole.MEMBER:
      return {
        canViewTransactions: true,
        canCreateTransactions: true,
        canEditOwnTransactions: true,
        canEditAllTransactions: false,
        canDeleteOwnTransactions: true,
        canDeleteAllTransactions: false,
        canEditBudgets: false,
        canManageCategories: false,
        canManageGoals: true,
        canInviteMembers: false,
        canChangeMemberRoles: false,
        canRemoveMembers: false,
        canEditGroupSettings: false,
        canDeleteGroup: false,
      };
    case MemberRole.VIEWER:
      return {
        canViewTransactions: true,
        canCreateTransactions: false,
        canEditOwnTransactions: false,
        canEditAllTransactions: false,
        canDeleteOwnTransactions: false,
        canDeleteAllTransactions: false,
        canEditBudgets: false,
        canManageCategories: false,
        canManageGoals: false,
        canInviteMembers: false,
        canChangeMemberRoles: false,
        canRemoveMembers: false,
        canEditGroupSettings: false,
        canDeleteGroup: false,
      };
  }
}
```

### 権限フック

```typescript
// hooks/usePermissions.ts
function usePermissions() {
  const { currentGroup } = useAppStore();
  const { user } = useAuthStore();
  
  const membership = useMemo(() => {
    if (!currentGroup || !user) return null;
    return currentGroup.members.find(m => m.userId === user.id);
  }, [currentGroup, user]);
  
  const permissions = useMemo(() => {
    if (!membership) return null;
    return getPermissions(membership.role);
  }, [membership]);
  
  const canEdit = useCallback((transaction: Transaction) => {
    if (!permissions || !user) return false;
    if (permissions.canEditAllTransactions) return true;
    if (permissions.canEditOwnTransactions && transaction.createdBy === user.id) return true;
    return false;
  }, [permissions, user]);
  
  const canDelete = useCallback((transaction: Transaction) => {
    if (!permissions || !user) return false;
    if (permissions.canDeleteAllTransactions) return true;
    if (permissions.canDeleteOwnTransactions && transaction.createdBy === user.id) return true;
    return false;
  }, [permissions, user]);
  
  return {
    role: membership?.role ?? null,
    permissions,
    canEdit,
    canDelete,
  };
}
```

---

## UI制御

### 権限に基づくUI表示

```typescript
// 編集ボタンの表示制御
function TransactionItem({ transaction }: Props) {
  const { canEdit, canDelete } = usePermissions();
  
  return (
    <div>
      {/* 取引情報 */}
      
      {/* 権限がある場合のみ表示 */}
      {canEdit(transaction) && (
        <button onClick={handleEdit}>編集</button>
      )}
      
      {canDelete(transaction) && (
        <button onClick={handleDelete}>削除</button>
      )}
    </div>
  );
}
```

### 権限不足時のフィードバック

```typescript
// 権限不足時の操作
function handleAction() {
  if (!permissions?.canEditBudgets) {
    showToast('この操作には権限がありません', 'error');
    return;
  }
  // 処理を実行
}
```

---

## 保護されたルート

### ルートガード実装

```typescript
// components/ProtectedRoute.tsx
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireGroup?: boolean;
}

function ProtectedRoute({ children, requireGroup = true }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { currentGroupId } = useAppStore();
  const location = useLocation();
  
  // ローディング中
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  // 未認証 → ログインへ
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // グループ未選択 → グループ選択/作成へ
  if (requireGroup && !currentGroupId) {
    return <Navigate to="/onboarding" replace />;
  }
  
  return <>{children}</>;
}
```

### ルート構成

```typescript
// App.tsx
function App() {
  return (
    <Routes>
      {/* 公開ルート */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      {/* 保護ルート（グループ不要） */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute requireGroup={false}>
            <Onboarding />
          </ProtectedRoute>
        }
      />
      
      {/* 保護ルート（グループ必須） */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Outlet />
            </Layout>
          </ProtectedRoute>
        }
      >
        <Route index element={<Home />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        {/* ... */}
      </Route>
    </Routes>
  );
}
```

---

## オンボーディングフロー

### 画面構成

```
1. ウェルカム画面
   ├─ グループを作成する → 2a
   └─ 招待コードで参加する → 2b

2a. グループ作成
   ├─ グループ名
   ├─ 通貨（デフォルト: JPY）
   └─ 月の開始日（デフォルト: 1日）
   
2b. グループ参加
   └─ 招待コード入力 or QRスキャン

3. プロフィール設定（任意）
   ├─ 表示名
   └─ アバター

4. カテゴリテンプレート選択（任意）
   ├─ カップル向け
   ├─ ルームシェア向け
   └─ カスタム

5. 完了 → ホーム画面へ
```

### グループ招待フロー

```
招待する側:
1. 設定 > メンバー管理
2. 「招待リンクを生成」をタップ
3. QRコード or リンクを共有

参加する側:
1. リンクをクリック or QRスキャン
2. ログイン（未ログインの場合）
3. グループに自動参加
4. ホーム画面へ
```

---

## セキュリティ考慮事項

### 1. パスワードポリシー

```typescript
// 最小要件
const passwordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false, // 任意
};

function validatePassword(password: string): string[] {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('パスワードは8文字以上必要です');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('大文字を含めてください');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('小文字を含めてください');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('数字を含めてください');
  }
  
  return errors;
}
```

### 2. レート制限

Supabase側で設定:
- ログイン試行: 5回/分
- パスワードリセット: 3回/時

### 3. セッションセキュリティ

- JWTトークンは短い有効期限（1時間）
- リフレッシュトークンで自動更新
- ログアウト時にすべてのセッションを無効化可能

### 4. 招待コードセキュリティ

- 招待コードは一意のランダム文字列（20文字）
- 有効期限なし（明示的に再生成で無効化）
- グループオーナーのみ再生成可能

---

## 認証状態の初期化とリダイレクト

### セッション復元時のフロー

ページロード時やブラウザリロード時、既存セッションがある場合の処理フローを定義します。

```
ページロード
    │
    ▼
┌─────────────────┐
│ セッション確認   │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
  あり       なし
    │         │
    ▼         ▼
┌─────────┐  ┌─────────────┐
│ ユーザー │  │ ログイン    │
│ 情報取得 │  │ 画面へ      │
└────┬────┘  └─────────────┘
     │
     ▼
┌─────────────────┐
│ グループ所属確認 │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
  あり       なし
    │         │
    ▼         ▼
┌─────────┐  ┌─────────────┐
│ ホーム  │  │ オンボード  │
│ 画面へ  │  │ 画面へ      │
└─────────┘  └─────────────┘
```

### 認証状態の管理

認証状態は以下の情報を含む必要があります：

```typescript
interface AuthState {
  // Supabaseセッション
  session: Session | null;
  
  // アプリ内ユーザー情報（usersテーブル）
  user: User | null;
  
  // 認証状態
  isAuthenticated: boolean; // session !== null
  
  // オンボーディング完了状態
  hasCompletedOnboarding: boolean; // user !== null && groups.length > 0
  
  // ローディング状態
  isLoading: boolean;
}
```

### ProtectedRouteの実装要件

`ProtectedRoute`は以下の条件をチェックする必要があります：

1. **セッションの存在**: Supabaseセッションがあるか
2. **ユーザー情報の存在**: usersテーブルにレコードがあるか
3. **グループの所属**: group_membersにレコードがあるか（requireGroup=trueの場合）

### ログイン後のリダイレクト処理

メール/パスワードログイン後は、`onAuthStateChange`イベントを利用してユーザー情報とグループ情報を取得し、適切にリダイレクトする必要があります。

```typescript
// 推奨実装: ProtectedRoute内でグループ存在をチェック
// Login画面では認証のみを行い、リダイレクト先の決定はProtectedRouteに委譲
```

---

## エラーハンドリング

### 認証エラーメッセージ

```typescript
const authErrorMessages: Record<string, string> = {
  'Invalid login credentials': 'メールアドレスまたはパスワードが正しくありません',
  'Email not confirmed': 'メールアドレスの確認が完了していません',
  'User already registered': 'このメールアドレスは既に登録されています',
  'Password should be at least 6 characters': 'パスワードは6文字以上必要です',
  'Invalid email': 'メールアドレスの形式が正しくありません',
  'Signup is disabled': '新規登録は現在停止中です',
};

function getAuthErrorMessage(error: AuthError): string {
  return authErrorMessages[error.message] ?? '認証エラーが発生しました';
}
```

---

*最終更新: 2025年1月*
