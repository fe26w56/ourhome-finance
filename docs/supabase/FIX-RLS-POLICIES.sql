-- ============================================
-- RLSポリシー修復スクリプト（決定版）
-- ============================================
-- このスクリプトをSupabase SQL Editorで実行してください
-- ============================================

-- ============================================
-- ステップ1: 現在の状態を確認
-- ============================================

-- usersテーブルのRLS状態を確認
SELECT 
  'usersテーブルのRLS状態' as check_type,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ 有効'
    ELSE '❌ 無効'
  END as status
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'users';

-- usersテーブルの既存ポリシーを確認
SELECT 
  '既存のポリシー' as check_type,
  policyname,
  cmd as command,
  permissive
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users';

-- ============================================
-- ステップ2: 既存のポリシーを削除
-- ============================================

-- 安全に削除（存在しない場合はエラーを無視）
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;

-- ============================================
-- ステップ3: RLSを有効化
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ステップ4: 新しいポリシーを作成
-- ============================================

-- ポリシー1: 自分の情報を閲覧可能
CREATE POLICY "users_select_own" 
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- ポリシー2: 認証済みユーザーは自分のレコードを作成可能（最重要！）
CREATE POLICY "users_insert_own" 
ON public.users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- ポリシー3: 自分の情報を更新可能
CREATE POLICY "users_update_own" 
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================
-- ステップ5: 作成されたポリシーを確認
-- ============================================

SELECT 
  '✅ 作成されたポリシー' as result,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN 'USING: auth.uid() = id'
    WHEN cmd = 'INSERT' THEN 'CHECK: auth.uid() = id'
    WHEN cmd = 'UPDATE' THEN 'USING & CHECK: auth.uid() = id'
    ELSE 'その他'
  END as policy_details
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;

-- ============================================
-- ステップ6: 現在のユーザーIDを確認（テスト用）
-- ============================================

SELECT 
  '現在のユーザーID' as info,
  auth.uid() as user_id,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN '✅ 認証済み'
    ELSE '❌ 未認証'
  END as status;

-- ============================================
-- ステップ7: usersテーブルの既存レコードを確認
-- ============================================

SELECT 
  '既存のusersレコード' as info,
  id,
  email,
  display_name,
  created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- ステップ8: 完了メッセージ
-- ============================================

SELECT 
  '🎉 RLSポリシーの修復が完了しました！' as status,
  '次のステップ: ブラウザでGoogleログインをテストしてください' as next_step;

-- ============================================
-- 補足: もしエラーが出た場合
-- ============================================

-- エラー: "policy already exists"
-- → 問題ありません。ポリシーが既に存在しています。

-- エラー: "permission denied"
-- → Supabaseのサービスロールキーでログインしているか確認してください。
-- → または、Supabase Dashboardから実行してください。

-- エラー: "relation does not exist"
-- → usersテーブルが存在しません。
-- → まず /docs/supabase/schema.sql を実行してください。
