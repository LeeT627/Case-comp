import { NextRequest, NextResponse } from 'next/server'
import { Client as PGClient } from 'pg'
import { supabaseAdmin } from '@/lib/supabase'
import jwt from 'jsonwebtoken'
import { subDays, format } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    let decoded: any
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const searchParams = req.nextUrl.searchParams
    const range = searchParams.get('range') || '30d'
    const scope = searchParams.get('scope') || 'referrals'

    // Get participant
    const supabase = supabaseAdmin()
    const { data: participant } = await supabase
      .from('participant')
      .select('*')
      .eq('participant_id', decoded.participant_id)
      .single()

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    // Connect to GPai database
    const gpaiDb = new PGClient({ connectionString: process.env.GPAI_DB_URL! })
    await gpaiDb.connect()

    try {
      // First, get the earliest user creation date based on scope
      let earliestDateQuery: string
      let earliestDateParams: any[]

      // Get user IDs based on scope
      let userIds: string[] = []
      
      if (scope === 'referrals') {
        // Include BOTH the participant themselves AND users they referred
        const referralUsersQuery = `
          SELECT ur."referredUserId", u."createdAt"
          FROM user_referral_codes urc
          JOIN user_referrals ur ON urc."referralCode" = ur."referralCode"
          JOIN users u ON ur."referredUserId" = u.id
          WHERE urc."userId" = $1
            AND u."isGuest" IS FALSE
          ORDER BY u."createdAt" ASC
        `
        const referralUsers = await gpaiDb.query(referralUsersQuery, [participant.gpai_user_id])
        // Add the referrer themselves to the list
        userIds = [participant.gpai_user_id, ...referralUsers.rows.map(r => r.referredUserId)]
        
        // Get earliest date (including the referrer themselves)
        earliestDateQuery = `
          SELECT MIN(earliest) as earliest FROM (
            SELECT u."createdAt" as earliest
            FROM users u
            WHERE u.id = $1
            UNION ALL
            SELECT u."createdAt" as earliest
            FROM user_referral_codes urc
            JOIN user_referrals ur ON urc."referralCode" = ur."referralCode"
            JOIN users u ON ur."referredUserId" = u.id
            WHERE urc."userId" = $1
              AND u."isGuest" IS FALSE
          ) combined
        `
        earliestDateParams = [participant.gpai_user_id]
      } else if (scope === 'campus') {
        // All users from the same campus (same email domain)
        const emailDomain = participant.email.split('@')[1]
        const campusUsersQuery = `
          SELECT u.id
          FROM users u
          WHERE LOWER(SPLIT_PART(u.email, '@', 2)) = $1
            AND u."isGuest" IS FALSE
            AND u.email IS NOT NULL
          LIMIT 10000
        `
        const campusUsers = await gpaiDb.query(campusUsersQuery, [emailDomain])
        userIds = campusUsers.rows.map(r => r.id)
        
        // Get earliest date
        earliestDateQuery = `
          SELECT MIN(u."createdAt") as earliest
          FROM users u
          WHERE LOWER(SPLIT_PART(u.email, '@', 2)) = $1
            AND u."isGuest" IS FALSE
            AND u.email IS NOT NULL
        `
        earliestDateParams = [emailDomain]
      } else {
        // All IIT users
        const allUsersQuery = `
          SELECT u.id
          FROM users u
          WHERE u.email LIKE ANY(ARRAY['%@iitb.ac.in', '%@iitd.ac.in', '%@iitk.ac.in', '%@iitkgp.ac.in', 
            '%@iitm.ac.in', '%@iitr.ac.in', '%@iitg.ac.in', '%@iitbbs.ac.in', '%@iitgn.ac.in', 
            '%@iith.ac.in', '%@iiti.ac.in', '%@iitj.ac.in', '%@iitjm.ac.in', '%@iitp.ac.in', 
            '%@iitpkd.ac.in', '%@iitrpr.ac.in', '%@iitbh.ac.in', '%@iitdh.ac.in', '%@iitgoa.ac.in', 
            '%@iitmandi.ac.in', '%@iittp.ac.in', '%@iitdm.ac.in', '%@itbhu.ac.in', '%@iitbhu.ac.in'])
            AND u."isGuest" IS FALSE
          LIMIT 10000
        `
        const allUsers = await gpaiDb.query(allUsersQuery)
        userIds = allUsers.rows.map(r => r.id)
        
        // Get earliest date
        earliestDateQuery = `
          SELECT MIN(u."createdAt") as earliest
          FROM users u
          WHERE u.email LIKE ANY(ARRAY['%@iitb.ac.in', '%@iitd.ac.in', '%@iitk.ac.in', '%@iitkgp.ac.in', 
            '%@iitm.ac.in', '%@iitr.ac.in', '%@iitg.ac.in', '%@iitbbs.ac.in', '%@iitgn.ac.in', 
            '%@iith.ac.in', '%@iiti.ac.in', '%@iitj.ac.in', '%@iitjm.ac.in', '%@iitp.ac.in', 
            '%@iitpkd.ac.in', '%@iitrpr.ac.in', '%@iitbh.ac.in', '%@iitdh.ac.in', '%@iitgoa.ac.in', 
            '%@iitmandi.ac.in', '%@iittp.ac.in', '%@iitdm.ac.in', '%@itbhu.ac.in', '%@iitbhu.ac.in'])
            AND u."isGuest" IS FALSE
        `
        earliestDateParams = []
      }

      if (userIds.length === 0) {
        // Return empty data if no users
        return NextResponse.json({
          dailyMetrics: [],
          currentMetrics: {
            totalSignups: 0,
            dau: 0,
            wau: 0,
            mau: 0,
            solverUniqueUsers: 0,
            solverTotalEvents: 0,
            d1Retention: 0,
            d7Retention: 0,
            d30Retention: 0,
            dauWauStickiness: 0,
            dauMauStickiness: 0
          },
          campusData: [],
          dateRange: null
        })
      }

      // Get the earliest date
      const earliestResult = await gpaiDb.query(earliestDateQuery, earliestDateParams)
      const earliestDate = earliestResult.rows[0]?.earliest || new Date()
      
      // Calculate days from earliest date to now
      const now = new Date()
      const daysDiff = Math.ceil((now.getTime() - new Date(earliestDate).getTime()) / (1000 * 60 * 60 * 24))
      
      // Determine how many days to show
      let daysToShow: number
      if (range === 'all') {
        daysToShow = Math.min(daysDiff, 365) // Show all data, cap at 1 year
      } else if (range === '7d') {
        daysToShow = Math.min(7, daysDiff)
      } else if (range === '30d') {
        daysToShow = Math.min(30, daysDiff)
      } else {
        daysToShow = Math.min(90, daysDiff)
      }

      // Get daily metrics
      const dailyMetrics = []
      for (let i = 0; i < daysToShow; i++) {
        const date = subDays(new Date(), i)
        const dateStr = format(date, 'yyyy-MM-dd')
        
        // Calculate metrics for this day
        // Track activity from multiple sources as per GPAI_DATABASE_STRUCTURE.md:
        // - Signups: Users created on this day
        // - DAU: Users active in chat_messages, solutions, or updatedAt on this day
        // - WAU/MAU: Cumulative users who signed up within the window
        const dayMetricsQuery = `
          WITH user_activity AS (
            SELECT DISTINCT u.id, u."createdAt", u."updatedAt"
            FROM users u
            WHERE u.id = ANY($1::uuid[])
          ),
          solutions_activity AS (
            -- Track when users START solving problems (not just complete)
            SELECT DISTINCT st."userId" as user_id
            FROM task_problem_solutions tps
            JOIN problem_files pf ON pf.id = tps."problemFileId"
            JOIN solver_tasks st ON st.id = pf."taskId"
            WHERE st."userId" = ANY($1::uuid[])
              AND tps."startedAt"::date = $2::date
          )
          SELECT 
            COUNT(DISTINCT CASE WHEN ua."createdAt"::date = $2 THEN ua.id END) as signups,
            COUNT(DISTINCT CASE 
              WHEN ua."updatedAt"::date = $2 THEN ua.id  -- Account activity (signup/update)
              WHEN sa.user_id IS NOT NULL THEN ua.id     -- Solver activity (started solving)
            END) as dau,
            COUNT(DISTINCT CASE 
              WHEN ua."createdAt" <= $2::date 
              AND ua."createdAt" >= $2::date - INTERVAL '7 days' 
              THEN ua.id 
            END) as wau,
            COUNT(DISTINCT CASE 
              WHEN ua."createdAt" <= $2::date 
              AND ua."createdAt" >= $2::date - INTERVAL '30 days' 
              THEN ua.id 
            END) as mau
          FROM user_activity ua
          LEFT JOIN solutions_activity sa ON ua.id = sa.user_id
        `
        
        const dayMetrics = await gpaiDb.query(dayMetricsQuery, [userIds, dateStr])
        
        // Get solver usage for this day - using correct tables per documentation
        const solverQuery = `
          SELECT 
            COUNT(DISTINCT st."userId") as solver_users,
            COUNT(*) as solver_events
          FROM task_problem_solutions tps
          JOIN problem_files pf ON pf.id = tps."problemFileId"
          JOIN solver_tasks st ON st.id = pf."taskId"
          WHERE st."userId" = ANY($1::uuid[])
            AND tps."startedAt"::date = $2
        `
        
        const solverMetrics = await gpaiDb.query(solverQuery, [userIds, dateStr])

        dailyMetrics.push({
          date: dateStr,
          signups: parseInt(dayMetrics.rows[0].signups),
          dau: parseInt(dayMetrics.rows[0].dau),
          wau: parseInt(dayMetrics.rows[0].wau),
          mau: parseInt(dayMetrics.rows[0].mau),
          solverUsers: parseInt(solverMetrics.rows[0].solver_users),
          solverEvents: parseInt(solverMetrics.rows[0].solver_events)
        })
      }

      // Calculate current metrics
      const currentMetricsQuery = `
        WITH user_base AS (
          SELECT DISTINCT u.id, u."createdAt", u."updatedAt"
          FROM users u
          WHERE u.id = ANY($1::uuid[])
        ),
        recent_solutions AS (
          SELECT DISTINCT st."userId" as user_id
          FROM task_problem_solutions tps
          JOIN problem_files pf ON pf.id = tps."problemFileId"
          JOIN solver_tasks st ON st.id = pf."taskId"
          WHERE st."userId" = ANY($1::uuid[])
            AND tps."startedAt" >= NOW() - INTERVAL '1 day'
        )
        SELECT 
          COUNT(DISTINCT ub.id) as total_signups,
          COUNT(DISTINCT CASE 
            WHEN ub."updatedAt" >= NOW() - INTERVAL '1 day' THEN ub.id 
            WHEN rs.user_id IS NOT NULL THEN ub.id  -- Solver activity
          END) as dau,
          COUNT(DISTINCT CASE WHEN ub."createdAt" >= NOW() - INTERVAL '7 days' THEN ub.id END) as wau,
          COUNT(DISTINCT CASE WHEN ub."createdAt" >= NOW() - INTERVAL '30 days' THEN ub.id END) as mau,
          COUNT(DISTINCT CASE WHEN ub."updatedAt" >= ub."createdAt" + INTERVAL '1 day' THEN ub.id END) as d1_retained,
          COUNT(DISTINCT CASE WHEN ub."createdAt" <= NOW() - INTERVAL '7 days' AND ub."updatedAt" >= ub."createdAt" + INTERVAL '7 days' THEN ub.id END) as d7_retained,
          COUNT(DISTINCT CASE WHEN ub."createdAt" <= NOW() - INTERVAL '30 days' AND ub."updatedAt" >= ub."createdAt" + INTERVAL '30 days' THEN ub.id END) as d30_retained,
          COUNT(DISTINCT CASE WHEN ub."createdAt" <= NOW() - INTERVAL '7 days' THEN ub.id END) as d7_eligible,
          COUNT(DISTINCT CASE WHEN ub."createdAt" <= NOW() - INTERVAL '30 days' THEN ub.id END) as d30_eligible
        FROM user_base ub
        LEFT JOIN recent_solutions rs ON ub.id = rs.user_id
      `
      
      const currentMetrics = await gpaiDb.query(currentMetricsQuery, [userIds])
      const metrics = currentMetrics.rows[0]

      // Get solver metrics - using correct tables per documentation
      const solverMetricsQuery = `
        SELECT 
          COUNT(DISTINCT st."userId") as unique_users,
          COUNT(*) as total_events
        FROM task_problem_solutions tps
        JOIN problem_files pf ON pf.id = tps."problemFileId"
        JOIN solver_tasks st ON st.id = pf."taskId"
        WHERE st."userId" = ANY($1::uuid[])
          AND tps."startedAt" >= NOW() - INTERVAL '30 days'
      `
      
      const solverMetrics = await gpaiDb.query(solverMetricsQuery, [userIds])

      // Calculate ratios
      const dau = parseInt(metrics.dau)
      const wau = parseInt(metrics.wau)
      const mau = parseInt(metrics.mau)
      
      const dauWauStickiness = wau > 0 ? Math.round((dau / wau) * 100) : 0
      const dauMauStickiness = mau > 0 ? Math.round((dau / mau) * 100) : 0
      const d1Retention = parseInt(metrics.total_signups) > 0 
        ? Math.round((parseInt(metrics.d1_retained) / parseInt(metrics.total_signups)) * 100) 
        : 0
      const d7Retention = parseInt(metrics.d7_eligible) > 0 
        ? Math.round((parseInt(metrics.d7_retained) / parseInt(metrics.d7_eligible)) * 100) 
        : 0
      const d30Retention = parseInt(metrics.d30_eligible) > 0 
        ? Math.round((parseInt(metrics.d30_retained) / parseInt(metrics.d30_eligible)) * 100) 
        : 0

      // Get leaderboard data based on scope
      let campusData = []
      if (scope === 'campus' || scope === 'referrals') {
        const { data: campusParticipants } = await supabase
          .from('participant')
          .select('*')
          .eq('campus_id', participant.campus_id)
          .order('eligible_referrals_total', { ascending: false })
          .limit(20)

        // Get metrics for each campus participant
        for (const p of campusParticipants || []) {
          // Get their referral metrics from GPai
          const pMetricsQuery = `
            SELECT 
              COUNT(DISTINCT ur."referredUserId") as referrals,
              COUNT(DISTINCT CASE WHEN u."updatedAt" >= NOW() - INTERVAL '1 day' THEN u.id END) as dau,
              COUNT(DISTINCT CASE WHEN u."updatedAt" >= u."createdAt" + INTERVAL '1 day' THEN u.id END) as activated,
              COUNT(DISTINCT CASE WHEN u."createdAt" <= NOW() - INTERVAL '7 days' AND u."updatedAt" >= u."createdAt" + INTERVAL '7 days' THEN u.id END) as retained
            FROM user_referral_codes urc
            LEFT JOIN user_referrals ur ON urc."referralCode" = ur."referralCode"
            LEFT JOIN users u ON ur."referredUserId" = u.id
            WHERE urc."userId" = $1
          `
          
          const pMetrics = await gpaiDb.query(pMetricsQuery, [p.gpai_user_id])
          const pm = pMetrics.rows[0]
          
          campusData.push({
            participantEmail: p.email,
            referrals: parseInt(pm?.referrals || 0),
            dau: parseInt(pm?.dau || 0),
            activationRate: parseInt(pm?.referrals) > 0 
              ? Math.round((parseInt(pm?.activated || 0) / parseInt(pm.referrals)) * 100)
              : 0,
            retentionRate: parseInt(pm?.referrals) > 0 
              ? Math.round((parseInt(pm?.retained || 0) / parseInt(pm.referrals)) * 100)
              : 0
          })
        }
      }

      return NextResponse.json({
        dailyMetrics: dailyMetrics.reverse(), // Oldest to newest
        currentMetrics: {
          totalSignups: parseInt(metrics.total_signups),
          dau,
          wau,
          mau,
          solverUniqueUsers: parseInt(solverMetrics.rows[0].unique_users),
          solverTotalEvents: parseInt(solverMetrics.rows[0].total_events),
          d1Retention,
          d7Retention,
          d30Retention,
          dauWauStickiness,
          dauMauStickiness
        },
        campusData,
        dateRange: {
          earliest: earliestDate,
          latest: new Date(),
          daysShown: daysToShow,
          totalDays: daysDiff
        }
      })

    } finally {
      await gpaiDb.end()
    }

  } catch (error: any) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}