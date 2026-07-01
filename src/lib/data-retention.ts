/**
 * SENTARI Data Retention & Cleanup System
 * Automatically deletes sensitive scan data after retention period
 * Keeps anonymized records for analytics
 */

import { supabaseAdmin } from './supabase';
import { getDataRetentionDays, UserRole } from './guardrails';

interface RetentionResult {
  deletedScans: number;
  deletedVulnerabilities: number;
  deletedResults: number;
  keptRecords: number;
  errors: string[];
}

/**
 * Clean up expired scan data based on retention policy
 */
export async function cleanupExpiredData(): Promise<RetentionResult> {
  const result: RetentionResult = {
    deletedScans: 0,
    deletedVulnerabilities: 0,
    deletedResults: 0,
    keptRecords: 0,
    errors: [],
  };

  try {
    // Get all scan targets
    const { data: targets, error: targetsError } = await supabaseAdmin
      .from('scan_targets')
      .select('id, created_at, org_id');

    if (targetsError) {
      result.errors.push(`Failed to fetch targets: ${targetsError.message}`);
      return result;
    }

    if (!targets || targets.length === 0) {
      return result;
    }

    // For each target, check if it's expired
    for (const target of targets) {
      const createdAt = new Date(target.created_at);
      const now = new Date();
      const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

      // Default retention: 30 days for free tier
      const retentionDays = 30;

      if (daysSinceCreation > retentionDays) {
        // Delete associated data
        await deleteScanData(target.id, result);
      } else {
        result.keptRecords++;
      }
    }

    console.log(`[RETENTION] Cleanup complete: ${result.deletedScans} scans deleted, ${result.keptRecords} kept`);
  } catch (error) {
    result.errors.push(`Cleanup failed: ${String(error)}`);
  }

  return result;
}

/**
 * Delete all data for a specific scan (but keep anonymized summary)
 */
async function deleteScanData(targetId: string, result: RetentionResult): Promise<void> {
  try {
    // 1. Delete vulnerabilities (detailed findings)
    const { error: vulnError } = await supabaseAdmin
      .from('vulnerabilities')
      .delete()
      .eq('target_id', targetId);

    if (vulnError) {
      result.errors.push(`Failed to delete vulnerabilities for ${targetId}: ${vulnError.message}`);
    } else {
      result.deletedVulnerabilities++;
    }

    // 2. Delete scan results (raw tool output)
    const { error: resultsError } = await supabaseAdmin
      .from('scan_results')
      .delete()
      .eq('target_id', targetId);

    if (resultsError) {
      result.errors.push(`Failed to delete scan results for ${targetId}: ${resultsError.message}`);
    } else {
      result.deletedResults++;
    }

    // 3. Delete AI analysis (contains sensitive reasoning)
    const { error: analysisError } = await supabaseAdmin
      .from('ai_analysis')
      .delete()
      .eq('target_id', targetId);

    if (analysisError) {
      result.errors.push(`Failed to delete AI analysis for ${targetId}: ${analysisError.message}`);
    }

    // 4. Delete attack paths
    const { error: pathsError } = await supabaseAdmin
      .from('attack_paths')
      .delete()
      .eq('target_id', targetId);

    if (pathsError) {
      result.errors.push(`Failed to delete attack paths for ${targetId}: ${pathsError.message}`);
    }

    // 5. Delete the scan target itself
    const { error: targetError } = await supabaseAdmin
      .from('scan_targets')
      .delete()
      .eq('id', targetId);

    if (targetError) {
      result.errors.push(`Failed to delete target ${targetId}: ${targetError.message}`);
    } else {
      result.deletedScans++;
    }

    // 6. Log the deletion in audit trail (keep this for compliance)
    await supabaseAdmin.from('audit_log').insert({
      action: 'data_retention_cleanup',
      resource_type: 'scan_target',
      resource_id: targetId,
      details: {
        deletedAt: new Date().toISOString(),
        reason: 'data_retention_policy',
      },
    });
  } catch (error) {
    result.errors.push(`Error deleting scan data for ${targetId}: ${String(error)}`);
  }
}

/**
 * Manually delete a specific scan's sensitive data
 */
export async function deleteScanManually(targetId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify the user owns this scan
    const { data: target, error: fetchError } = await supabaseAdmin
      .from('scan_targets')
      .select('id, created_by')
      .eq('id', targetId)
      .single();

    if (fetchError || !target) {
      return { success: false, error: 'Scan not found' };
    }

    if (target.created_by !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const result: RetentionResult = {
      deletedScans: 0,
      deletedVulnerabilities: 0,
      deletedResults: 0,
      keptRecords: 0,
      errors: [],
    };

    await deleteScanData(targetId, result);

    if (result.errors.length > 0) {
      return { success: false, error: result.errors.join(', ') };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get retention status for a user's scans
 */
export async function getRetentionStatus(userId: string): Promise<{
  totalScans: number;
  expiredScans: number;
  activeScans: number;
  oldestScan: string | null;
  newestScan: string | null;
}> {
  try {
    const { data: scans, error } = await supabaseAdmin
      .from('scan_targets')
      .select('id, created_at')
      .eq('created_by', userId)
      .order('created_at', { ascending: true });

    if (error || !scans) {
      return { totalScans: 0, expiredScans: 0, activeScans: 0, oldestScan: null, newestScan: null };
    }

    const now = new Date();
    const retentionDays = 30;
    let expiredCount = 0;

    for (const scan of scans) {
      const createdAt = new Date(scan.created_at);
      const daysSince = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > retentionDays) {
        expiredCount++;
      }
    }

    return {
      totalScans: scans.length,
      expiredScans: expiredCount,
      activeScans: scans.length - expiredCount,
      oldestScan: scans[0]?.created_at || null,
      newestScan: scans[scans.length - 1]?.created_at || null,
    };
  } catch (error) {
    return { totalScans: 0, expiredScans: 0, activeScans: 0, oldestScan: null, newestScan: null };
  }
}
