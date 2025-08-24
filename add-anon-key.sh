#!/bin/bash

# Add the anon key to Vercel
# Get this from: https://supabase.com/dashboard/project/lrsqkagtalqzlxlglvgu/settings/api

echo "Please enter your Supabase anon/public key:"
read ANON_KEY

echo "$ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production

echo "Done! Now redeploy with: vercel --prod --yes"