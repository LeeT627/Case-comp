import { NextRequest, NextResponse } from 'next/server'
import { Client as PGClient } from 'pg'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const email = 'himanshuraj6771@gmail.com'
    
    const gpaiDb = new PGClient({ connectionString: process.env.GPAI_DB_URL! })
    await gpaiDb.connect()
    
    try {
      // Get user from GPai
      const userQuery = `
        SELECT 
          u.id,
          u.email,
          urc."referralCode"
        FROM users u
        LEFT JOIN user_referral_codes urc ON u.id = urc."userId"
        WHERE LOWER(u.email) = $1
        LIMIT 1
      `
      
      const userResult = await gpaiDb.query(userQuery, [email])
      
      if (userResult.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      
      const gpaiUser = userResult.rows[0]
      
      // Count ALL their referrals (no domain restriction for test account)
      const referralQuery = `
        SELECT 
          COUNT(*) as total_count,
          COUNT(CASE WHEN u."createdAt" >= NOW() - INTERVAL '24 hours' THEN 1 END) as d1_count,
          COUNT(CASE WHEN u."createdAt" <= NOW() - INTERVAL '7 days' THEN 1 END) as d7_eligible,
          COUNT(CASE WHEN u."lastActiveAt" >= NOW() - INTERVAL '1 day' THEN 1 END) as dau_count
        FROM user_referrals ur
        JOIN user_referral_codes urc ON ur."referralCode" = urc."referralCode"
        JOIN users u ON ur."referredUserId" = u.id
        WHERE urc."userId" = $1
          AND u.email IS NOT NULL
          AND u."isGuest" IS FALSE
      `
      
      const referralResult = await gpaiDb.query(referralQuery, [gpaiUser.id])
      const stats = referralResult.rows[0]
      
      // Get detailed list of referrals for analysis
      const detailQuery = `
        SELECT 
          u.email,
          u."createdAt",
          u."lastActiveAt",
          CASE WHEN u."lastActiveAt" >= u."createdAt" + INTERVAL '24 hours' THEN true ELSE false END as d1_activated,
          CASE WHEN u."lastActiveAt" >= u."createdAt" + INTERVAL '7 days' THEN true ELSE false END as d7_retained
        FROM user_referrals ur
        JOIN user_referral_codes urc ON ur."referralCode" = urc."referralCode"
        JOIN users u ON ur."referredUserId" = u.id
        WHERE urc."userId" = $1
          AND u.email IS NOT NULL
          AND u."isGuest" IS FALSE
        ORDER BY u."createdAt" DESC
        LIMIT 100
      `
      
      const detailResult = await gpaiDb.query(detailQuery, [gpaiUser.id])
      
      // Calculate activation metrics
      let d1_activated = 0
      let d7_retained = 0
      
      detailResult.rows.forEach(user => {
        if (user.d1_activated) d1_activated++
        if (user.d7_retained) d7_retained++
      })
      
      // Update participant in Supabase
      const supabase = supabaseAdmin()
      
      // Get participant
      const { data: participant } = await supabase
        .from('participant')
        .select('*')
        .eq('email', email)
        .single()
      
      if (participant) {
        // Update referral count
        await supabase
          .from('participant')
          .update({
            eligible_referrals_total: parseInt(stats.total_count),
            unlocked_at: parseInt(stats.total_count) >= 5 ? new Date().toISOString() : null
          })
          .eq('participant_id', participant.participant_id)
        
        // Update metrics
        const today = new Date().toISOString().split('T')[0]
        
        await supabase
          .from('rt_participant_day')
          .upsert({
            date: today,
            participant_id: participant.participant_id,
            signups: parseInt(stats.total_count),
            d1_activated: d1_activated,
            d7_retained: d7_retained,
            referred_dau: parseInt(stats.dau_count)
          }, {
            onConflict: 'date,participant_id'
          })
      }
      
      return NextResponse.json({
        email,
        referral_code: gpaiUser.referralCode,
        total_referrals: parseInt(stats.total_count),
        d1_activated,
        d7_retained,
        referred_dau: parseInt(stats.dau_count),
        sample_referrals: detailResult.rows.slice(0, 10)
      })
      
    } finally {
      await gpaiDb.end()
    }
    
  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}