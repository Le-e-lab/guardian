/**
 * SENTARI Feature Flags System
 * Controls global feature toggles with caching
 */

import { supabaseAdmin } from './supabase';

// In-memory cache for feature flags (5 minute TTL)
const flagCache = new Map<string, { enabled: boolean; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a feature is enabled
 * Uses in-memory cache to avoid DB hits on every request
 */
export async function isFeatureEnabled(featureName: string): Promise<boolean> {
  const cached = flagCache.get(featureName);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.enabled;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('feature_flags')
      .select('enabled')
      .eq('feature_name', featureName)
      .single();

    const enabled = data?.enabled ?? false;

    // Update cache
    flagCache.set(featureName, {
      enabled,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return enabled;
  } catch (error) {
    console.error(`[FEATURE_FLAGS] Error checking ${featureName}:`, error);
    // Default to disabled on error
    return false;
  }
}

/**
 * Check if offensive scanning is enabled globally
 */
export async function isOffensiveScanningEnabled(): Promise<boolean> {
  return isFeatureEnabled('offensive_scanning');
}

/**
 * Check if compliance reports are enabled
 */
export async function isComplianceReportsEnabled(): Promise<boolean> {
  return isFeatureEnabled('compliance_reports');
}

/**
 * Check if AI analysis is enabled
 */
export async function isAiAnalysisEnabled(): Promise<boolean> {
  return isFeatureEnabled('ai_analysis');
}

/**
 * Toggle a feature flag (super admin only)
 */
export async function toggleFeature(
  featureName: string,
  enabled: boolean,
  enabledBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('feature_flags')
      .upsert({
        feature_name: featureName,
        enabled,
        enabled_by: enabledBy,
        enabled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'feature_name',
      });

    if (error) {
      return { success: false, error: error.message };
    }

    // Invalidate cache
    flagCache.delete(featureName);

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get all feature flags (admin view)
 */
export async function getAllFeatureFlags(): Promise<Array<{
  feature_name: string;
  enabled: boolean;
  enabled_at: string | null;
  enabled_by: string | null;
}>> {
  const { data, error } = await supabaseAdmin
    .from('feature_flags')
    .select('feature_name, enabled, enabled_at, enabled_by')
    .order('feature_name');

  if (error) {
    console.error('[FEATURE_FLAGS] Error fetching all flags:', error);
    return [];
  }

  return data || [];
}

/**
 * Check if user has verified offensive access for a specific domain
 */
export async function hasOffensiveAccess(
  userId: string,
  domain: string
): Promise<{ hasAccess: boolean; expiresAt?: string }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('offensive_access_requests')
      .select('id, expires_at')
      .eq('user_id', userId)
      .eq('target_domain', domain)
      .eq('status', 'verified')
      .single();

    if (error || !data) {
      return { hasAccess: false };
    }

    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { hasAccess: false };
    }

    return {
      hasAccess: true,
      expiresAt: data.expires_at || undefined,
    };
  } catch (error) {
    console.error('[FEATURE_FLAGS] Error checking offensive access:', error);
    return { hasAccess: false };
  }
}
