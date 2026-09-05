-- ============================================
-- SENTARI Backfill Profiles Migration
-- Run this in Supabase SQL Editor
-- Date: 2026-09-05
-- ============================================
-- ROOT CAUSE FIX: scan_targets.created_by FK depends on profiles rows.
-- Users created before migration 001 (or whose trigger never fired) have
-- NO profile row → every scan INSERT fails with 23503 FK violation
-- ("Failed to create scan" / 500). This backfills ALL orphaned auth users.

-- 1. Backfill: create a profile row for every auth user missing one.
INSERT INTO public.profiles (id, full_name, role, subscription_tier)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email, split_part(u.email, '@', 1), 'User'),
  COALESCE(u.raw_user_meta_data->>'role', 'free'),
  COALESCE(u.raw_user_meta_data->>'subscription_tier', 'free')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 2. Guard: make sure the trigger exists so future signups auto-create profiles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, subscription_tier)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'free'),
    COALESCE(NEW.raw_user_meta_data->>'subscription_tier', 'free')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Verify how many were healed (should equal the previous orphan count).
SELECT COUNT(*) AS total_auth_users,
       (SELECT COUNT(*) FROM public.profiles) AS total_profiles
FROM auth.users;