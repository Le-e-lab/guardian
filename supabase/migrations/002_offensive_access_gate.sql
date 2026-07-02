-- ============================================================
-- SENTARI Migration 002: Offensive Access Gate
-- Adds feature flags, offensive access requests, and verification tables
-- ============================================================

-- 1. FEATURE FLAGS — Global feature toggles
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feature_name VARCHAR(100) UNIQUE NOT NULL,
    enabled BOOLEAN DEFAULT FALSE,
    enabled_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    enabled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default feature flags
INSERT INTO feature_flags (feature_name, enabled) VALUES
    ('offensive_scanning', FALSE),
    ('compliance_reports', TRUE),
    ('ai_analysis', TRUE),
    ('passive_scanning', TRUE)
ON CONFLICT (feature_name) DO NOTHING;

-- 2. OFFENSIVE ACCESS REQUESTS — Verification gate for offensive testing
CREATE TABLE IF NOT EXISTS offensive_access_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    target_domain VARCHAR(255) NOT NULL,
    verification_method VARCHAR(50) NOT NULL CHECK (verification_method IN (
        'email_otp', 'dns_txt', 'att_document', 'admin_review'
    )),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'otp_sent', 'otp_verified', 'dns_pending', 'dns_verified',
        'att_submitted', 'att_approved', 'att_rejected',
        'admin_pending', 'admin_approved', 'admin_rejected',
        'verified', 'rejected', 'expired', 'revoked'
    )),
    verification_data JSONB DEFAULT '{}',
    otp_hash VARCHAR(255),
    otp_expires_at TIMESTAMPTZ,
    otp_attempts INTEGER DEFAULT 0,
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, target_domain)
);

-- 3. OFFENSIVE SCAN LOG — Audit trail for offensive testing
CREATE TABLE IF NOT EXISTS offensive_scan_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    access_request_id UUID REFERENCES offensive_access_requests(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    target_domain VARCHAR(255) NOT NULL,
    scan_type VARCHAR(100) NOT NULL,
    scan_config JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    findings_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'running' CHECK (status IN (
        'running', 'completed', 'failed', 'blocked'
    )),
    admin_notified BOOLEAN DEFAULT FALSE,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_feature_flags_name ON feature_flags(feature_name);
CREATE INDEX IF NOT EXISTS idx_offensive_requests_user ON offensive_access_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_offensive_requests_status ON offensive_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_offensive_requests_domain ON offensive_access_requests(target_domain);
CREATE INDEX IF NOT EXISTS idx_offensive_scan_log_user ON offensive_scan_log(user_id);
CREATE INDEX IF NOT EXISTS idx_offensive_scan_log_request ON offensive_scan_log(access_request_id);
CREATE INDEX IF NOT EXISTS idx_offensive_scan_log_domain ON offensive_scan_log(target_domain);

-- 5. RLS POLICIES

-- Feature flags: only super admins can modify
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_flags_select_auth" ON feature_flags
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "feature_flags_admin_all" ON feature_flags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_super_admin = TRUE
        )
    );

-- Offensive access requests: users see their own, admins see all
ALTER TABLE offensive_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offensive_requests_select_own" ON offensive_access_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "offensive_requests_select_admin" ON offensive_access_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_super_admin = TRUE
        )
    );

CREATE POLICY "offensive_requests_insert_auth" ON offensive_access_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "offensive_requests_update_admin" ON offensive_access_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_super_admin = TRUE
        )
    );

-- Offensive scan log: users see their own, admins see all
ALTER TABLE offensive_scan_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offensive_scan_log_select_own" ON offensive_scan_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "offensive_scan_log_select_admin" ON offensive_scan_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_super_admin = TRUE
        )
    );

CREATE POLICY "offensive_scan_log_insert_auth" ON offensive_scan_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. FUNCTIONS

-- Check if a feature is enabled
CREATE OR REPLACE FUNCTION is_feature_enabled(feature_name_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    enabled_status BOOLEAN;
BEGIN
    SELECT enabled INTO enabled_status
    FROM feature_flags
    WHERE feature_name = feature_name_param;

    RETURN COALESCE(enabled_status, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has verified access for a target domain
CREATE OR REPLACE FUNCTION has_offensive_access(user_id_param UUID, domain_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    access_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO access_count
    FROM offensive_access_requests
    WHERE user_id = user_id_param
    AND target_domain = domain_param
    AND status = 'verified'
    AND (expires_at IS NULL OR expires_at > NOW());

    RETURN access_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate OTP code (6 digits)
CREATE OR REPLACE FUNCTION generate_otp()
RETURNS TEXT AS $$
BEGIN
    RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;
