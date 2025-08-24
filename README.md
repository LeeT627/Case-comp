# GPai Campus Case Competition Platform

A competition platform for IIT students to drive GPai adoption through referrals and case study submissions.

## Features

- 🎓 **IIT-Only Access**: Restricted to students with IIT email domains
- 📊 **Live Dashboard**: Real-time metrics that update every minute
- 🔒 **Referral Gate**: Dashboard unlocks at 5 eligible referrals
- 📈 **Performance Metrics**: Track D1 activation, D7 retention, and DAU
- 🏆 **Leaderboards**: Campus and overall rankings
- 📝 **Case Submissions**: Upload PPT/PDF case studies

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL (via Supabase)
- Vercel account for deployment

### Local Development

1. Clone the repository
```bash
git clone https://github.com/LeeT627/Case-comp.git
cd gpai-competition-app
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.local.example .env.local
# Edit .env.local with your credentials
```

4. Run the development server
```bash
npm run dev
```

Visit `http://localhost:3000`

### Database Setup

1. Create a Supabase project
2. Run setup scripts in order:
   - `setup/1_gpai_readonly_user.sql` (on GPai database)
   - `setup/2_supabase_schema.sql` (on Supabase)
   - `setup/3_supabase_storage.sql` (on Supabase)

## Architecture

- **Frontend**: Next.js 15.5 with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL) + GPai RDS (read-only)
- **Deployment**: Vercel with automatic CI/CD
- **Data Sync**: Cron job runs every minute to sync GPai data

## Key Flows

### Join Flow
1. User enters IIT email
2. System verifies domain is allowed
3. Checks GPai account exists
4. Counts referrals (live from GPai)
5. Creates participant record
6. Issues JWT token

### Dashboard Flow
1. Auto-fetches live metrics on load
2. Refreshes every 60 seconds
3. Shows real-time referral counts
4. Updates rankings dynamically

## Project Structure

See `PROJECT_STRUCTURE.md` for detailed directory layout.

## Database Schema

See `GPAI_DATABASE_STRUCTURE.md` for GPai database reference.

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# GPai Database
GPAI_DB_URL=postgresql://comp_ro:password@host:5432/production

# Security
JWT_SECRET=your_jwt_secret
CRON_SECRET=your_cron_secret
```

## Deployment

Deployed automatically via Vercel on push to main branch.

## Test Account

For testing purposes, `himanshuraj6771@gmail.com` is whitelisted as a test account that:
- Bypasses IIT domain check
- Shows all referrals (not domain-restricted)
- Maps to IIT Delhi campus

## License

Private - All rights reserved