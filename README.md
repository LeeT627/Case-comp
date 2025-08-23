# GPai Campus Case Competition Platform

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/leet627s-projects/case-comp)

## 🚀 Live Deployment

- **Production**: [https://case-comp.vercel.app](https://case-comp.vercel.app)
- **Vercel Dashboard**: [https://vercel.com/leet627s-projects/case-comp](https://vercel.com/leet627s-projects/case-comp)
- **GitHub Repo**: [https://github.com/LeeT627/Case-comp](https://github.com/LeeT627/Case-comp)

## 📋 Project Overview

A competition platform for IIT students to showcase GPai adoption through referrals and case submissions.

### Key Features
- 🎓 IIT-exclusive participation (23 campuses)
- 📊 Real-time referral tracking and dashboards
- 🔓 Unlocks at 5 eligible referrals
- 📈 DAU and activation metrics
- 📁 PDF/PPT submissions (up to 50MB)
- ⏱️ Minute-by-minute data sync from GPai

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Data Source**: GPai RDS (read-only)
- **Hosting**: Vercel
- **Cron**: Every minute data ingestion

## ⚙️ Environment Variables (Required in Vercel)

Go to [Vercel Settings → Environment Variables](https://vercel.com/leet627s-projects/case-comp/settings/environment-variables) and add:

```bash
# Supabase (from your Supabase project)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# GPai Database (read-only)
GPAI_DB_URL=postgresql://comp_ro:PASSWORD@gpai.cluster-cnbeqlnoaeg9.us-west-2.rds.amazonaws.com:5432/production

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your_random_secret_here

# Base URL
NEXT_PUBLIC_BASE_URL=https://case-comp.vercel.app

# Cron Secret (optional but recommended)
CRON_SECRET=your_cron_secret
```

## 📊 Monitoring

### Check Deployment Status
1. Go to [Vercel Dashboard](https://vercel.com/leet627s-projects/case-comp)
2. Check Functions tab for cron logs
3. Verify environment variables are set

### Cron Job Status
- **Endpoint**: `/api/cron/ingest`
- **Schedule**: Every minute (`* * * * *`)
- **Logs**: [View in Vercel Functions](https://vercel.com/leet627s-projects/case-comp/functions)

### Test Endpoints
- Health Check: [/api/health](https://case-comp.vercel.app/api/health)
- Cron Status: [/api/cron/ingest](https://case-comp.vercel.app/api/cron/ingest) (requires auth)

## 🚦 Quick Setup Checklist

- [ ] Supabase project created
- [ ] Database schema applied (`setup/2_supabase_schema.sql`)
- [ ] Storage bucket created (`setup/3_supabase_storage.sql`)
- [ ] GPai read-only user created (`setup/1_gpai_readonly_user.sql`)
- [ ] Environment variables added in Vercel
- [ ] Cron job enabled in Vercel
- [ ] Domain configured (optional: contest.gpai.app)

## 📝 Competition Status

- **Start Date**: Live now
- **End Date**: TBD
- **Case Brief**: TBD
- **Eligible Domains**: All IIT campuses (.iit*.ac.in)
- **Unlock Threshold**: 5 referrals

## 🔧 Local Development

```bash
# Clone the repo
git clone https://github.com/LeeT627/Case-comp.git
cd Case-comp

# Install dependencies
npm install

# Set up environment
cp .env.local.example .env.local
# Edit .env.local with your credentials

# Run development server
npm run dev
```

## 📚 Documentation

- [Setup Instructions](./SETUP_INSTRUCTIONS.md)
- [Database Schema](./setup/2_supabase_schema.sql)
- [API Documentation](./docs/API.md) (coming soon)

## 🤝 Support

For issues or questions:
- Check [Vercel Logs](https://vercel.com/leet627s-projects/case-comp/functions)
- Review [Supabase Dashboard](https://app.supabase.com)
- Open an [Issue on GitHub](https://github.com/LeeT627/Case-comp/issues)

---

Built with ❤️ for GPai Campus Competition