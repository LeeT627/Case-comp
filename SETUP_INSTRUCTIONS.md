# GPai Competition Setup Instructions

## Quick Start

### 1. GPai Database Setup (5 minutes)
1. Open the file `setup/1_gpai_readonly_user.sql`
2. Replace `YOUR_SECURE_PASSWORD_HERE` with a strong password
3. Run this SQL on your GPai production database
4. Save the password for later

### 2. Supabase Setup (10 minutes)
1. Go to [app.supabase.com](https://app.supabase.com)
2. Create a new project:
   - Name: `gpai-competition`
   - Password: Choose a strong database password
   - Region: Mumbai or Singapore (closest to India)
3. Once created, go to Settings → API and copy:
   - Project URL
   - Anon public key
   - Service role key (secret)
4. Go to SQL Editor and run these files in order:
   - `setup/2_supabase_schema.sql`
   - `setup/3_supabase_storage.sql`

### 3. Local Development Setup (5 minutes)
1. Navigate to the app directory:
   ```bash
   cd gpai-competition-app
   ```

2. Copy environment template:
   ```bash
   cp .env.local.example .env.local
   ```

3. Edit `.env.local` and fill in:
   - Supabase credentials from step 2
   - GPai database URL with the password from step 1
   - Generate JWT secret: `openssl rand -base64 32`

4. Install dependencies:
   ```bash
   npm install
   ```

5. Run development server:
   ```bash
   npm run dev
   ```

6. Open http://localhost:3000

### 4. Deploy to Vercel (10 minutes)
1. Push code to GitHub repository
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Set environment variables (same as .env.local)
5. Deploy!
6. Go to Settings → Functions → Cron Jobs to verify the cron is set up

### 5. Domain Setup
1. In Vercel, go to Settings → Domains
2. Add `contest.gpai.app`
3. Add CNAME record in your DNS:
   ```
   contest.gpai.app → cname.vercel-dns.com
   ```

## Testing Checklist

- [ ] Visit `/api/cron/ingest` - Should return JSON with `ok: true`
- [ ] Test join with an IIT email
- [ ] Check Supabase dashboard for participant record
- [ ] Verify cron runs every minute in Vercel dashboard

## Project Structure

```
gpai-competition/
├── setup/                    # Database setup scripts
│   ├── 1_gpai_readonly_user.sql
│   ├── 2_supabase_schema.sql
│   └── 3_supabase_storage.sql
│
gpai-competition-app/         # Next.js application
├── app/
│   ├── api/
│   │   ├── auth/join/       # Authentication
│   │   ├── cron/ingest/     # Data sync worker
│   │   └── ...              # Other API routes
│   ├── join/                # Join page
│   ├── starter/             # Locked dashboard
│   └── dashboard/           # Unlocked dashboard
├── lib/
│   ├── supabase.ts         # Database client
│   └── time.ts             # Timezone helpers
└── .env.local              # Environment variables
```

## Common Issues

**Cron not running?**
- Check Vercel dashboard → Functions → Logs
- Verify GPAI_DB_URL is correct
- Check Supabase connection

**Can't join?**
- Email domain must be in allowed_domain table
- User must exist in GPai with that email
- User must not be a guest

**No data showing?**
- Wait for cron to run (every minute)
- Check rt_participant_day table in Supabase
- Verify timezone calculations

## Next Steps

1. Customize the case brief in Supabase `competition` table
2. Add more UI pages (dashboard, submission)
3. Set competition end date when decided
4. Monitor usage and performance