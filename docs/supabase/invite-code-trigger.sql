-- ============================================
-- 招待コード自動生成トリガー
-- ============================================
-- Supabase Dashboard > SQL Editor で実行してください
-- ============================================

-- 招待コード生成関数（トリガー用）
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
