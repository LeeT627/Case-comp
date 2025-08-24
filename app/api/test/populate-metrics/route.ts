import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import jwt from 'jsonwebtoken'

export async function POST(req: NextRequest) {
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
    
    // Add sample metrics for testing
    const today = new Date().toISOString().split('T')[0]
    
    await supabase
      .from('rt_participant_day')
      .upsert({
        date: today,
        participant_id: decoded.participant_id,
        signups: 12,
        d1_activated: 8,
        d7_retained: 5,
        referred_dau: 7
      }, {
        onConflict: 'date,participant_id'
      })

    // Update participant referral count
    await supabase
      .from('participant')
      .update({
        eligible_referrals_total: 12
      })
      .eq('participant_id', decoded.participant_id)

    // Add some campus metrics
    await supabase
      .from('rt_campus_day')
      .upsert({
        date: today,
        campus_id: decoded.campus_id,
        dau: 150,
        new_signups: 25
      }, {
        onConflict: 'date,campus_id'
      })

    // Add overall metrics
    await supabase
      .from('rt_overall_day')
      .upsert({
        date: today,
        dau_total: 2500,
        new_signups_total: 450,
        dau_eligible: 1800,
        new_signups_eligible: 320
      }, {
        onConflict: 'date'
      })

    return NextResponse.json({
      success: true,
      message: 'Test metrics populated'
    })

  } catch (error: any) {
    console.error('Populate metrics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}