-- Personal Expenses Table
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Create the personal_expenses table
CREATE TABLE IF NOT EXISTS personal_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'food', 'transport', 'shopping', 'entertainment', 
    'utilities', 'health', 'travel', 'subscriptions', 
    'groceries', 'other'
  )),
  date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_personal_expenses_user_id ON personal_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_expenses_date ON personal_expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_personal_expenses_user_date ON personal_expenses(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_personal_expenses_category ON personal_expenses(category);

-- Enable Row Level Security (RLS)
ALTER TABLE personal_expenses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean re-runs)
DROP POLICY IF EXISTS "Users can view own expenses" ON personal_expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON personal_expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON personal_expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON personal_expenses;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON personal_expenses;

-- Since we're using Firebase Auth (not Supabase Auth), we need a different approach.
-- Option 1: Simple policy that allows operations when user_id is provided
-- This trusts the client to send the correct user_id (Firebase handles auth)

CREATE POLICY "Allow all operations for authenticated users" ON personal_expenses
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Note: This policy allows all operations. Security is handled by:
-- 1. Firebase Auth on the client side
-- 2. The client only sends requests with the authenticated user's ID
-- 3. All queries filter by user_id

-- For production with better security, consider:
-- 1. Using Supabase Edge Functions to validate Firebase JWT tokens
-- 2. Or using Supabase Auth instead of Firebase Auth

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_personal_expenses_updated_at ON personal_expenses;
CREATE TRIGGER update_personal_expenses_updated_at
  BEFORE UPDATE ON personal_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE personal_expenses;

-- Grant permissions
GRANT ALL ON personal_expenses TO anon;
GRANT ALL ON personal_expenses TO authenticated;
GRANT ALL ON personal_expenses TO service_role;
