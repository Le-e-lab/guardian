-- SENTARI Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ORGANIZATIONS (multi-tenant)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    industry VARCHAR(100) CHECK (industry IN ('fintech', 'banking', 'telecom', 'sme', 'government', 'healthcare', 'other')),
    tier VARCHAR(50) DEFAULT 'free' CHECK (tier IN ('free', 'starter', 'professional', 'enterprise')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USERS (extends Supabase Auth)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'analyst' CHECK (role IN ('admin', 'manager', 'analyst', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SCAN TARGETS
CREATE TABLE scan_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    target_url VARCHAR(500) NOT NULL,
    target_type VARCHAR(50) CHECK (target_type IN ('domain', 'subdomain', 'ip', 'url')),
    scan_mode VARCHAR(50) DEFAULT 'passive' CHECK (scan_mode IN ('passive', 'active')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'scanning', 'analyzing', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SCAN RESULTS (raw tool output)
CREATE TABLE scan_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_id UUID REFERENCES scan_targets(id) ON DELETE CASCADE,
    scan_phase VARCHAR(50) CHECK (scan_phase IN ('recon', 'osint', 'analysis', 'report')),
    tool_name VARCHAR(100) NOT NULL,
    raw_output JSONB,
    findings_count INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 5. VULNERABILITIES
CREATE TABLE vulnerabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_id UUID REFERENCES scan_targets(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    severity VARCHAR(20) CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
    category VARCHAR(100),
    evidence JSONB,
    remediation TEXT,
    cvss_score DECIMAL(3,1),
    is_resolved BOOLEAN DEFAULT FALSE,
    discovered_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ATTACK PATHS (AI-chained sequences)
CREATE TABLE attack_paths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_id UUID REFERENCES scan_targets(id) ON DELETE CASCADE,
    path_name VARCHAR(255),
    description TEXT,
    steps JSONB,
    risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100),
    exploitability VARCHAR(20) CHECK (exploitability IN ('theoretical', 'practical', 'trivial')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. AI ANALYSIS
CREATE TABLE ai_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_id UUID REFERENCES scan_targets(id) ON DELETE CASCADE,
    model_used VARCHAR(100),
    analysis_output TEXT,
    risk_summary TEXT,
    overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
    tokens_used INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. AUDIT LOG
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SUBSCRIPTIONS
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    plan VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    scans_remaining INTEGER DEFAULT 3,
    scans_limit INTEGER DEFAULT 3,
    renews_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_scan_targets_org ON scan_targets(org_id);
CREATE INDEX idx_scan_results_target ON scan_results(target_id);
CREATE INDEX idx_vulnerabilities_target ON vulnerabilities(target_id);
CREATE INDEX idx_vulnerabilities_severity ON vulnerabilities(target_id, severity);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);

-- ROW LEVEL SECURITY
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE attack_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Scan targets: org members can CRUD
CREATE POLICY "Org members can view targets" ON scan_targets FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Org members can create targets" ON scan_targets FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);

-- Vulnerabilities: org members can view
CREATE POLICY "Org members can view vulns" ON vulnerabilities FOR SELECT USING (
    target_id IN (SELECT id FROM scan_targets WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()))
);

-- Audit log: org members can view
CREATE POLICY "Org members can view audit" ON audit_log FOR SELECT USING (
    user_id = auth.uid()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (new.id, new.raw_user_meta_data->>'full_name');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
