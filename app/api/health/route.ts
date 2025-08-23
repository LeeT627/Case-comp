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
  
  // Check Supabase connection
  try {
    const supabase = supabaseAdmin()
    const { data, error } = await supabase
      .from('allowed_domain')
      .select('count')
      .limit(1)
      .single()
    
    status.checks.supabase = error ? `Error: ${error.message}` : 'Connected'
    
    // Check if competition exists
    const { data: competition } = await supabase
      .from('competition')
      .select('name, starts_at')
      .limit(1)
      .single()
    
    if (competition) {
      status.competition = {
        name: competition.name,
        started: competition.starts_at
      }
    }
    
    // Count domains
    const { count } = await supabase
      .from('allowed_domain')
      .select('*', { count: 'exact', head: true })
    
    status.checks.allowedDomains = count || 0
    
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