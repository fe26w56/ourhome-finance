-- ============================================
-- RLSポリシーの確認スクリプト
-- ============================================
-- Supabase SQL Editorで実行してデバッグに使用
-- ============================================

-- ============================================
-- 1. 全テーブルのRLS状態を確認
-- ============================================

SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ 有効'
    ELSE '❌ 無効'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- 2. 全ポリシー一覧
-- ============================================

SELECT 
  tablename,
  policyname,
  permissive,
  cmd as command
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- 3. テーブル別ポリシー詳細
-- ============================================

-- usersテーブル
SELECT 
  'users' as table_name,
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

-- groupsテーブル
SELECT 
  'groups' as table_name,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'groups'
ORDER BY policyname;

-- group_membersテーブル
SELECT 
  'group_members' as table_name,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'group_members'
ORDER BY policyname;

-- ============================================
-- 4. 現在のユーザー情報
-- ============================================

SELECT 
  '現在のユーザーID' as info,
  auth.uid() as user_id,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN '✅ 認証済み'
    ELSE '❌ 未認証'
  END as status;

-- ============================================
-- 5. 現在のユーザーが所属するグループ
-- ============================================

SELECT 
  g.id as group_id,
  g.name as group_name,
  gm.role
FROM group_members gm
JOIN groups g ON gm.group_id = g.id
WHERE gm.user_id = auth.uid();

-- ============================================
-- 6. 閲覧可能なユーザー数（グループメンバー）
-- ============================================

SELECT 
  '閲覧可能なユーザー' as info,
  COUNT(*) as count
FROM users;
