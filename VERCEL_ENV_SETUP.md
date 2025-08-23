# Vercel Environment Variables Setup

## Your Supabase Project
Project ID: `lpreqnkfbrxmqptupwmm`
Dashboard: https://supabase.com/dashboard/project/lpreqnkfbrxmqptupwmm

## Step 1: Get Supabase Credentials

1. Go to your [Supabase Settings](https://supabase.com/dashboard/project/lpreqnkfbrxmqptupwmm/settings/api)
2. Copy these values:
   - **Project URL**: `https://lpreqnkfbrxmqptupwmm.supabase.co`
   - **Anon public key**: (under "Project API keys")
   - **Service role key**: (under "Project API keys" - keep this SECRET!)

## Step 2: Create GPai Read-Only User

Run this on your GPai production database:
```sql
-- Replace 'YOUR_SECURE_PASSWORD' with a strong password
CREATE ROLE comp_ro LOGIN PASSWORD 'YOUR_SECURE_PASSWORD';
GRANT CONNECT ON DATABASE production TO comp_ro;
GRANT USAGE ON SCHEMA public TO comp_ro;
GRANT SELECT ON users TO comp_ro;
GRANT SELECT ON user_referral_codes TO comp_ro;
GRANT SELECT ON user_referrals TO comp_ro;
GRANT SELECT ON solver_tasks TO comp_ro;
GRANT SELECT ON user_auth_providers TO comp_ro;
```

## Step 3: Generate JWT Secret

Run this command in terminal:
```bash
openssl rand -base64 32
```

## Step 4: Add to Vercel

Go to: https://vercel.com/leet627s-projects/case-comp/settings/environment-variables

Add these environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://lpreqnkfbrxmqptupwmm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_ANON_KEY_FROM_SUPABASE]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY_FROM_SUPABASE]
GPAI_DB_URL=postgresql://comp_ro:[YOUR_PASSWORD]@gpai.cluster-cnbeqlnoaeg9.us-west-2.rds.amazonaws.com:5432/production
JWT_SECRET=[YOUR_GENERATED_SECRET]
NEXT_PUBLIC_BASE_URL=https://case-comp.vercel.app
CRON_SECRET=[OPTIONAL_RANDOM_STRING]
```

## Step 5: Run Database Setup

1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/lpreqnkfbrxmqptupwmm/sql/new)
2. Run these scripts in order:
   - Copy contents of `setup/2_supabase_schema.sql`
   - Copy contents of `setup/3_supabase_storage.sql`

## Step 6: Verify

After adding all environment variables and redeploying:

1. Check health endpoint: https://case-comp.vercel.app/api/health
2. Check Vercel Functions logs: https://vercel.com/leet627s-projects/case-comp/functions
3. Verify cron is running every minute

## Troubleshooting

If health check fails:
- Verify all environment variables are set in Vercel
- Check Supabase is accessible (not paused)
- Ensure database schema is created
- Check GPai database connection string

## Current Status Checklist

- [ ] Supabase credentials added to Vercel
- [ ] GPai read-only user created
- [ ] JWT secret generated and added
- [ ] Database schema applied in Supabase
- [ ] Storage bucket created in Supabase
- [ ] Cron job running (check Functions logs)
- [ ] Health check passing