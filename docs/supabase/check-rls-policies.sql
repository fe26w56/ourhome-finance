-- ============================================
-- RLSポリシーの確認と修復スクリプト
-- ============================================
-- Supabase SQL Editorで実行してください
-- ============================================

-- ============================================
-- 1. 現在のRLSポリシーの状態を確認
-- ============================================

-- usersテーブルのRLS状態を確認
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'users';

-- usersテーブルのポリシー一覧
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users';

-- ============================================
-- 2. RLSが無効な場合、有効化する
-- ============================================

-- usersテーブルのRLSを有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. 必要なポリシーが存在しない場合、作成する
-- ============================================

-- 既存のポリシーを削除（エラーが出ても問題なし）
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

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
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 4. 確認: ポリシーが正しく作成されたか
-- ============================================

SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING句あり'
    ELSE 'USING句なし'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'CHECK句あり'
    ELSE 'CHECK句なし'
  END as check_clause
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- ============================================
-- 5. テスト: 現在のユーザーIDを確認
-- ============================================

SELECT auth.uid() as current_user_id;

-- ============================================
-- 6. usersテーブルの内容を確認
-- ============================================

SELECT 
  id,
  email,
  display_name,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- 完了メッセージ
-- ============================================

SELECT 'RLSポリシーの確認と修復が完了しました' as status;
