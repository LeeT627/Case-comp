#!/bin/bash

# Add environment variables to Vercel for v1.1

echo "Adding environment variables to Vercel..."

# Supabase URL (derived from your service key)
echo "lrsqkagtalqzlxlglvgu" | vercel env add NEXT_PUBLIC_SUPABASE_URL production
# When prompted, enter: https://lrsqkagtalqzlxlglvgu.supabase.co

# You need to get this from Supabase Dashboard > Settings > API > anon public key
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production

# Service Role Key (you provided this)
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyc3FrYWd0YWxxemx4bGdsdmd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjA0ODE0MiwiZXhwIjoyMDcxNjI0MTQyfQ.DEKtAwoYAA1-4AxA8HAKdwdQ4yXCe2IXV2_4j_EhZPU" | vercel env add SUPABASE_SERVICE_ROLE_KEY production

# Generate and add JWT secret
echo "$(openssl rand -base64 32)" | vercel env add JWT_SECRET production

# Generate and add CRON secret  
echo "$(openssl rand -base64 32)" | vercel env add CRON_SECRET production

# Base URL
echo "https://gpai-competition-app.vercel.app" | vercel env add NEXT_PUBLIC_BASE_URL production

echo "Done! Now redeploy with: vercel --prod --yes"