import { NextRequest, NextResponse } from 'next/server'
import { Client as PGClient } from 'pg'
import { supabaseAdmin } from '@/lib/supabase'
import jwt from 'jsonwebtoken'

// v2: Fixed test account to use real IIT Delhi campus_id
export async function POST(req: NextRequest) {
  try {
    const { email, referralCodeSuffix } = await req.json()
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }
    
    const emailLower = email.toLowerCase()
    const emailDomain = emailLower.split('@')[1]
    
    // Special test account exception
    const isTestAccount = emailLower === 'himanshuraj6771@gmail.com'
    console.log('Join attempt:', { email: emailLower, isTestAccount })
    
    // Check if domain is allowed (or if it's the test account)
    const supabase = supabaseAdmin()
    let allowedDomain
    
    if (isTestAccount) {
      // Use IIT Delhi as the campus for test account  
      const { data: iitDelhi } = await supabase
        .from('allowed_domain')
        .select('campus_id, campus_name')
        .eq('domain', 'iitd.ac.in')
        .single()
      
      allowedDomain = iitDelhi || {
        campus_id: 'test-campus-id',
        campus_name: 'Test Campus (IIT Delhi)'
      }
    } else {
      const { data } = await supabase
        .from('allowed_domain')
        .select('campus_id, campus_name')
        .eq('domain', emailDomain)
        .single()
      
      allowedDomain = data
      
      if (!allowedDomain) {
        return NextResponse.json(
          { error: 'Your school email domain is not eligible for this competition' },
          { status: 403 }
        )
      }
    }
    
    // Connect to GPai database
    const gpaiDb = new PGClient({ connectionString: process.env.GPAI_DB_URL! })
    await gpaiDb.connect()
    
    try {
      // Find user in GPai database
      const userQuery = `
        SELECT 
          u.id,
          u.email,
          u."isGuest",
          urc."referralCode"
        FROM users u
        LEFT JOIN user_referral_codes urc ON u.id = urc."userId"
        WHERE LOWER(u.email) = $1
          AND u."isGuest" IS FALSE
        LIMIT 1
      `
      
      const userResult = await gpaiDb.query(userQuery, [emailLower])
      
      if (userResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'No GPai account found with this email. Please sign up at gpai.app first.' },
          { status: 404 }
        )
      }
      
      const gpaiUser = userResult.rows[0]
      
      // Optional: Verify referral code suffix
      if (referralCodeSuffix && gpaiUser.referralCode) {
        const codeSuffix = gpaiUser.referralCode.slice(-6)
        if (codeSuffix !== referralCodeSuffix) {
          return NextResponse.json(
            { error: 'Invalid referral code verification' },
            { status: 403 }
          )
        }
      }
      
      // Create or get participant
      const { data: participant, error } = await supabase
        .from('participant')
        .upsert({
          gpai_user_id: gpaiUser.id,
          email: gpaiUser.email,
          campus_id: allowedDomain.campus_id,
          referral_code: gpaiUser.referralCode
        }, {
          onConflict: 'gpai_user_id',
          ignoreDuplicates: false
        })
        .select()
        .single()
      
      if (error) {
        console.error('Participant creation error:', error)
        console.error('Attempted data:', {
          gpai_user_id: gpaiUser.id,
          email: gpaiUser.email,
          campus_id: allowedDomain.campus_id,
          referral_code: gpaiUser.referralCode
        })
        return NextResponse.json(
          { error: `Failed to create participant record: ${error.message}` },
          { status: 500 }
        )
      }
      
      // Count their referrals AND get metrics in one go
      let referralCountQuery
      let countParams
      
      if (isTestAccount) {
        // For test account, count ALL referrals with metrics
        referralCountQuery = `
          SELECT 
            COUNT(*) as count,
            COUNT(CASE WHEN u."updatedAt" >= u."createdAt" + INTERVAL '1 hour' THEN 1 END) as d1_activated,
            COUNT(CASE WHEN u."createdAt" <= NOW() - INTERVAL '7 days' AND u."updatedAt" >= NOW() - INTERVAL '30 days' THEN 1 END) as d7_retained,
            COUNT(CASE WHEN u."updatedAt" >= NOW() - INTERVAL '1 day' THEN 1 END) as dau
          FROM user_referrals ur
          JOIN user_referral_codes urc ON ur."referralCode" = urc."referralCode"
          JOIN users u ON ur."referredUserId" = u.id
          WHERE urc."userId" = $1
            AND u.email IS NOT NULL
            AND u."isGuest" IS FALSE
        `
        countParams = [gpaiUser.id]
      } else {
        // For regular accounts, count only same-domain referrals with metrics
        referralCountQuery = `
          SELECT 
            COUNT(*) as count,
            COUNT(CASE WHEN u."updatedAt" >= u."createdAt" + INTERVAL '1 hour' THEN 1 END) as d1_activated,
            COUNT(CASE WHEN u."createdAt" <= NOW() - INTERVAL '7 days' AND u."updatedAt" >= NOW() - INTERVAL '30 days' THEN 1 END) as d7_retained,
            COUNT(CASE WHEN u."updatedAt" >= NOW() - INTERVAL '1 day' THEN 1 END) as dau
          FROM user_referrals ur
          JOIN user_referral_codes urc ON ur."referralCode" = urc."referralCode"
          JOIN users u ON ur."referredUserId" = u.id
          WHERE urc."userId" = $1
            AND u.email IS NOT NULL
            AND u."isGuest" IS FALSE
            AND LOWER(SPLIT_PART(u.email, '@', 2)) = $2
        `
        countParams = [gpaiUser.id, emailDomain]
      }
      
      const countResult = await gpaiDb.query(referralCountQuery, countParams)
      const stats = countResult.rows[0]
      const referralCount = parseInt(stats?.count || '0')
      
      // Update participant with referral count
      await supabase
        .from('participant')
        .update({
          eligible_referrals_total: referralCount,
          unlocked_at: referralCount >= 5 ? new Date().toISOString() : null
        })
        .eq('participant_id', participant.participant_id)
      
      // Store metrics for this participant
      const today = new Date().toISOString().split('T')[0]
      await supabase
        .from('rt_participant_day')
        .upsert({
          date: today,
          participant_id: participant.participant_id,
          signups: referralCount,
          d1_activated: parseInt(stats?.d1_activated || '0'),
          d7_retained: parseInt(stats?.d7_retained || '0'),
          referred_dau: parseInt(stats?.dau || '0')
        }, {
          onConflict: 'date,participant_id'
        })
      
      // Generate JWT token
      const token = jwt.sign(
        {
          participant_id: participant.participant_id,
          gpai_user_id: participant.gpai_user_id,
          campus_id: participant.campus_id,
          email: participant.email
        },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      )
      
      return NextResponse.json({
        participant_id: participant.participant_id,
        campus_id: participant.campus_id,
        campus_name: allowedDomain.campus_name,
        referral_count: referralCount,
        unlocked: referralCount >= 5,
        token
      })
      
    } finally {
      await gpaiDb.end()
    }
    
  } catch (error: any) {
    console.error('Join error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}