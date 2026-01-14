-- ============================================
-- RPC関数とビュー
-- ============================================
-- schema.sql と rls-policies.sql の後に実行してください
-- ============================================

-- ============================================
-- 0. トリガー関数
-- ============================================

-- 招待コード生成関数（トリガー用）
-- グループ作成時に自動的に招待コードを生成
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code VARCHAR(20);
BEGIN
  -- invite_codeがNULLの場合のみ生成
  IF NEW.invite_code IS NULL THEN
    -- ランダムな20文字のコードを生成
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 20));
    
    -- ユニーク性を確認（重複したら再生成）
    WHILE EXISTS (SELECT 1 FROM groups WHERE invite_code = new_code) LOOP
      new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 20));
    END LOOP;
    
    NEW.invite_code := new_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- グループ作成時に招待コードを自動生成
CREATE TRIGGER generate_invite_code_trigger
  BEFORE INSERT ON groups
  FOR EACH ROW
  EXECUTE FUNCTION generate_invite_code();

-- ============================================
-- 1. ビュー
-- ============================================

-- 月次サマリービュー
CREATE OR REPLACE VIEW v_monthly_summary AS
SELECT 
  group_id,
  TO_CHAR(date, 'YYYY-MM') as year_month,
  type,
  SUM(amount) as total_amount,
  COUNT(*) as transaction_count
FROM transactions
GROUP BY group_id, TO_CHAR(date, 'YYYY-MM'), type;

-- 精算残高ビュー
CREATE OR REPLACE VIEW v_settlement_balance AS
SELECT 
  ts.user_id as debtor_id,
  t.paid_by as creditor_id,
  t.group_id,
  SUM(ts.amount) as owed_amount
FROM transaction_splits ts
JOIN transactions t ON ts.transaction_id = t.id
WHERE ts.user_id != t.paid_by
  AND ts.is_settled = FALSE
  AND t.is_shared = TRUE
GROUP BY ts.user_id, t.paid_by, t.group_id;

-- ============================================
-- 2. RPC関数
-- ============================================

-- 招待コード再生成
CREATE OR REPLACE FUNCTION regenerate_invite_code(group_uuid UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
  new_code VARCHAR(20);
BEGIN
  -- ランダムな20文字のコードを生成
  new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 20));
  
  -- ユニーク性を確認（重複したら再生成）
  WHILE EXISTS (SELECT 1 FROM groups WHERE invite_code = new_code) LOOP
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 20));
  END LOOP;
  
  -- グループの招待コードを更新
  UPDATE groups SET invite_code = new_code WHERE id = group_uuid;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 予算を翌月へコピー
CREATE OR REPLACE FUNCTION copy_budgets_to_next_month(
  group_uuid UUID,
  source_month VARCHAR(7),
  target_month VARCHAR(7)
)
RETURNS INTEGER AS $$
DECLARE
  copied_count INTEGER;
BEGIN
  INSERT INTO budgets (group_id, category_id, year_month, amount, carry_over)
  SELECT 
    group_id,
    category_id,
    target_month,
    amount,
    carry_over
  FROM budgets
  WHERE group_id = group_uuid
    AND year_month = source_month
  ON CONFLICT (group_id, category_id, year_month) DO NOTHING;
  
  GET DIAGNOSTICS copied_count = ROW_COUNT;
  RETURN copied_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 精算残高取得
CREATE OR REPLACE FUNCTION get_settlement_balance(group_uuid UUID)
RETURNS TABLE (
  from_user_id UUID,
  from_user_name VARCHAR,
  to_user_id UUID,
  to_user_name VARCHAR,
  amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sb.debtor_id as from_user_id,
    u1.display_name as from_user_name,
    sb.creditor_id as to_user_id,
    u2.display_name as to_user_name,
    sb.owed_amount as amount
  FROM v_settlement_balance sb
  JOIN users u1 ON sb.debtor_id = u1.id
  JOIN users u2 ON sb.creditor_id = u2.id
  WHERE sb.group_id = group_uuid
    AND sb.owed_amount > 0
  ORDER BY sb.owed_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 精算記録
CREATE OR REPLACE FUNCTION record_settlement(
  group_uuid UUID,
  from_user_uuid UUID,
  to_user_uuid UUID,
  settlement_amount DECIMAL,
  settlement_date DATE,
  settlement_method VARCHAR DEFAULT NULL,
  settlement_note TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  settlement_id UUID;
BEGIN
  -- 精算記録を作成
  INSERT INTO settlements (
    group_id,
    from_user_id,
    to_user_id,
    amount,
    settled_at,
    method,
    note
  ) VALUES (
    group_uuid,
    from_user_uuid,
    to_user_uuid,
    settlement_amount,
    settlement_date,
    settlement_method,
    settlement_note
  ) RETURNING id INTO settlement_id;
  
  -- 関連するtransaction_splitsを精算済みにマーク
  UPDATE transaction_splits ts
  SET is_settled = TRUE, settled_at = NOW()
  FROM transactions t
  WHERE ts.transaction_id = t.id
    AND t.group_id = group_uuid
    AND t.is_shared = TRUE
    AND ts.user_id = from_user_uuid
    AND t.paid_by = to_user_uuid
    AND ts.is_settled = FALSE;
  
  RETURN settlement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 月次サマリー取得
CREATE OR REPLACE FUNCTION get_monthly_summary(
  group_uuid UUID,
  year_month_param VARCHAR(7)
)
RETURNS TABLE (
  total_expense DECIMAL,
  total_income DECIMAL,
  total_budget DECIMAL,
  budget_remaining DECIMAL,
  transaction_count BIGINT,
  prev_month_expense DECIMAL,
  expense_diff_percent DECIMAL
) AS $$
DECLARE
  prev_month VARCHAR(7);
BEGIN
  -- 前月を計算
  prev_month := TO_CHAR(
    (TO_DATE(year_month_param || '-01', 'YYYY-MM-DD') - INTERVAL '1 month')::DATE,
    'YYYY-MM'
  );
  
  RETURN QUERY
  WITH current_month AS (
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense,
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
      COUNT(*) as count
    FROM transactions
    WHERE group_id = group_uuid
      AND TO_CHAR(date, 'YYYY-MM') = year_month_param
  ),
  prev_month_data AS (
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
    FROM transactions
    WHERE group_id = group_uuid
      AND TO_CHAR(date, 'YYYY-MM') = prev_month
  ),
  budget_data AS (
    SELECT 
      COALESCE(SUM(amount), 0) as total
    FROM budgets
    WHERE group_id = group_uuid
      AND year_month = year_month_param
      AND category_id IS NULL -- 全体予算のみ
  )
  SELECT 
    cm.expense::DECIMAL as total_expense,
    cm.income::DECIMAL as total_income,
    bd.total::DECIMAL as total_budget,
    (bd.total - cm.expense)::DECIMAL as budget_remaining,
    cm.count as transaction_count,
    pm.expense::DECIMAL as prev_month_expense,
    CASE 
      WHEN pm.expense > 0 THEN 
        ((cm.expense - pm.expense) / pm.expense * 100)::DECIMAL
      ELSE 0::DECIMAL
    END as expense_diff_percent
  FROM current_month cm
  CROSS JOIN prev_month_data pm
  CROSS JOIN budget_data bd;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- カテゴリ別統計取得
CREATE OR REPLACE FUNCTION get_category_stats(
  group_uuid UUID,
  year_month_param VARCHAR(7)
)
RETURNS TABLE (
  category_id UUID,
  category_name VARCHAR,
  category_icon VARCHAR,
  category_color VARCHAR,
  total_amount DECIMAL,
  budget_amount DECIMAL,
  usage_percent DECIMAL,
  transaction_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as category_id,
    c.name as category_name,
    c.icon as category_icon,
    c.color as category_color,
    COALESCE(SUM(t.amount), 0)::DECIMAL as total_amount,
    COALESCE(b.amount, NULL)::DECIMAL as budget_amount,
    CASE 
      WHEN b.amount > 0 THEN 
        (COALESCE(SUM(t.amount), 0) / b.amount * 100)::DECIMAL
      ELSE NULL::DECIMAL
    END as usage_percent,
    COUNT(t.id)::BIGINT as transaction_count
  FROM categories c
  LEFT JOIN transactions t ON c.id = t.category_id
    AND t.group_id = group_uuid
    AND TO_CHAR(t.date, 'YYYY-MM') = year_month_param
    AND t.type = 'expense'
  LEFT JOIN budgets b ON c.id = b.category_id
    AND b.group_id = group_uuid
    AND b.year_month = year_month_param
  WHERE c.group_id = group_uuid
    AND c.is_active = TRUE
    AND c.type IN ('expense', 'both')
  GROUP BY c.id, c.name, c.icon, c.color, b.amount
  ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 日別推移取得
CREATE OR REPLACE FUNCTION get_daily_trend(
  group_uuid UUID,
  start_date_param DATE,
  end_date_param DATE
)
RETURNS TABLE (
  date DATE,
  expense DECIMAL,
  income DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.date,
    COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0)::DECIMAL as expense,
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0)::DECIMAL as income
  FROM generate_series(start_date_param, end_date_param, '1 day'::interval)::DATE as t(date)
  LEFT JOIN transactions tr ON tr.date = t.date AND tr.group_id = group_uuid
  GROUP BY t.date
  ORDER BY t.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
