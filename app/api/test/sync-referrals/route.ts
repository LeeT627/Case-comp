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
          COUNT(CASE WHEN u."createdAt" >= NOW() - INTERVAL '24 hours' THEN 1 END) as new_today,
          COUNT(CASE WHEN u."createdAt" >= NOW() - INTERVAL '7 days' THEN 1 END) as new_7d,
          COUNT(CASE WHEN u."createdAt" >= NOW() - INTERVAL '30 days' THEN 1 END) as new_30d,
          COUNT(CASE WHEN u."updatedAt" >= NOW() - INTERVAL '1 day' THEN 1 END) as active_today
        FROM user_referrals ur
        JOIN user_referral_codes urc ON ur."referralCode" = urc."referralCode"
        JOIN users u ON ur."referredUserId" = u.id
        WHERE urc."userId" = $1
          AND u.email IS NOT NULL
          AND u."isGuest" IS FALSE
      `
      
      const referralResult = await gpaiDb.query(referralQuery, [gpaiUser.id])
      const stats = referralResult.rows[0]
      
      // Since we don't have detailed activity tracking, use simplified metrics
      // D1 activated: users who updated their profile within 24h of creation
      // D7 retained: users created more than 7 days ago who are still active
      const metricsQuery = `
        SELECT 
          COUNT(CASE 
            WHEN u."updatedAt" >= u."createdAt" + INTERVAL '1 hour' 
            THEN 1 
          END) as d1_activated,
          COUNT(CASE 
            WHEN u."createdAt" <= NOW() - INTERVAL '7 days' 
            AND u."updatedAt" >= NOW() - INTERVAL '30 days'
            THEN 1 
          END) as d7_retained
        FROM user_referrals ur
        JOIN user_referral_codes urc ON ur."referralCode" = urc."referralCode"
        JOIN users u ON ur."referredUserId" = u.id
        WHERE urc."userId" = $1
          AND u.email IS NOT NULL
          AND u."isGuest" IS FALSE
      `
      
      const metricsResult = await gpaiDb.query(metricsQuery, [gpaiUser.id])
      const metrics = metricsResult.rows[0]
      
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
            d1_activated: parseInt(metrics.d1_activated),
            d7_retained: parseInt(metrics.d7_retained),
            referred_dau: parseInt(stats.active_today)
          }, {
            onConflict: 'date,participant_id'
          })
      }
      
      return NextResponse.json({
        email,
        referral_code: gpaiUser.referralCode,
        total_referrals: parseInt(stats.total_count),
        new_today: parseInt(stats.new_today),
        new_7d: parseInt(stats.new_7d),
        new_30d: parseInt(stats.new_30d),
        d1_activated: parseInt(metrics.d1_activated),
        d7_retained: parseInt(metrics.d7_retained),
        referred_dau: parseInt(stats.active_today)
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