import { NextRequest, NextResponse } from 'next/server'
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

    const supabase = supabaseAdmin()
    
    // Get participant metrics
    const { data: metrics } = await supabase
      .from('rt_participant_day')
      .select('signups, d1_activated, d7_retained, referred_dau')
      .eq('participant_id', decoded.participant_id)
      .order('date', { ascending: false })

    // Sum up all metrics
    let total_signups = 0
    let d1_activated = 0
    let d7_retained = 0
    let referred_dau = 0

    if (metrics) {
      metrics.forEach(m => {
        total_signups += m.signups || 0
        d1_activated += m.d1_activated || 0
        d7_retained += m.d7_retained || 0
        referred_dau += m.referred_dau || 0
      })
    }

    // Get rankings (simplified - you'd want to do this more efficiently)
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
        if (allParticipants[i].campus_id === decoded.campus_id) {
          if (allParticipants[i].participant_id === decoded.participant_id) {
            campus_rank = campus_position
          }
          campus_position++
        }
      }
    }

    return NextResponse.json({
      total_signups,
      d1_activated,
      d7_retained,
      referred_dau,
      campus_rank,
      overall_rank
    })

  } catch (error: any) {
    console.error('Get metrics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}