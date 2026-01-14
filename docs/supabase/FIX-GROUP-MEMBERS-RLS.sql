-- ============================================
-- group_members RLSポリシー修正スクリプト
-- ============================================
-- このスクリプトをSupabase SQL Editorで実行してください
-- ============================================
-- 
-- 問題: 新規グループ作成時に
-- "infinite recursion detected in policy for relation group_members"
-- エラーが発生する
--
-- 原因: group_members_insert_admin ポリシーが、INSERT時に
-- group_membersテーブル自体を参照しており、無限再帰が発生
-- ============================================

-- ステップ1: 現在のポリシーを確認
SELECT 
  'group_members 現在のポリシー' as check_type,
  policyname,
  cmd as command
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'group_members';

-- ============================================
-- ステップ2: 問題のあるポリシーを削除
-- ============================================

DROP POLICY IF EXISTS "group_members_insert_admin" ON public.group_members;

-- ============================================
-- ステップ3: 新しいポリシーを作成
-- ============================================

-- 修正版: 認証済みユーザーは自分自身をグループに追加可能
-- これにより新規グループ作成時にownerとして自分を追加できる
CREATE POLICY "group_members_insert_self" ON public.group_members
  FOR INSERT
  WITH CHECK (
    -- 自分自身を追加する場合のみ許可
    user_id = auth.uid()
  );

-- ============================================
-- ステップ4: 確認
-- ============================================

SELECT 
  '✅ 修正後のポリシー' as result,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'group_members'
ORDER BY policyname;

-- ============================================
-- 完了メッセージ
-- ============================================

SELECT 
  '🎉 group_members RLSポリシーの修正が完了しました！' as status,
  '次のステップ: ブラウザでグループ作成をテストしてください' as next_step;
