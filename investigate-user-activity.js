const { Client } = require('pg');

async function investigateActivity() {
  const client = new Client({
    connectionString: 'postgresql://comp_ro:turing1123%23@gpai.cluster-cnbeqlnoaeg9.us-west-2.rds.amazonaws.com:5432/production'
  });

  try {
    await client.connect();
    
    // Get a sample of referred users and check their actual activity
    const usersQuery = `
      SELECT 
        u.id,
        u.email,
        u."createdAt",
        u."updatedAt",
        CASE 
          WHEN u."updatedAt" > u."createdAt" + INTERVAL '1 hour' THEN 'YES'
          ELSE 'NO'
        END as has_later_activity,
        (u."updatedAt" - u."createdAt") as time_diff
      FROM user_referral_codes urc
      JOIN user_referrals ur ON urc."referralCode" = ur."referralCode"
      JOIN users u ON ur."referredUserId" = u.id
      WHERE urc."userId" = (SELECT id FROM users WHERE email = 'himanshuraj6771@gmail.com')
        AND u."isGuest" IS FALSE
      ORDER BY u."createdAt" DESC
      LIMIT 20
    `;
    
    const usersResult = await client.query(usersQuery);
    console.log('Sample of referred users and their activity:\n');
    usersResult.rows.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log(`Created: ${user.createdAt}`);
      console.log(`Updated: ${user.updatedAt}`);
      console.log(`Has later activity: ${user.has_later_activity}`);
      console.log(`Time diff: ${user.time_diff}`);
      console.log('---');
    });
    
    // Check if there are ANY tables that track user activity
    const activityCheckQuery = `
      SELECT 
        'solutions' as source,
        COUNT(DISTINCT s.metadata->>'userId') as unique_users,
        MIN(s."createdAt") as earliest,
        MAX(s."createdAt") as latest,
        COUNT(*) as total_records
      FROM solutions s
      WHERE (s.metadata->>'userId')::uuid IN (
        SELECT ur."referredUserId"
        FROM user_referral_codes urc
        JOIN user_referrals ur ON urc."referralCode" = ur."referralCode"
        WHERE urc."userId" = (SELECT id FROM users WHERE email = 'himanshuraj6771@gmail.com')
      )
      
      UNION ALL
      
      SELECT 
        'conversations' as source,
        COUNT(DISTINCT c."userId") as unique_users,
        MIN(c."createdAt") as earliest,
        MAX(c."createdAt") as latest,
        COUNT(*) as total_records
      FROM conversations c
      WHERE c."userId" IN (
        SELECT ur."referredUserId"
        FROM user_referral_codes urc
        JOIN user_referrals ur ON urc."referralCode" = ur."referralCode"
        WHERE urc."userId" = (SELECT id FROM users WHERE email = 'himanshuraj6771@gmail.com')
      )
      
      UNION ALL
      
      SELECT 
        'messages' as source,
        COUNT(DISTINCT m."userId") as unique_users,
        MIN(m."createdAt") as earliest,
        MAX(m."createdAt") as latest,
        COUNT(*) as total_records
      FROM messages m
      WHERE m."userId" IN (
        SELECT ur."referredUserId"
        FROM user_referral_codes urc
        JOIN user_referrals ur ON urc."referralCode" = ur."referralCode"
        WHERE urc."userId" = (SELECT id FROM users WHERE email = 'himanshuraj6771@gmail.com')
      )
    `;
    
    console.log('\nActivity across different tables:');
    try {
      const activityResult = await client.query(activityCheckQuery);
      console.log(activityResult.rows);
    } catch (e) {
      console.log('Error checking activity tables:', e.message);
    }
    
    // Check if updatedAt changes with any user actions
    const recentUpdatesQuery = `
      SELECT 
        DATE(u."updatedAt") as update_date,
        COUNT(DISTINCT u.id) as users_updated,
        COUNT(DISTINCT CASE WHEN u."updatedAt" != u."createdAt" THEN u.id END) as users_with_real_updates
      FROM user_referral_codes urc
      JOIN user_referrals ur ON urc."referralCode" = ur."referralCode"
      JOIN users u ON ur."referredUserId" = u.id
      WHERE urc."userId" = (SELECT id FROM users WHERE email = 'himanshuraj6771@gmail.com')
        AND u."isGuest" IS FALSE
      GROUP BY DATE(u."updatedAt")
      ORDER BY update_date DESC
    `;
    
    console.log('\nUpdates by date:');
    const updatesResult = await client.query(recentUpdatesQuery);
    console.log(updatesResult.rows);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

investigateActivity();