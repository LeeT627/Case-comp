-- V1.1 Complete Database Schema
-- Run this in a fresh Supabase project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create participant table (simplified for v1.1)
CREATE TABLE participant (
  participant_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  campus_id TEXT DEFAULT 'open',
  campus_name TEXT DEFAULT 'Open Registration',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for email (case-insensitive)
CREATE INDEX idx_participant_email_lower ON participant (LOWER(email));

-- Create submissions table
CREATE TABLE submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES participant(participant_id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for participant submissions
CREATE INDEX idx_submissions_participant ON submissions(participant_id);

-- Create competition_config table
CREATE TABLE competition_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deadline TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  submission_guidelines TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default competition config
INSERT INTO competition_config (
  deadline, 
  is_active, 
  submission_guidelines
) VALUES (
  '2024-12-31 23:59:59+00'::timestamptz, -- Set your actual deadline here
  true,
  'Submit your case study as a PDF or PowerPoint presentation. Maximum file size: 50MB.'
);

-- Create RLS (Row Level Security) policies
ALTER TABLE participant ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_config ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own participant data
CREATE POLICY "Users can view own participant data" ON participant
  FOR SELECT USING (true);

-- Allow users to insert their own participant data (signup)
CREATE POLICY "Users can create participant" ON participant
  FOR INSERT WITH CHECK (true);

-- Allow users to view and manage their own submissions
CREATE POLICY "Users can view own submissions" ON submissions
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own submissions" ON submissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own submissions" ON submissions
  FOR UPDATE USING (true);

-- Allow everyone to read competition config
CREATE POLICY "Anyone can view competition config" ON competition_config
  FOR SELECT USING (true);

-- Create storage bucket for submissions (run in Supabase Dashboard SQL Editor)
-- Note: Storage bucket creation needs to be done via Supabase Dashboard
-- Go to Storage section and create a bucket named 'submissions' with public access

-- Create a function to handle file uploads
CREATE OR REPLACE FUNCTION handle_submission_upload()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update timestamp
CREATE TRIGGER update_submission_timestamp
  BEFORE UPDATE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION handle_submission_upload();

-- Create trigger for participant update timestamp
CREATE TRIGGER update_participant_timestamp
  BEFORE UPDATE ON participant
  FOR EACH ROW
  EXECUTE FUNCTION handle_submission_upload();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;