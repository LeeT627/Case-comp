const { Client } = require('pg');

async function testActivityTracking() {
  const client = new Client({
    connectionString: 'postgresql://comp_ro:turing1123%23@gpai.cluster-cnbeqlnoaeg9.us-west-2.rds.amazonaws.com:5432/production'
  });

  try {
    await client.connect();
    
    // Check solutions table for user activity
    const solutionsActivityQuery = `
      SELECT 
        DATE(s."createdAt") as date,
        COUNT(DISTINCT s.metadata->>'userId') as active_users,
        COUNT(*) as total_solutions
      FROM solutions s
      WHERE s.metadata->>'userId' IN (
        SELECT ur."referredUserId"::text
        FROM user_referral_codes urc
        JOIN user_referrals ur ON urc."referralCode" = ur."referralCode"
        WHERE urc."userId" = (SELECT id FROM users WHERE email = 'himanshuraj6771@gmail.com')
      )
      AND s."createdAt" >= '2025-08-01'
      GROUP BY DATE(s."createdAt")
      ORDER BY date
    `;
    
    console.log('Solutions activity by day:');
    const solutionsResult = await client.query(solutionsActivityQuery);
    console.log(solutionsResult.rows);
    
    // Check if there's a sessions or activity table
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%session%' 
        OR table_name LIKE '%activity%'
        OR table_name LIKE '%login%'
        OR table_name LIKE '%event%'
      LIMIT 20
    `;
    
    const tablesResult = await client.query(tablesQuery);
    console.log('\nPotential activity tracking tables:');
    console.log(tablesResult.rows);
    
    // Check user_events table if it exists
    const userEventsQuery = `
      SELECT 
        DATE(ue."createdAt") as date,
        COUNT(DISTINCT ue."userId") as active_users,
        COUNT(*) as total_events
      FROM user_events ue
      WHERE ue."userId" IN (
        SELECT ur."referredUserId"
        FROM user_referral_codes urc
        JOIN user_referrals ur ON urc."referralCode" = ur."referralCode"
        WHERE urc."userId" = (SELECT id FROM users WHERE email = 'himanshuraj6771@gmail.com')
      )
      AND ue."createdAt" >= '2025-08-01'
      GROUP BY DATE(ue."createdAt")
      ORDER BY date
      LIMIT 20
    `;
    
    try {
      const eventsResult = await client.query(userEventsQuery);
      console.log('\nUser events activity by day:');
      console.log(eventsResult.rows);
    } catch (e) {
      console.log('\nuser_events table does not exist or is not accessible');
    }
    
    // Let's also check conversations table
    const conversationsQuery = `
      SELECT 
        DATE(c."updatedAt") as date,
        COUNT(DISTINCT c."userId") as active_users,
        COUNT(*) as total_conversations
      FROM conversations c
      WHERE c."userId" IN (
        SELECT ur."referredUserId"
        FROM user_referral_codes urc
        JOIN user_referrals ur ON urc."referralCode" = ur."referralCode"
        WHERE urc."userId" = (SELECT id FROM users WHERE email = 'himanshuraj6771@gmail.com')
      )
      AND c."updatedAt" >= '2025-08-01'
      GROUP BY DATE(c."updatedAt")
      ORDER BY date
      LIMIT 20
    `;
    
    try {
      const convResult = await client.query(conversationsQuery);
      console.log('\nConversations activity by day:');
      console.log(convResult.rows);
    } catch (e) {
      console.log('\nconversations table query failed');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

testActivityTracking();