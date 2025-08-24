# GPai Database Structure

## Connection Details
- Host: gpai.cluster-cnbeqlnoaeg9.us-west-2.rds.amazonaws.com
- Port: 5432
- Database: production
- Read-only user: comp_ro

## Tables

### Core User Tables

#### users
- `id`: uuid (PRIMARY KEY)
- `email`: varchar (NOT NULL)
- `isGuest`: boolean
- `creditBalance`: integer
- `createdAt`: timestamp with timezone
- `updatedAt`: timestamp with timezone
- `hashedPassword`: text

#### user_referral_codes
- `id`: uuid (PRIMARY KEY)
- `userId`: uuid (NOT NULL, FK to users.id)
- `referralCode`: varchar (NOT NULL)
- `createdAt`: timestamp with timezone

#### user_referrals
- `id`: uuid (PRIMARY KEY)
- `referralCode`: varchar (NOT NULL, FK to user_referral_codes.referralCode)
- `referredUserId`: uuid (NOT NULL, FK to users.id)
- `joinedAt`: timestamp with timezone

### Activity & Task Tables

#### task_events
- `id`: text
- `taskId`: text
- `problemId`: text
- `eventType`: varchar
- `eventData`: jsonb
- `createdAt`: timestamp with timezone

#### solutions
- `id`: uuid
- `problemId`: uuid
- `type`: varchar
- `content`: text
- `metadata`: jsonb
- `creditsCost`: integer
- `processingTime`: integer
- `createdAt`: timestamp with timezone

#### solver_tasks
- Task processing related data

### Problem & File Tables

#### problems
- `id`: uuid
- Problem metadata and content

#### problem_files
- Files associated with problems

#### files
- File storage metadata

### Chat & Message Tables

#### chats
- Chat session data

#### chat_messages
- Individual chat messages

### Cheatsheet Tables

#### cheatsheet_tasks
- Cheatsheet generation tasks

#### cheatsheet_task_files
- Files for cheatsheet tasks

#### cheatsheet_blocks
- Content blocks for cheatsheets

#### cheatsheet_chunks
- Chunks of cheatsheet content

### Notetaker Tables

#### notetaker_tasks
- Note-taking task data

#### notetaker_task_files
- Files for notetaker tasks

#### notetaker_subjects
- Subject categorization

#### note_results
- Generated note results

#### note_visual_tasks
- Visual note generation tasks

### Visual & Media Tables

#### visual_tasks
- Visual content generation tasks

### Transaction Tables

#### credit_transactions
- Credit transaction history

#### gift_cards
- Gift card data

#### gift_card_transactions
- Gift card usage transactions

#### reward_claims
- Reward claim records

### Error & Reporting Tables

#### solution_error_reports
- Error reports for solutions

#### user_error_reports_daily_kst
- Daily aggregated error reports (KST timezone)

#### error_report_analyses
- Analysis of error reports

### Authentication Tables

#### user_auth_providers
- OAuth/SSO provider data

### System Tables

#### schema_migrations
- Database migration tracking

## Key Relationships

1. **Referral System**:
   - `users` → `user_referral_codes` (1:1) - Each user has one referral code
   - `user_referral_codes` → `user_referrals` (1:N) - One code can have many referrals
   - `user_referrals` → `users` (N:1) - Many referrals point to referred users

2. **Task System**:
   - `users` → `solutions` - Users create solutions
   - `problems` → `solutions` - Solutions solve problems
   - `task_events` tracks all task-related events

## Important Notes

1. **User Activity**: 
   - No `lastActiveAt` column - use `updatedAt` as proxy
   - Activity can be inferred from `solutions`, `task_events`, `chat_messages` tables

2. **Referral Counting**:
   - Join `user_referral_codes` with `user_referrals` to get referrals
   - Filter by `isGuest = FALSE` to exclude guest users
   - Check `email IS NOT NULL` to ensure valid users

3. **Date/Time Fields**:
   - All timestamps are stored with timezone (timestamp with time zone)
   - Server likely uses UTC internally
   - KST (Korean Standard Time) used for some reporting tables

## Sample Queries

### Count User Referrals
```sql
SELECT COUNT(*) as total_referrals
FROM users u1
JOIN user_referral_codes urc ON u1.id = urc."userId"
JOIN user_referrals ur ON urc."referralCode" = ur."referralCode"
JOIN users u ON ur."referredUserId" = u.id
WHERE u1.email = 'user@example.com'
  AND u.email IS NOT NULL
  AND u."isGuest" IS FALSE;
```

### Get Recent User Activity
```sql
SELECT 
  u.email,
  u."updatedAt" as last_activity,
  COUNT(s.id) as solutions_count
FROM users u
LEFT JOIN solutions s ON s.metadata->>'userId' = u.id::text
WHERE u."updatedAt" >= NOW() - INTERVAL '1 day'
GROUP BY u.id, u.email, u."updatedAt";
```

### Daily Active Users
```sql
SELECT COUNT(DISTINCT u.id) as dau
FROM users u
WHERE u."updatedAt" >= CURRENT_DATE
  AND u."isGuest" IS FALSE;
```