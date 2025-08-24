#!/bin/bash

# Add environment variables to Vercel
# Replace these with your actual values

echo "Adding environment variables to Vercel..."

# Supabase
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# Auth
vercel env add JWT_SECRET production

# Optional for v1.1 (can skip if not using GPai features)
# vercel env add GPAI_DB_URL production

# Cron
vercel env add CRON_SECRET production

# Base URL
vercel env add NEXT_PUBLIC_BASE_URL production

echo "Environment variables added. Now redeploy with: vercel --prod"