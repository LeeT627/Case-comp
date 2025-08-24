const { Client } = require('pg');

async function checkAllTables() {
  const client = new Client({
    connectionString: 'postgresql://comp_ro:turing1123%23@gpai.cluster-cnbeqlnoaeg9.us-west-2.rds.amazonaws.com:5432/production'
  });

  try {
    await client.connect();
    
    // Get all tables that might track user activity
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND (
          table_name LIKE '%user%' 
          OR table_name LIKE '%session%'
          OR table_name LIKE '%activity%'
          OR table_name LIKE '%log%'
          OR table_name LIKE '%event%'
          OR table_name LIKE '%visit%'
          OR table_name LIKE '%track%'
        )
      ORDER BY table_name
    `;
    
    const tables = await client.query(tablesQuery);
    console.log('Potential activity tracking tables:');
    console.log(tables.rows.map(r => r.table_name));
    
    // Check if there's a user_sessions or similar table
    const checkSessionsQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('user_sessions', 'sessions', 'user_activity', 'user_events', 'user_logs')
    `;
    
    const sessionsResult = await client.query(checkSessionsQuery);
    console.log('\nSession-related tables found:', sessionsResult.rows);
    
    // Check for any timestamp columns in users table that might track activity
    const userColumnsQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
        AND data_type LIKE '%timestamp%'
      ORDER BY column_name
    `;
    
    const columnsResult = await client.query(userColumnsQuery);
    console.log('\nTimestamp columns in users table:');
    console.log(columnsResult.rows);
    
    // Sample check - see if ANY user has updatedAt different from recent days
    const recentActivityQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN "updatedAt" >= NOW() - INTERVAL '1 day' THEN 1 END) as active_1d,
        COUNT(CASE WHEN "updatedAt" >= NOW() - INTERVAL '7 days' THEN 1 END) as active_7d,
        COUNT(CASE WHEN "updatedAt" >= NOW() - INTERVAL '30 days' THEN 1 END) as active_30d,
        MAX("updatedAt") as most_recent_update
      FROM users
      WHERE "isGuest" IS FALSE
    `;
    
    const activityResult = await client.query(recentActivityQuery);
    console.log('\nOverall user activity (all users):');
    console.log(activityResult.rows[0]);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkAllTables();