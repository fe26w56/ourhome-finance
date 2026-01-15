-- ============================================
-- 不足しているグループオーナーをgroup_membersに追加
-- ============================================
-- 問題: グループを作成したユーザーがgroup_membersテーブルに登録されていない
-- 結果: 他のメンバーがそのユーザーの取引やプロフィールを閲覧できない
-- ============================================

-- ============================================
-- ステップ1: 問題の確認
-- ============================================

-- グループのオーナー（created_by）がgroup_membersに登録されていないグループを確認
SELECT 
  g.id as group_id,
  g.name as group_name,
  g.created_by as owner_user_id,
  CASE 
    WHEN gm.id IS NULL THEN '❌ オーナーが未登録'
    ELSE '✅ オーナーが登録済み'
  END as status
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id AND g.created_by = gm.user_id
ORDER BY g.created_at;

-- ============================================
-- ステップ2: 不足しているオーナーを追加
-- ============================================

-- group_membersに登録されていないオーナーを追加
INSERT INTO group_members (group_id, user_id, role)
SELECT 
  g.id as group_id,
  g.created_by as user_id,
  'owner' as role
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id AND g.created_by = gm.user_id
WHERE gm.id IS NULL
ON CONFLICT (group_id, user_id) DO NOTHING;

-- ============================================
-- ステップ3: 修正結果の確認
-- ============================================

-- 修正後のグループとメンバーの状態を確認
SELECT 
  g.id as group_id,
  g.name as group_name,
  g.created_by as owner_user_id,
  COUNT(gm.id) as member_count,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM group_members gm2 
      WHERE gm2.group_id = g.id AND gm2.user_id = g.created_by
    ) THEN '✅ オーナーが登録済み'
    ELSE '❌ オーナーが未登録'
  END as owner_status
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
GROUP BY g.id, g.name, g.created_by
ORDER BY g.created_at;

-- 各グループのメンバー一覧を確認
SELECT 
  g.name as group_name,
  gm.user_id,
  gm.role,
  u.display_name,
  u.email
FROM group_members gm
JOIN groups g ON gm.group_id = g.id
JOIN users u ON gm.user_id = u.id
ORDER BY g.name, gm.role DESC, gm.joined_at;

-- ============================================
-- ステップ4: 完了メッセージ
-- ============================================

SELECT 
  '🎉 不足しているグループオーナーの追加が完了しました！' as status,
  '次のステップ: ブラウザで取引履歴を確認してください' as next_step;

-- ============================================
-- 注意事項
-- ============================================

/*
このスクリプトは：
1. グループのオーナー（created_by）がgroup_membersに登録されていないケースを検出
2. 不足しているオーナーをgroup_membersテーブルに追加（roleは'owner'）
3. ON CONFLICT を使用して、既に登録されている場合は何もしない

これにより：
- 全てのグループでオーナーがgroup_membersに登録される
- 他のメンバーがオーナーのユーザー情報を閲覧できるようになる
- 取引履歴で「誰が支払ったか」が正しく表示される
*/
