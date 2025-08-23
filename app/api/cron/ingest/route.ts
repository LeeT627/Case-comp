import { NextRequest, NextResponse } from 'next/server'
import { Client as PGClient } from 'pg'
import { supabaseAdmin } from '@/lib/supabase'
import { getTodayIST, getISTDayStart, getISTDayEnd } from '@/lib/time'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds max

// Verify cron secret if configured
function verifyCronSecret(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true
  
  const authHeader = req.headers.get('authorization')
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = supabaseAdmin()
  const gpaiDb = new PGClient({ connectionString: process.env.GPAI_DB_URL! })
  
  try {
    await gpaiDb.connect()
    console.log('Connected to GPai database')
    
    const todayIST = getTodayIST()
    const todayStart = getISTDayStart(todayIST)
    const todayEnd = getISTDayEnd(todayIST)
    
    console.log(`Processing data for ${todayIST} IST`)
    
    // Get cursor
    const { data: cursor } = await supabase
      .from('ingest_cursor')
      .select('*')
      .eq('name', 'main')
      .single()
    
    const lastUserCreatedAt = cursor?.last_user_created_at || '2024-01-01'
    
    // Step 1: Get allowed domains from Supabase
    const { data: allowedDomains } = await supabase
      .from('allowed_domain')
      .select('domain, campus_id')
    
    const domainMap = new Map(allowedDomains?.map(d => [d.domain, d.campus_id]) || [])
    const domainList = Array.from(domainMap.keys())
    
    // Step 2: Fetch new eligible users from GPai
    const newUsersQuery = `
      SELECT 
        u.id as user_id,
        u.email,
        u."createdAt",
        ur."referralCode",
        urc."userId" as referrer_user_id
      FROM users u
      LEFT JOIN user_referrals ur ON u.id = ur."referredUserId"
      LEFT JOIN user_referral_codes urc ON ur."referralCode" = urc."referralCode"
      WHERE u."createdAt" > $1
        AND u.email IS NOT NULL
        AND u."isGuest" IS FALSE
        AND LOWER(SPLIT_PART(u.email, '@', 2)) = ANY($2)
      ORDER BY u."createdAt"
      LIMIT 1000
    `
    
    const newUsersResult = await gpaiDb.query(newUsersQuery, [
      lastUserCreatedAt,
      domainList
    ])
    
    console.log(`Found ${newUsersResult.rows.length} new eligible users`)
    
    // Step 3: Process new users
    for (const user of newUsersResult.rows) {
      const emailDomain = user.email.toLowerCase().split('@')[1]
      const campusId = domainMap.get(emailDomain)
      
      if (!campusId) continue
      
      // Check if referrer is a participant
      let referrerParticipantId = null
      if (user.referrer_user_id) {
        const { data: referrerParticipant } = await supabase
          .from('participant')
          .select('participant_id')
          .eq('gpai_user_id', user.referrer_user_id)
          .single()
        
        referrerParticipantId = referrerParticipant?.participant_id
      }
      
      // Create or update participant
      const { data: participant } = await supabase
        .from('participant')
        .upsert({
          gpai_user_id: user.user_id,
          email: user.email,
          campus_id: campusId,
          referral_code: user.referralCode
        }, {
          onConflict: 'gpai_user_id',
          ignoreDuplicates: false
        })
        .select()
        .single()
      
      // If referred by a participant, update their metrics
      if (referrerParticipantId) {
        // Check if signup is today
        const signupDate = new Date(user.createdAt)
        if (signupDate >= todayStart && signupDate < todayEnd) {
          // Update today's signup count for referrer
          await supabase
            .from('rt_participant_day')
            .upsert({
              date: todayIST,
              participant_id: referrerParticipantId,
              signups: 1
            }, {
              onConflict: 'date,participant_id',
              ignoreDuplicates: false
            })
        }
      }
      
      // Update campus metrics
      const signupDate = new Date(user.createdAt)
      if (signupDate >= todayStart && signupDate < todayEnd) {
        await supabase
          .from('rt_campus_day')
          .upsert({
            date: todayIST,
            campus_id: campusId,
            new_signups: 1
          }, {
            onConflict: 'date,campus_id',
            ignoreDuplicates: false
          })
      }
    }
    
    // Step 4: Calculate DAU from solver_tasks
    const dauQuery = `
      SELECT COUNT(DISTINCT st."userId") as dau
      FROM solver_tasks st
      JOIN users u ON st."userId" = u.id
      WHERE st."createdAt" >= $1
        AND st."createdAt" < $2
        AND st."deletedAt" IS NULL
        AND u.email IS NOT NULL
        AND u."isGuest" IS FALSE
        AND LOWER(SPLIT_PART(u.email, '@', 2)) = ANY($3)
    `
    
    const dauResult = await gpaiDb.query(dauQuery, [
      todayStart,
      todayEnd,
      domainList
    ])
    
    const dauEligible = dauResult.rows[0]?.dau || 0
    console.log(`DAU (eligible): ${dauEligible}`)
    
    // Update overall metrics
    await supabase
      .from('rt_overall_day')
      .upsert({
        date: todayIST,
        dau_eligible: dauEligible,
        new_signups_eligible: newUsersResult.rows.length
      }, {
        onConflict: 'date',
        ignoreDuplicates: false
      })
    
    // Step 5: Update participant unlock status
    // Count total eligible referrals for each participant
    const { data: participants } = await supabase
      .from('participant')
      .select('participant_id, gpai_user_id, unlocked_at')
      .is('unlocked_at', null)
    
    for (const participant of participants || []) {
      // Count their total referrals
      const referralCountQuery = `
        SELECT COUNT(*) as count
        FROM user_referrals ur
        JOIN user_referral_codes urc ON ur."referralCode" = urc."referralCode"
        JOIN users u ON ur."referredUserId" = u.id
        WHERE urc."userId" = $1
          AND u.email IS NOT NULL
          AND u."isGuest" IS FALSE
          AND LOWER(SPLIT_PART(u.email, '@', 2)) = ANY($2)
      `
      
      const countResult = await gpaiDb.query(referralCountQuery, [
        participant.gpai_user_id,
        domainList
      ])
      
      const referralCount = parseInt(countResult.rows[0]?.count || '0')
      
      // Update participant
      await supabase
        .from('participant')
        .update({
          eligible_referrals_total: referralCount,
          unlocked_at: referralCount >= 5 ? new Date().toISOString() : null
        })
        .eq('participant_id', participant.participant_id)
    }
    
    // Step 6: Update cursor
    const latestUserCreatedAt = newUsersResult.rows[newUsersResult.rows.length - 1]?.createdAt
    if (latestUserCreatedAt) {
      await supabase
        .from('ingest_cursor')
        .update({
          last_user_created_at: latestUserCreatedAt,
          last_run_at: new Date().toISOString(),
          rows_processed: newUsersResult.rows.length
        })
        .eq('name', 'main')
    }
    
    return NextResponse.json({
      ok: true,
      processed: {
        newUsers: newUsersResult.rows.length,
        dauEligible,
        date: todayIST
      }
    })
    
  } catch (error: any) {
    console.error('Ingestion error:', error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    )
  } finally {
    await gpaiDb.end()
  }
}