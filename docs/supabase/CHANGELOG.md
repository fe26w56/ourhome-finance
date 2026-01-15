# Supabase スキーマ変更履歴

## 2026-01-15: FIXファイル統合・ディレクトリ整理

### 変更内容

以下のFIXファイルをベースラインに統合し、ディレクトリ構造を整理しました。

| 旧ファイル | 統合先 | 修正内容 |
|-----------|-------|---------|
| `FIX-RLS-GROUPS-INVITE-CODE.sql` | `setup/02-rls-policies.sql` | groups テーブルに招待コード検索用ポリシー追加 |
| `FIX-RLS-USERS-GROUP-MEMBERS.sql` | `setup/02-rls-policies.sql` | users テーブルに同グループメンバー閲覧ポリシー追加 |
| `FIX-RLS-GROUP-MEMBERS-INSERT.sql` | `setup/02-rls-policies.sql` | group_members テーブルに自己追加ポリシー追加 |
| `FIX-RLS-GROUP-MEMBERS-SELECT.sql` | `setup/02-rls-policies.sql` + `setup/03-functions.sql` | SECURITY DEFINER関数で自己参照問題修正 |
| `FIX-GROUP-MEMBERS-RLS.sql` | `setup/02-rls-policies.sql` | 無限再帰問題修正 |
| `FIX-RLS-ALL-GROUP-JOIN-ISSUES.sql` | - | 重複のため削除 |
| `FIX-RLS-POLICIES.sql` | `setup/02-rls-policies.sql` | users テーブルの基本RLSポリシー |
| `FIX-ADD-SETTLEMENT-FUNCTIONS.sql` | `setup/03-functions.sql` | 精算機能（既存） |

### 統合された主な変更

#### 1. users テーブルのRLSポリシー

`users_select_own` → `users_select_group_members` に変更：

```sql
USING (
  auth.uid() = id
  OR
  id IN (
    SELECT gm.user_id FROM group_members gm
    WHERE gm.group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  )
)
```

#### 2. groups テーブルのRLSポリシー

招待コード検索用ポリシー追加：

```sql
CREATE POLICY "groups_select_by_invite_code" ON groups
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND invite_code IS NOT NULL);
```

#### 3. group_members テーブルのRLSポリシー

自己追加ポリシー追加（招待コード参加用）：

```sql
CREATE POLICY "group_members_insert_self" ON group_members
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);
```

SELECTポリシーでSECURITY DEFINER関数を使用：

```sql
CREATE POLICY "group_members_select_member" ON group_members
  FOR SELECT
  USING (group_id IN (SELECT get_user_group_ids(auth.uid())));
```

#### 4. ヘルパー関数追加

`get_user_group_ids` 関数（SECURITY DEFINER）を `setup/03-functions.sql` に追加。
group_members の自己参照によるRLS問題を回避。

---

## 初期リリース

- スキーマ定義 (`setup/01-schema.sql`)
- RLSポリシー (`setup/02-rls-policies.sql`)
- 関数・ビュー (`setup/03-functions.sql`)
