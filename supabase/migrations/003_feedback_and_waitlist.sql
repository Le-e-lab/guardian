-- 003: Feedback collection and waitlist capture
-- Critical for product-market fit validation

-- WAITLIST (email capture for early demand)
CREATE TABLE IF NOT EXISTS waitlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    company VARCHAR(255),
    role VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Zimbabwe',
    source VARCHAR(50) DEFAULT 'landing_page',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FEEDBACK (user signals for product iteration)
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email VARCHAR(255),
    category VARCHAR(50) NOT NULL CHECK (category IN ('bug', 'feature', 'general', 'praise', 'complaint')),
    message TEXT NOT NULL,
    page_url VARCHAR(500),
    user_agent TEXT,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_created ON waitlist(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback(category);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at);

-- RLS: Allow anonymous inserts (public feedback + waitlist signup)
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert into waitlist (public signup)
CREATE POLICY "Allow anonymous waitlist inserts" ON waitlist
    FOR INSERT WITH CHECK (true);

-- Allow anyone to insert into feedback (public feedback)
CREATE POLICY "Allow anonymous feedback inserts" ON feedback
    FOR INSERT WITH CHECK (true);

-- Only admins can read (service_role bypasses RLS anyway)
CREATE POLICY "Admins can read waitlist" ON waitlist
    FOR SELECT USING (false);

CREATE POLICY "Admins can read feedback" ON feedback
    FOR SELECT USING (false);
