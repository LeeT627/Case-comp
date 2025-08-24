import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const status: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasSupabaseService: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasGpaiDb: !!process.env.GPAI_DB_URL,
      hasJwtSecret: !!process.env.JWT_SECRET,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'not set'
    },
    checks: {}
  }
  
  // Check Supabase connection (v1.1)
  try {
    const supabase = supabaseAdmin()
    
    // Check if participant table exists
    const { data, error } = await supabase
      .from('participant')
      .select('count(*)', { count: 'exact', head: true })
    
    status.checks.supabase = error ? `Error: ${error.message}` : 'Connected'
    
    // Check competition config
    const { data: config } = await supabase
      .from('competition_config')
      .select('deadline, is_active')
      .single()
    
    if (config) {
      status.competition = {
        deadline: config.deadline,
        active: config.is_active
      }
    }
    
    // Count participants
    const { count } = await supabase
      .from('participant')
      .select('*', { count: 'exact', head: true })
    
    status.checks.participants = count || 0
    
  } catch (error: any) {
    status.checks.supabase = `Error: ${error.message}`
  }
  
  // Determine overall health
  const isHealthy = status.checks.supabase === 'Connected' && 
                    status.environment.hasSupabaseUrl &&
                    status.environment.hasSupabaseService
  
  return NextResponse.json(status, { 
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  })
}