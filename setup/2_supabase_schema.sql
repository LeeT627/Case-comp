-- =========================================
-- STEP 2: Supabase Competition Database Schema
-- =========================================
-- Run this in your NEW Supabase project SQL Editor
-- This creates all tables for the competition system

-- Clean slate (optional - remove if you want to preserve data)
DROP TABLE IF EXISTS snapshot_metric CASCADE;
DROP TABLE IF EXISTS case_submission CASCADE;
DROP TABLE IF EXISTS snapshot CASCADE;
DROP TABLE IF EXISTS metric_fact CASCADE;
DROP TABLE IF EXISTS rt_overall_day CASCADE;
DROP TABLE IF EXISTS rt_campus_day CASCADE;
DROP TABLE IF EXISTS rt_participant_day CASCADE;
DROP TABLE IF EXISTS participant CASCADE;
DROP TABLE IF EXISTS competition CASCADE;
DROP TABLE IF EXISTS allowed_domain CASCADE;
DROP TABLE IF EXISTS ingest_cursor CASCADE;

-- =========================================
-- Core Tables
-- =========================================

-- IIT Campus domains (whitelist)
CREATE TABLE allowed_domain (
  domain TEXT PRIMARY KEY,
  campus_id UUID NOT NULL DEFAULT gen_random_uuid(),
  campus_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competition configuration
CREATE TABLE competition (
  competition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'GPai Campus Case Competition',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ, -- NULL means ongoing
  case_brief TEXT DEFAULT 'TBD', -- Update this later
  max_file_size_mb INTEGER DEFAULT 50,
  allowed_file_types TEXT[] DEFAULT ARRAY['pdf', 'pptx', 'ppt'],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participants (linked to GPai users)
CREATE TABLE participant (
  participant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gpai_user_id UUID UNIQUE NOT NULL, -- Links to GPai users.id
  email TEXT NOT NULL,
  campus_id UUID NOT NULL,
  referral_code TEXT, -- Their own referral code from GPai
  unlock_threshold INTEGER NOT NULL DEFAULT 5,
  eligible_referrals_total INTEGER NOT NULL DEFAULT 0,
  unlocked_at TIMESTAMPTZ, -- When they hit 5 referrals
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- Real-time Metrics Tables (for dashboards)
-- =========================================

-- Daily metrics per participant
CREATE TABLE rt_participant_day (
  date DATE NOT NULL,
  participant_id UUID NOT NULL,
  ref_clicks INTEGER DEFAULT 0, -- Optional, for future
  signups INTEGER DEFAULT 0,
  d1_activated INTEGER DEFAULT 0, -- Activated in first 24h
  d7_retained INTEGER DEFAULT 0, -- Returned after 7 days
  referred_dau INTEGER DEFAULT 0, -- Their referrals active today
  PRIMARY KEY (date, participant_id)
);

-- Daily metrics per campus
CREATE TABLE rt_campus_day (
  date DATE NOT NULL,
  campus_id UUID NOT NULL,
  dau INTEGER DEFAULT 0,
  new_signups INTEGER DEFAULT 0,
  PRIMARY KEY (date, campus_id)
);

-- Overall daily metrics
CREATE TABLE rt_overall_day (
  date DATE PRIMARY KEY,
  dau_total INTEGER DEFAULT 0,
  new_signups_total INTEGER DEFAULT 0,
  dau_eligible INTEGER DEFAULT 0, -- Only IIT users
  new_signups_eligible INTEGER DEFAULT 0
);

-- =========================================
-- Submission System
-- =========================================

-- Metric snapshots at submission time
CREATE TABLE snapshot (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL,
  participant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  meta JSONB
);

-- Snapshot metric details
CREATE TABLE snapshot_metric (
  snapshot_id UUID NOT NULL REFERENCES snapshot(snapshot_id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  value NUMERIC NOT NULL,
  PRIMARY KEY (snapshot_id, metric_key)
);

-- Case submissions
CREATE TABLE case_submission (
  submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL,
  participant_id UUID NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  file_url TEXT NOT NULL,
  file_url_pdf TEXT, -- If we convert PPTX to PDF
  file_ext TEXT NOT NULL CHECK (file_ext IN ('pptx', 'ppt', 'pdf')),
  file_size_bytes INTEGER NOT NULL,
  slide_count INTEGER,
  snapshot_id UUID NOT NULL REFERENCES snapshot(snapshot_id),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'processing', 'reviewed')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (competition_id, participant_id, version)
);

-- =========================================
-- System Tables
-- =========================================

-- Track ingestion progress
CREATE TABLE ingest_cursor (
  name TEXT PRIMARY KEY,
  last_user_created_at TIMESTAMPTZ,
  last_task_id TEXT,
  last_run_at TIMESTAMPTZ,
  rows_processed INTEGER DEFAULT 0
);

-- Optional: Flexible metrics for future features
CREATE TABLE metric_fact (
  date DATE NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('participant', 'campus', 'overall')),
  entity_id UUID,
  metric_key TEXT NOT NULL,
  value NUMERIC NOT NULL,
  numerator NUMERIC,
  denominator NUMERIC,
  meta JSONB,
  PRIMARY KEY (date, entity_type, entity_id, metric_key)
);

-- =========================================
-- Indexes for Performance
-- =========================================

CREATE INDEX idx_participant_gpai_user ON participant(gpai_user_id);
CREATE INDEX idx_participant_campus ON participant(campus_id);
CREATE INDEX idx_participant_unlocked ON participant(unlocked_at) WHERE unlocked_at IS NOT NULL;

CREATE INDEX idx_rt_participant_day_participant ON rt_participant_day(participant_id);
CREATE INDEX idx_rt_participant_day_date ON rt_participant_day(date);

CREATE INDEX idx_rt_campus_day_campus ON rt_campus_day(campus_id);
CREATE INDEX idx_rt_campus_day_date ON rt_campus_day(date);

CREATE INDEX idx_submission_participant ON case_submission(participant_id);
CREATE INDEX idx_submission_competition ON case_submission(competition_id);

-- =========================================
-- Initial Data
-- =========================================

-- Insert IIT domains
INSERT INTO allowed_domain (domain, campus_name) VALUES
-- Top IITs
('iitb.ac.in', 'IIT Bombay'),
('iitd.ac.in', 'IIT Delhi'),
('iitk.ac.in', 'IIT Kanpur'),
('iitkgp.ac.in', 'IIT Kharagpur'),
('iitm.ac.in', 'IIT Madras'),
('iitr.ac.in', 'IIT Roorkee'),
('iitg.ac.in', 'IIT Guwahati'),
-- Second Generation
('iitbbs.ac.in', 'IIT Bhubaneswar'),
('iitgn.ac.in', 'IIT Gandhinagar'),
('iith.ac.in', 'IIT Hyderabad'),
('iiti.ac.in', 'IIT Indore'),
('iitj.ac.in', 'IIT Jodhpur'),
('iitjm.ac.in', 'IIT Jammu'),
('iitp.ac.in', 'IIT Patna'),
('iitpkd.ac.in', 'IIT Palakkad'),
('iitrpr.ac.in', 'IIT Ropar'),
-- Newer IITs
('iitbh.ac.in', 'IIT Bhilai'),
('iitdh.ac.in', 'IIT Dharwad'),
('iitgoa.ac.in', 'IIT Goa'),
('iitmandi.ac.in', 'IIT Mandi'),
('iittp.ac.in', 'IIT Tirupati'),
('iitdm.ac.in', 'IIT (ISM) Dhanbad'),
-- BHU
('itbhu.ac.in', 'IIT (BHU) Varanasi'),
('iitbhu.ac.in', 'IIT (BHU) Varanasi');

-- Create initial competition (starts now, no end date yet)
INSERT INTO competition (name, starts_at, case_brief) 
VALUES ('GPai Campus Case Competition 2024', NOW(), 'TBD - Challenge details coming soon');

-- Initialize cursor
INSERT INTO ingest_cursor (name, last_user_created_at, last_run_at) 
VALUES ('main', '2024-01-01'::timestamptz, NOW());

-- =========================================
-- Row Level Security (RLS)
-- =========================================

-- Enable RLS on all tables except public ones
ALTER TABLE participant ENABLE ROW LEVEL SECURITY;
ALTER TABLE rt_participant_day ENABLE ROW LEVEL SECURITY;
ALTER TABLE rt_campus_day ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_submission ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot_metric ENABLE ROW LEVEL SECURITY;

-- Public tables (no RLS)
-- allowed_domain - public
-- competition - public
-- rt_overall_day - public

-- Note: We'll use service_role key initially, then add policies later

-- =========================================
-- Verification Queries
-- =========================================

-- Check setup
SELECT 'Domains:' as check, COUNT(*) as count FROM allowed_domain
UNION ALL
SELECT 'Competitions:', COUNT(*) FROM competition
UNION ALL
SELECT 'Participants:', COUNT(*) FROM participant;

-- Show all IIT domains
SELECT campus_name, domain FROM allowed_domain ORDER BY campus_name;