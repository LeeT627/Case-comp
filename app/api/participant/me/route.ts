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
    const { data: participant, error } = await supabase
      .from('participant')
      .select('*, allowed_domain!inner(campus_name)')
      .eq('participant_id', decoded.participant_id)
      .single()

    if (error || !participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      participant_id: participant.participant_id,
      email: participant.email,
      campus_id: participant.campus_id,
      campus_name: participant.allowed_domain.campus_name,
      referral_code: participant.referral_code,
      eligible_referrals_total: participant.eligible_referrals_total,
      unlocked_at: participant.unlocked_at,
      created_at: participant.created_at
    })

  } catch (error: any) {
    console.error('Get participant error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}