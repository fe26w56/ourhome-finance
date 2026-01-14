-- ============================================
-- Row Level Security (RLS) ポリシー
-- ============================================
-- schema.sql の後に実行してください
-- ============================================

-- ============================================
-- 1. users テーブル
-- ============================================

-- 自分の情報は閲覧可能
CREATE POLICY "users_select_own" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- 認証済みユーザーは自分のレコードを作成可能（OAuth初回ログイン時）
CREATE POLICY "users_insert_own" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 自分の情報は更新可能
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- 2. groups テーブル
-- ============================================

-- 所属グループは閲覧可能
CREATE POLICY "groups_select_member" ON groups
  FOR SELECT
  USING (
    id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

-- owner/adminのみ作成可能（実際はアプリ側で制御）
CREATE POLICY "groups_insert_authenticated" ON groups
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ownerのみ更新可能
CREATE POLICY "groups_update_owner" ON groups
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR
    id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ownerのみ削除可能
CREATE POLICY "groups_delete_owner" ON groups
  FOR DELETE
  USING (created_by = auth.uid());

-- ============================================
-- 3. group_members テーブル
-- ============================================

-- 所属グループのメンバーは閲覧可能
CREATE POLICY "group_members_select_member" ON group_members
  FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

-- owner/adminのみ追加可能
CREATE POLICY "group_members_insert_admin" ON group_members
  FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- owner/adminのみ更新可能
CREATE POLICY "group_members_update_admin" ON group_members
  FOR UPDATE
  USING (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ownerのみ削除可能（自分は退会可能）
CREATE POLICY "group_members_delete" ON group_members
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================
-- 4. categories テーブル
-- ============================================

-- 所属グループのカテゴリは閲覧可能
CREATE POLICY "categories_select_member" ON categories
  FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

-- admin以上のみ作成可能
CREATE POLICY "categories_insert_admin" ON categories
  FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- admin以上のみ更新可能
CREATE POLICY "categories_update_admin" ON categories
  FOR UPDATE
  USING (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- admin以上のみ削除可能（論理削除推奨）
CREATE POLICY "categories_delete_admin" ON categories
  FOR DELETE
  USING (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- 5. transactions テーブル
-- ============================================

-- 所属グループの取引は閲覧可能
CREATE POLICY "transactions_select_member" ON transactions
  FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

-- member以上のみ作成可能
CREATE POLICY "transactions_insert_member" ON transactions
  FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

-- 自分の取引 or admin以上のみ更新可能
CREATE POLICY "transactions_update" ON transactions
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- 自分の取引 or admin以上のみ削除可能
CREATE POLICY "transactions_delete" ON transactions
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- 6. transaction_splits テーブル
-- ============================================

-- 所属グループの分割情報は閲覧可能
CREATE POLICY "transaction_splits_select_member" ON transaction_splits
  FOR SELECT
  USING (
    transaction_id IN (
      SELECT id FROM transactions
      WHERE group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
      )
    )
  );

-- member以上のみ作成可能
CREATE POLICY "transaction_splits_insert_member" ON transaction_splits
  FOR INSERT
  WITH CHECK (
    transaction_id IN (
      SELECT id FROM transactions
      WHERE group_id IN (
        SELECT group_id FROM group_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
      )
    )
  );

-- member以上のみ更新可能
CREATE POLICY "transaction_splits_update_member" ON transaction_splits
  FOR UPDATE
  USING (
    transaction_id IN (
      SELECT id FROM transactions
      WHERE group_id IN (
        SELECT group_id FROM group_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
      )
    )
  );

-- member以上のみ削除可能
CREATE POLICY "transaction_splits_delete_member" ON transaction_splits
  FOR DELETE
  USING (
    transaction_id IN (
      SELECT id FROM transactions
      WHERE group_id IN (
        SELECT group_id FROM group_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
      )
    )
  );

-- ============================================
-- 7. settlements テーブル
-- ============================================

-- 所属グループの精算は閲覧可能
CREATE POLICY "settlements_select_member" ON settlements
  FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

-- member以上のみ作成可能
CREATE POLICY "settlements_insert_member" ON settlements
  FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

-- ============================================
-- 8. budgets テーブル
-- ============================================

-- 所属グループの予算は閲覧可能
CREATE POLICY "budgets_select_member" ON budgets
  FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

-- admin以上のみ作成・更新可能
CREATE POLICY "budgets_insert_admin" ON budgets
  FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "budgets_update_admin" ON budgets
  FOR UPDATE
  USING (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- admin以上のみ削除可能
CREATE POLICY "budgets_delete_admin" ON budgets
  FOR DELETE
  USING (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- 9. goals テーブル
-- ============================================

-- 所属グループの目標は閲覧可能
CREATE POLICY "goals_select_member" ON goals
  FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

-- member以上のみ作成可能
CREATE POLICY "goals_insert_member" ON goals
  FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

-- member以上のみ更新可能
CREATE POLICY "goals_update_member" ON goals
  FOR UPDATE
  USING (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

-- member以上のみ削除可能
CREATE POLICY "goals_delete_member" ON goals
  FOR DELETE
  USING (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

-- ============================================
-- 10. goal_contributions テーブル
-- ============================================

-- 所属グループの入金記録は閲覧可能
CREATE POLICY "goal_contributions_select_member" ON goal_contributions
  FOR SELECT
  USING (
    goal_id IN (
      SELECT id FROM goals
      WHERE group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
      )
    )
  );

-- member以上のみ作成可能
CREATE POLICY "goal_contributions_insert_member" ON goal_contributions
  FOR INSERT
  WITH CHECK (
    goal_id IN (
      SELECT id FROM goals
      WHERE group_id IN (
        SELECT group_id FROM group_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
      )
    )
  );

-- ============================================
-- 11. user_settings テーブル
-- ============================================

-- 自分の設定は閲覧可能
CREATE POLICY "user_settings_select_own" ON user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- 自分の設定は更新可能
CREATE POLICY "user_settings_update_own" ON user_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 自分の設定は作成可能
CREATE POLICY "user_settings_insert_own" ON user_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
