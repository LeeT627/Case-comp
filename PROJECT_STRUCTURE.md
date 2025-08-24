# GPai Competition App - Project Structure

## Directory Structure

```
gpai-competition-app/
├── app/                        # Next.js App Router
│   ├── api/                   # API Routes
│   │   ├── auth/             
│   │   │   └── join/         # Join competition & sync referrals
│   │   ├── cron/             
│   │   │   └── ingest/       # Minute-by-minute data sync
│   │   ├── metrics/          
│   │   │   └── live/         # Live metrics from GPai
│   │   ├── participant/      
│   │   │   └── me/           # Get current participant
│   │   └── submission/       
│   │       └── upload/       # Case study upload (TODO)
│   ├── dashboard/            # Dashboard page (unlocked)
│   ├── join/                 # Join competition page
│   ├── starter/              # Locked dashboard page
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Landing page
│
├── lib/                       # Shared libraries
│   ├── supabase.ts           # Supabase client & admin
│   └── time.ts               # Timezone utilities
│
├── setup/                     # Database setup scripts
│   ├── 1_gpai_readonly_user.sql
│   ├── 2_supabase_schema.sql
│   └── 3_supabase_storage.sql
│
├── scripts/                   # Utility scripts
│   ├── explore-gpai-db.js   # Database exploration
│   └── check-activity.js    # Activity checking
│
├── public/                    # Static assets
├── .env.local                # Environment variables (not in git)
├── GPAI_DATABASE_STRUCTURE.md # GPai DB documentation
├── PROJECT_STRUCTURE.md      # This file
├── next.config.ts            # Next.js configuration
├── tailwind.config.ts        # Tailwind CSS config
├── tsconfig.json             # TypeScript config
└── vercel.json               # Vercel deployment config

```

## Key Features

### 1. Authentication & Join Flow
- **Route**: `/api/auth/join`
- **Purpose**: Validates IIT email domains, checks GPai account, counts referrals
- **Special**: Test account exception for himanshuraj6771@gmail.com

### 2. Live Metrics
- **Route**: `/api/metrics/live`
- **Purpose**: Pulls real-time data from GPai database
- **Refresh**: Auto-updates every 60 seconds on dashboard

### 3. Data Ingestion
- **Route**: `/api/cron/ingest`
- **Purpose**: Syncs new users and activity every minute
- **Schedule**: Runs via Vercel cron `* * * * *`

### 4. Dashboard States
- **Starter** (`/starter`): Shows when < 5 referrals
- **Dashboard** (`/dashboard`): Unlocked at 5+ referrals
- **Auto-sync**: Metrics update live every minute

## Environment Variables

Required in `.env.local` and Vercel:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# GPai Database (read-only)
GPAI_DB_URL=postgresql://comp_ro:password@host:5432/production

# JWT Secret
JWT_SECRET=

# Vercel Cron Secret
CRON_SECRET=
```

## Database Structure

### Supabase Tables
- `allowed_domain` - IIT email domains
- `competition` - Competition config
- `participant` - Registered participants
- `rt_participant_day` - Daily participant metrics
- `rt_campus_day` - Campus-level metrics
- `rt_overall_day` - Overall competition metrics
- `snapshot` - Submission snapshots
- `case_submission` - Case study submissions

### GPai Tables (Read-only)
See `GPAI_DATABASE_STRUCTURE.md` for complete reference

## Deployment

- **Platform**: Vercel
- **Framework**: Next.js 15.5.0 with App Router
- **Database**: Supabase (PostgreSQL)
- **External DB**: GPai RDS (read-only access)

## TODO

1. [ ] Implement file upload to Supabase Storage
2. [ ] Add leaderboard page
3. [ ] Create admin dashboard
4. [ ] Add email notifications
5. [ ] Implement case study viewing