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
    const filter = searchParams.get('filter') || 'campus'

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
      // Calculate date range
      const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
      const startDate = subDays(new Date(), days)

      // Get all referral user IDs for this participant
      const referralUsersQuery = `
        SELECT ur."referredUserId"
        FROM user_referral_codes urc
        JOIN user_referrals ur ON urc."referralCode" = ur."referralCode"
        WHERE urc."userId" = $1
      `
      const referralUsers = await gpaiDb.query(referralUsersQuery, [participant.gpai_user_id])
      const userIds = referralUsers.rows.map(r => r.referredUserId)

      if (userIds.length === 0) {
        // Return empty data if no referrals
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
          campusData: []
        })
      }

      // Get daily metrics
      const dailyMetrics = []
      for (let i = 0; i < days; i++) {
        const date = subDays(new Date(), i)
        const dateStr = format(date, 'yyyy-MM-dd')
        
        // Calculate metrics for this day
        const dayMetricsQuery = `
          SELECT 
            COUNT(DISTINCT CASE WHEN u."createdAt"::date = $2 THEN u.id END) as signups,
            COUNT(DISTINCT CASE WHEN u."updatedAt"::date = $2 THEN u.id END) as dau,
            COUNT(DISTINCT CASE WHEN u."updatedAt" >= $2::date - INTERVAL '7 days' THEN u.id END) as wau,
            COUNT(DISTINCT CASE WHEN u."updatedAt" >= $2::date - INTERVAL '30 days' THEN u.id END) as mau
          FROM users u
          WHERE u.id = ANY($1::uuid[])
        `
        
        const dayMetrics = await gpaiDb.query(dayMetricsQuery, [userIds, dateStr])
        
        // Get solver usage for this day
        const solverQuery = `
          SELECT 
            COUNT(DISTINCT s.metadata->>'userId') as solver_users,
            COUNT(*) as solver_events
          FROM solutions s
          WHERE s.metadata->>'userId' = ANY($1::text[])
            AND s."createdAt"::date = $2
        `
        
        const solverMetrics = await gpaiDb.query(solverQuery, [
          userIds.map(id => id.toString()),
          dateStr
        ])

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
        SELECT 
          COUNT(DISTINCT u.id) as total_signups,
          COUNT(DISTINCT CASE WHEN u."updatedAt" >= NOW() - INTERVAL '1 day' THEN u.id END) as dau,
          COUNT(DISTINCT CASE WHEN u."updatedAt" >= NOW() - INTERVAL '7 days' THEN u.id END) as wau,
          COUNT(DISTINCT CASE WHEN u."updatedAt" >= NOW() - INTERVAL '30 days' THEN u.id END) as mau,
          COUNT(DISTINCT CASE WHEN u."updatedAt" >= u."createdAt" + INTERVAL '1 day' THEN u.id END) as d1_retained,
          COUNT(DISTINCT CASE WHEN u."createdAt" <= NOW() - INTERVAL '7 days' AND u."updatedAt" >= u."createdAt" + INTERVAL '7 days' THEN u.id END) as d7_retained,
          COUNT(DISTINCT CASE WHEN u."createdAt" <= NOW() - INTERVAL '30 days' AND u."updatedAt" >= u."createdAt" + INTERVAL '30 days' THEN u.id END) as d30_retained,
          COUNT(DISTINCT CASE WHEN u."createdAt" <= NOW() - INTERVAL '7 days' THEN u.id END) as d7_eligible,
          COUNT(DISTINCT CASE WHEN u."createdAt" <= NOW() - INTERVAL '30 days' THEN u.id END) as d30_eligible
        FROM users u
        WHERE u.id = ANY($1::uuid[])
      `
      
      const currentMetrics = await gpaiDb.query(currentMetricsQuery, [userIds])
      const metrics = currentMetrics.rows[0]

      // Get solver metrics
      const solverMetricsQuery = `
        SELECT 
          COUNT(DISTINCT s.metadata->>'userId') as unique_users,
          COUNT(*) as total_events
        FROM solutions s
        WHERE s.metadata->>'userId' = ANY($1::text[])
          AND s."createdAt" >= NOW() - INTERVAL '30 days'
      `
      
      const solverMetrics = await gpaiDb.query(solverMetricsQuery, [
        userIds.map(id => id.toString())
      ])

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

      // Get campus data
      let campusData = []
      if (filter === 'campus') {
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
        campusData
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