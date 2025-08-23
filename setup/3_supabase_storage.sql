-- =========================================
-- STEP 3: Supabase Storage Setup
-- =========================================
-- Run this in Supabase SQL Editor after creating the schema

-- Create storage bucket for submissions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submissions',
  'submissions', 
  false, -- Private bucket
  52428800, -- 50MB in bytes
  ARRAY[
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
);

-- Storage policies (using service_role for now)
-- Later we can add RLS policies for participants to access their own files

-- Create a policy to allow authenticated users to upload
CREATE POLICY "Participants can upload submissions" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'submissions');

-- Create a policy to allow users to view their own submissions  
CREATE POLICY "Participants can view own submissions" ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'submissions');

-- Note: For production, we'll use service_role key for all operations initially
-- These policies are placeholders for future JWT-based authentication