-- V1.1 Schema Updates
-- Add password support and remove referral requirements

-- Add password_hash column to participant table
ALTER TABLE participant 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Remove the NOT NULL constraint from gpai_user_id since we're not requiring GPai accounts
ALTER TABLE participant 
ALTER COLUMN gpai_user_id DROP NOT NULL;

-- Make referral_code optional
ALTER TABLE participant 
ALTER COLUMN referral_code DROP NOT NULL;

-- Add index for email login
CREATE INDEX IF NOT EXISTS idx_participant_email_lower ON participant (LOWER(email));

-- Create submissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES participant(participant_id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for participant submissions
CREATE INDEX IF NOT EXISTS idx_submissions_participant ON submissions(participant_id);

-- Create competition_config table for managing deadlines and settings
CREATE TABLE IF NOT EXISTS competition_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deadline TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default config
INSERT INTO competition_config (deadline, is_active) 
VALUES (NULL, true)
ON CONFLICT DO NOTHING;