-- ============================================
-- Migration: transaction_beneficiaries テーブル追加
-- Who Paid / For Whom 機能用
-- ============================================

-- 1. テーブル作成
CREATE TABLE IF NOT EXISTS transaction_beneficiaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(transaction_id, user_id)
);

-- 2. インデックス作成
CREATE INDEX IF NOT EXISTS idx_transaction_beneficiaries_transaction 
  ON transaction_beneficiaries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_beneficiaries_user 
  ON transaction_beneficiaries(user_id);

-- 3. RLS有効化
ALTER TABLE transaction_beneficiaries ENABLE ROW LEVEL SECURITY;

-- 4. RLSポリシー作成
-- SELECT: グループメンバーは自分のグループの取引の受益者を閲覧可能
DROP POLICY IF EXISTS "Users can view beneficiaries of their group transactions" ON transaction_beneficiaries;
CREATE POLICY "Users can view beneficiaries of their group transactions"
  ON transaction_beneficiaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = transaction_beneficiaries.transaction_id
        AND gm.user_id = auth.uid()
    )
  );

-- INSERT: グループメンバーは自分のグループの取引に受益者を追加可能
DROP POLICY IF EXISTS "Users can insert beneficiaries for their group transactions" ON transaction_beneficiaries;
CREATE POLICY "Users can insert beneficiaries for their group transactions"
  ON transaction_beneficiaries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = transaction_beneficiaries.transaction_id
        AND gm.user_id = auth.uid()
    )
  );

-- DELETE: グループメンバーは自分のグループの取引の受益者を削除可能
DROP POLICY IF EXISTS "Users can delete beneficiaries for their group transactions" ON transaction_beneficiaries;
CREATE POLICY "Users can delete beneficiaries for their group transactions"
  ON transaction_beneficiaries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      JOIN group_members gm ON gm.group_id = t.group_id
      WHERE t.id = transaction_beneficiaries.transaction_id
        AND gm.user_id = auth.uid()
    )
  );

-- ============================================
-- 5. 既存データのマイグレーション
-- ============================================

-- is_shared = true の取引: グループ全員を受益者に設定
INSERT INTO transaction_beneficiaries (transaction_id, user_id)
SELECT t.id, gm.user_id
FROM transactions t
JOIN group_members gm ON gm.group_id = t.group_id
WHERE t.is_shared = true
  AND NOT EXISTS (
    SELECT 1 FROM transaction_beneficiaries tb 
    WHERE tb.transaction_id = t.id
  )
ON CONFLICT (transaction_id, user_id) DO NOTHING;

-- is_shared = false の取引: 支払者のみを受益者に設定
INSERT INTO transaction_beneficiaries (transaction_id, user_id)
SELECT t.id, t.paid_by
FROM transactions t
WHERE t.is_shared = false
  AND NOT EXISTS (
    SELECT 1 FROM transaction_beneficiaries tb 
    WHERE tb.transaction_id = t.id
  )
ON CONFLICT (transaction_id, user_id) DO NOTHING;
