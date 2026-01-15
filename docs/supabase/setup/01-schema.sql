-- ============================================
-- OurHome Finance Database Schema
-- ============================================
-- Supabase SQL Editor で実行してください
-- ============================================

-- ============================================
-- 1. 拡張機能の有効化
-- ============================================

-- UUID生成用
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. ENUM型の作成
-- ============================================

-- メンバー権限
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- 取引種別
CREATE TYPE transaction_type AS ENUM ('expense', 'income');

-- カテゴリ種別
CREATE TYPE category_type AS ENUM ('expense', 'income', 'both');

-- 目標種別
CREATE TYPE goal_type AS ENUM ('savings', 'spending_limit');

-- テーマ
CREATE TYPE theme_type AS ENUM ('light', 'dark', 'system');

-- ============================================
-- 3. テーブル作成
-- ============================================

-- 3.1 users（ユーザー）
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3.2 groups（グループ）
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'JPY',
  month_start_day INTEGER NOT NULL DEFAULT 1 CHECK (month_start_day >= 1 AND month_start_day <= 28),
  invite_code VARCHAR(20) UNIQUE,
  carry_over_balance BOOLEAN NOT NULL DEFAULT TRUE,
  budget_carry_over BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3.3 group_members（グループメンバー）
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role member_role NOT NULL DEFAULT 'member',
  nickname VARCHAR(50),
  color VARCHAR(7), -- #RRGGBB形式
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- 3.4 categories（カテゴリ）
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  icon VARCHAR(50) NOT NULL,
  color VARCHAR(7) NOT NULL, -- #RRGGBB形式
  type category_type NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3.5 transactions（取引）
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  type transaction_type NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  memo TEXT,
  is_shared BOOLEAN NOT NULL DEFAULT TRUE,
  paid_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3.6 transaction_splits（取引分割・負担）
CREATE TABLE transaction_splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  percentage DECIMAL(5,2) CHECK (percentage >= 0 AND percentage <= 100),
  is_settled BOOLEAN NOT NULL DEFAULT FALSE,
  settled_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(transaction_id, user_id)
);

-- 3.7 settlements（精算）
CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  settled_at DATE NOT NULL,
  method VARCHAR(50),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CHECK (from_user_id != to_user_id)
);

-- 3.8 budgets（予算）
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE, -- NULLは全体予算
  year_month VARCHAR(7) NOT NULL CHECK (year_month ~ '^\d{4}-\d{2}$'),
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  carry_over BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, category_id, year_month)
);

-- 3.9 goals（目標）
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type goal_type NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  is_achieved BOOLEAN NOT NULL DEFAULT FALSE,
  achieved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

-- 3.10 goal_contributions（目標への入金）
CREATE TABLE goal_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3.11 user_settings（ユーザー設定）
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_time TIME,
  budget_alert_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  partner_notification BOOLEAN NOT NULL DEFAULT TRUE,
  language VARCHAR(5) NOT NULL DEFAULT 'ja',
  theme theme_type NOT NULL DEFAULT 'light',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================
-- 4. インデックス作成
-- ============================================

-- 高頻度クエリ用インデックス
CREATE INDEX idx_transactions_group_date ON transactions(group_id, date DESC);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_paid_by ON transactions(paid_by);
CREATE INDEX idx_transactions_created_by ON transactions(created_by);
CREATE INDEX idx_transaction_splits_transaction ON transaction_splits(transaction_id);
CREATE INDEX idx_transaction_splits_user ON transaction_splits(user_id);
CREATE INDEX idx_budgets_group_month ON budgets(group_id, year_month);
CREATE INDEX idx_goals_group ON goals(group_id);
CREATE INDEX idx_settlements_group ON settlements(group_id);
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_categories_group ON categories(group_id);

-- ============================================
-- 5. トリガー関数（updated_at自動更新）
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at自動更新トリガー
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. Row Level Security (RLS) 有効化
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
