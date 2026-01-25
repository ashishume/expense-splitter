-- ============================================
-- Supabase Database Schema Migration
-- ============================================
-- Run this SQL in your Supabase SQL Editor to create all required tables
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Personal Expenses
-- ============================================
CREATE TABLE IF NOT EXISTS personal_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_personal_expenses_user_id ON personal_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_expenses_date ON personal_expenses(date);
CREATE INDEX IF NOT EXISTS idx_personal_expenses_user_date ON personal_expenses(user_id, date);

-- ============================================
-- Personal Expense Activities (Activity Log)
-- ============================================
CREATE TABLE IF NOT EXISTS personal_expense_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  expense_id TEXT NOT NULL,
  details TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id TEXT NOT NULL,
  expense JSONB,
  old_expense JSONB,
  new_expense JSONB
);

CREATE INDEX IF NOT EXISTS idx_activities_user_id ON personal_expense_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON personal_expense_activities(timestamp DESC);

-- ============================================
-- Fixed Costs (Templates)
-- ============================================
CREATE TABLE IF NOT EXISTS fixed_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  default_amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fixed_costs_user_id ON fixed_costs(user_id);

-- ============================================
-- Fixed Cost Instances (Monthly)
-- ============================================
CREATE TABLE IF NOT EXISTS fixed_cost_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fixed_cost_id UUID NOT NULL REFERENCES fixed_costs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  month TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(fixed_cost_id, user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_fixed_cost_instances_user_month ON fixed_cost_instances(user_id, month);

-- ============================================
-- Investments (Templates)
-- ============================================
CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  default_amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);

-- ============================================
-- Investment Instances (Monthly)
-- ============================================
CREATE TABLE IF NOT EXISTS investment_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  month TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(investment_id, user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_investment_instances_user_month ON investment_instances(user_id, month);

-- ============================================
-- Salary Income (Template)
-- ============================================
CREATE TABLE IF NOT EXISTS salary_income (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE,
  default_amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salary_income_user_id ON salary_income(user_id);

-- ============================================
-- Salary Instances (Monthly)
-- ============================================
CREATE TABLE IF NOT EXISTS salary_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salary_id UUID NOT NULL REFERENCES salary_income(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  month TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(salary_id, user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_salary_instances_user_month ON salary_instances(user_id, month);

-- ============================================
-- One-Time Investments
-- ============================================
CREATE TABLE IF NOT EXISTS one_time_investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_one_time_investments_user_id ON one_time_investments(user_id);
CREATE INDEX IF NOT EXISTS idx_one_time_investments_date ON one_time_investments(date);

-- ============================================
-- Users (for group expenses)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  groups TEXT[],
  created_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- Groups (for group expenses)
-- ============================================
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  members TEXT[] NOT NULL,
  created_at TEXT NOT NULL,
  owner TEXT
);

CREATE INDEX IF NOT EXISTS idx_groups_members ON groups USING GIN(members);

-- ============================================
-- Expenses (Group Expenses)
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paid_by TEXT NOT NULL,
  paid_by_name TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT NOT NULL,
  split_with TEXT[] NOT NULL,
  date TEXT NOT NULL,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  is_settlement BOOLEAN DEFAULT false,
  added_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);

-- ============================================
-- Logs (Group Activity Logs)
-- ============================================
CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  user_id TEXT,
  user_name TEXT,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  changes JSONB
);

CREATE INDEX IF NOT EXISTS idx_logs_group_id ON logs(group_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);

-- ============================================
-- Enable Row Level Security (RLS)
-- ============================================
-- Note: Adjust these policies based on your security requirements
-- For now, we'll enable RLS but allow all operations
-- You should customize these based on your auth setup

ALTER TABLE personal_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_expense_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_cost_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE one_time_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Basic RLS Policies (Allow all for now)
-- ============================================
-- IMPORTANT: These policies allow all operations
-- You should customize them based on your authentication setup

-- Personal expenses policies
CREATE POLICY "Allow all on personal_expenses" ON personal_expenses
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on personal_expense_activities" ON personal_expense_activities
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on fixed_costs" ON fixed_costs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on fixed_cost_instances" ON fixed_cost_instances
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on investments" ON investments
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on investment_instances" ON investment_instances
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on salary_income" ON salary_income
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on salary_instances" ON salary_instances
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on one_time_investments" ON one_time_investments
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on users" ON users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on groups" ON groups
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on expenses" ON expenses
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on logs" ON logs
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Enable Realtime for all tables
-- ============================================
-- This enables Supabase Realtime subscriptions

ALTER PUBLICATION supabase_realtime ADD TABLE personal_expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE personal_expense_activities;
ALTER PUBLICATION supabase_realtime ADD TABLE fixed_costs;
ALTER PUBLICATION supabase_realtime ADD TABLE fixed_cost_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE investments;
ALTER PUBLICATION supabase_realtime ADD TABLE investment_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE salary_income;
ALTER PUBLICATION supabase_realtime ADD TABLE salary_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE one_time_investments;
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE groups;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE logs;
