-- ============================================
-- SENTARI Security Hardening Migration
-- Run this in Supabase SQL Editor
-- Date: 2026-07-02
-- ============================================

-- 0. Safety: Drop existing trigger first to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 1. FIX PROFILES TABLE: Align role CHECK with guardrails.ts
-- Current: ('admin', 'manager', 'analyst', 'viewer')  
-- Needed:  ('public', 'free', 'starter', 'professional', 'enterprise', 'admin')
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('public', 'free', 'starter', 'professional', 'enterprise', 'admin', 'analyst', 'manager', 'viewer'));

-- Add subscription_tier column for billing status
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'free' 
  CHECK (subscription_tier IN ('free', 'starter', 'professional', 'enterprise'));

-- Add is_super_admin flag for platform-level admin access
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- Add last_sign_in tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;

-- 2. FIX HANDLE_NEW_USER TRIGGER: Robust version with error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, subscription_tier)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'free'),
    COALESCE(NEW.raw_user_meta_data->>'subscription_tier', 'free')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. CREATE ADMIN ACCOUNT DIRECTLY
-- This bypasses the trigger by inserting profile manually
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Check if admin already exists
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'lmutsambiwa57@gmail.com';
  
  IF admin_user_id IS NULL THEN
    -- Create the auth user
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      raw_app_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'lmutsambiwa57@gmail.com',
      '',  -- No password, using magic link
      NOW(),  -- Auto-confirmed
      '{"full_name": "Lesley Mutsambiwa", "role": "admin"}'::jsonb,
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      NOW(),
      NOW(),
      '',
      ''
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Get the user ID
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'lmutsambiwa57@gmail.com';
    
    -- Create admin profile
    INSERT INTO profiles (id, full_name, role, subscription_tier, is_super_admin)
    VALUES (admin_user_id, 'Lesley Mutsambiwa', 'admin', 'enterprise', TRUE)
    ON CONFLICT (id) DO UPDATE SET
      role = 'admin',
      subscription_tier = 'enterprise',
      is_super_admin = TRUE,
      full_name = 'Lesley Mutsambiwa';
      
    RAISE NOTICE 'Admin account created: % (ID: %)', 'lmutsambiwa57@gmail.com', admin_user_id;
  ELSE
    -- User exists, just ensure admin role
    UPDATE profiles SET 
      role = 'admin',
      subscription_tier = 'enterprise',
      is_super_admin = TRUE,
      full_name = 'Lesley Mutsambiwa'
    WHERE id = admin_user_id;
    
    RAISE NOTICE 'Admin account updated: % (ID: %)', 'lmutsambiwa57@gmail.com', admin_user_id;
  END IF;
END $$;

-- 4. RLS POLICIES WITH ADMIN BYPASS

-- Drop existing policies to rebuild cleanly
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Org members can view targets" ON scan_targets;
DROP POLICY IF EXISTS "Org members can create targets" ON scan_targets;
DROP POLICY IF EXISTS "Org members can view vulns" ON vulnerabilities;
DROP POLICY IF EXISTS "Org members can view audit" ON audit_log;

-- PROFILES: Admin can see all, users can see own
CREATE POLICY "Admin can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin can update all profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

CREATE POLICY "Admin can insert profiles" ON profiles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

-- SCAN_TARGETS: Admin sees all, org members see their org's
CREATE POLICY "Admin can view all targets" ON scan_targets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

CREATE POLICY "Org members can view targets" ON scan_targets
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    OR created_by = auth.uid()
  );

CREATE POLICY "Authenticated users can create targets" ON scan_targets
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
  );

CREATE POLICY "Admin can manage all targets" ON scan_targets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

-- SCAN_RESULTS: Tied to target ownership
CREATE POLICY "Admin can view all scan results" ON scan_results
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

CREATE POLICY "Users can view results for their targets" ON scan_results
  FOR SELECT USING (
    target_id IN (
      SELECT id FROM scan_targets 
      WHERE created_by = auth.uid()
         OR org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "System can insert scan results" ON scan_results
  FOR INSERT WITH CHECK (TRUE);  -- Service role only via API

-- VULNERABILITIES: Tied to target ownership
CREATE POLICY "Admin can view all vulnerabilities" ON vulnerabilities
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

CREATE POLICY "Users can view vulns for their targets" ON vulnerabilities
  FOR SELECT USING (
    target_id IN (
      SELECT id FROM scan_targets 
      WHERE created_by = auth.uid()
         OR org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    )
  );

-- ATTACK_PATHS: Tied to target ownership
CREATE POLICY "Admin can view all attack paths" ON attack_paths
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

CREATE POLICY "Users can view attack paths for their targets" ON attack_paths
  FOR SELECT USING (
    target_id IN (
      SELECT id FROM scan_targets 
      WHERE created_by = auth.uid()
         OR org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    )
  );

-- AI_ANALYSIS: Tied to target ownership
CREATE POLICY "Admin can view all AI analysis" ON ai_analysis
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

CREATE POLICY "Users can view analysis for their targets" ON ai_analysis
  FOR SELECT USING (
    target_id IN (
      SELECT id FROM scan_targets 
      WHERE created_by = auth.uid()
         OR org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    )
  );

-- AUDIT_LOG: Users see own, admin sees all
CREATE POLICY "Admin can view all audit logs" ON audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

CREATE POLICY "Users can view own audit logs" ON audit_log
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert audit logs" ON audit_log
  FOR INSERT WITH CHECK (TRUE);

-- SUBSCRIPTIONS: Admin manages all, users see their org's
CREATE POLICY "Admin can manage all subscriptions" ON subscriptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

CREATE POLICY "Users can view their org subscriptions" ON subscriptions
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- 5. AUDIT LOG INDEX for admin queries
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_super_admin ON profiles(is_super_admin) WHERE is_super_admin = TRUE;

-- 6. UPDATE EXISTING USERS: Set existing test users to 'free' tier
UPDATE profiles SET role = 'free', subscription_tier = 'free' 
WHERE role = 'analyst' AND id != (
  SELECT id FROM auth.users WHERE email = 'lmutsambiwa57@gmail.com'
);

-- Verification query
SELECT 
  u.email, 
  p.role, 
  p.subscription_tier, 
  p.is_super_admin,
  p.full_name
FROM auth.users u
JOIN profiles p ON u.id = p.id;
