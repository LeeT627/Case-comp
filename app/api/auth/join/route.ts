import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { email, password, isLogin } = await req.json()
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabase = supabaseAdmin()
    
    if (isLogin) {
      // Handle login
      const { data: participant } = await supabase
        .from('participant')
        .select('*')
        .eq('email', email.toLowerCase())
        .single()

      if (!participant) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }

      // Check password
      if (!participant.password_hash) {
        return NextResponse.json(
          { error: 'Please reset your password' },
          { status: 401 }
        )
      }

      const validPassword = await bcrypt.compare(password, participant.password_hash)
      if (!validPassword) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }

      // Generate token
      const token = jwt.sign(
        { 
          participant_id: participant.participant_id,
          email: participant.email
        },
        process.env.JWT_SECRET!,
        { expiresIn: '30d' }
      )

      return NextResponse.json({
        success: true,
        token,
        participant_id: participant.participant_id
      })

    } else {
      // Handle signup
      
      // Check if email already exists
      const { data: existingParticipant } = await supabase
        .from('participant')
        .select('participant_id')
        .eq('email', email.toLowerCase())
        .single()

      if (existingParticipant) {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 400 }
        )
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10)

      // Create participant
      const { data: newParticipant, error: createError } = await supabase
        .from('participant')
        .insert({
          email: email.toLowerCase(),
          password_hash: hashedPassword,
          // V1.1: No campus requirement, no referral code needed
          campus_id: 'default',
          campus_name: 'Open Registration',
          unlocked_at: new Date().toISOString() // Automatically unlocked
        })
        .select()
        .single()

      if (createError || !newParticipant) {
        console.error('Failed to create participant:', createError)
        return NextResponse.json(
          { error: 'Failed to create account' },
          { status: 500 }
        )
      }

      // Generate token
      const token = jwt.sign(
        { 
          participant_id: newParticipant.participant_id,
          email: newParticipant.email
        },
        process.env.JWT_SECRET!,
        { expiresIn: '30d' }
      )

      return NextResponse.json({
        success: true,
        token,
        participant_id: newParticipant.participant_id
      })
    }

  } catch (error: any) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}