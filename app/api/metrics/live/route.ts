import { NextRequest, NextResponse } from 'next/server'
import { Client as PGClient } from 'pg'
import { supabaseAdmin } from '@/lib/supabase'
import jwt from 'jsonwebtoken'

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

    // Connect to GPai to get LIVE data
    const gpaiDb = new PGClient({ connectionString: process.env.GPAI_DB_URL! })
    await gpaiDb.connect()

    try {
      // Get live referral metrics
      const metricsQuery = `
        SELECT 
          COUNT(*) as total_signups,
          COUNT(CASE WHEN u."updatedAt" >= u."createdAt" + INTERVAL '1 hour' THEN 1 END) as d1_activated,
          COUNT(CASE WHEN u."createdAt" <= NOW() - INTERVAL '7 days' AND u."updatedAt" >= NOW() - INTERVAL '30 days' THEN 1 END) as d7_retained,
          COUNT(CASE WHEN u."updatedAt" >= NOW() - INTERVAL '1 day' THEN 1 END) as referred_dau
        FROM user_referral_codes urc
        JOIN user_referrals ur ON urc."referralCode" = ur."referralCode"
        JOIN users u ON ur."referredUserId" = u.id
        WHERE urc."userId" = $1
          AND u.email IS NOT NULL
          AND u."isGuest" IS FALSE
      `
      
      const result = await gpaiDb.query(metricsQuery, [participant.gpai_user_id])
      const metrics = result.rows[0]

      // Update stored metrics
      const today = new Date().toISOString().split('T')[0]
      await supabase
        .from('rt_participant_day')
        .upsert({
          date: today,
          participant_id: participant.participant_id,
          signups: parseInt(metrics.total_signups),
          d1_activated: parseInt(metrics.d1_activated),
          d7_retained: parseInt(metrics.d7_retained),
          referred_dau: parseInt(metrics.referred_dau)
        }, {
          onConflict: 'date,participant_id'
        })

      // Calculate rankings
      const { data: allParticipants } = await supabase
        .from('participant')
        .select('participant_id, campus_id, eligible_referrals_total')
        .order('eligible_referrals_total', { ascending: false })

      let overall_rank = 0
      let campus_rank = 0
      let campus_position = 1

      if (allParticipants) {
        for (let i = 0; i < allParticipants.length; i++) {
          if (allParticipants[i].participant_id === decoded.participant_id) {
            overall_rank = i + 1
          }
          if (allParticipants[i].campus_id === participant.campus_id) {
            if (allParticipants[i].participant_id === decoded.participant_id) {
              campus_rank = campus_position
            }
            campus_position++
          }
        }
      }

      return NextResponse.json({
        total_signups: parseInt(metrics.total_signups),
        d1_activated: parseInt(metrics.d1_activated),
        d7_retained: parseInt(metrics.d7_retained),
        referred_dau: parseInt(metrics.referred_dau),
        campus_rank,
        overall_rank,
        last_updated: new Date().toISOString()
      })

    } finally {
      await gpaiDb.end()
    }

  } catch (error: any) {
    console.error('Live metrics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}