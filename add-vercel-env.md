# Add Environment Variables to Vercel

## Option 1: Via Vercel Dashboard (Recommended)

1. Go to https://vercel.com/dashboard
2. Click on your project: `gpai-competition-app`
3. Go to "Settings" tab
4. Click on "Environment Variables" in the left sidebar
5. Add each of these variables:

### Required Variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL (e.g., https://xxxxx.supabase.co)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (keep secret!)
- `JWT_SECRET` - Any random string (e.g., generate with: `openssl rand -base64 32`)
- `CRON_SECRET` - Any random string (e.g., generate with: `openssl rand -base64 32`)
- `NEXT_PUBLIC_BASE_URL` - https://gpai-competition-app.vercel.app

### Optional (for v1.0 features, not needed for v1.1):
- `GPAI_DB_URL` - PostgreSQL connection string for GPai database

## Option 2: Via CLI

Run these commands one by one (you'll be prompted to enter the value):

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add JWT_SECRET production
vercel env add CRON_SECRET production
vercel env add NEXT_PUBLIC_BASE_URL production
```

## Generate Random Secrets

To generate random secrets for JWT_SECRET and CRON_SECRET:
```bash
openssl rand -base64 32
```

## After Adding Variables

Redeploy to apply the environment variables:
```bash
vercel --prod --yes
```

## Where to Find Supabase Keys

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. You'll find:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`