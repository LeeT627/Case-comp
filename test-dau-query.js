const { Client } = require('pg');

async function testDAU() {
  const client = new Client({
    connectionString: 'postgresql://comp_ro:turing1123%23@gpai.cluster-cnbeqlnoaeg9.us-west-2.rds.amazonaws.com:5432/production'
  });

  try {
    await client.connect();
    
    // Get himanshuraj6771@gmail.com's referred users
    const referredUsersQuery = `
      SELECT 
        u.id,
        u.email,
        u."createdAt",
        u."updatedAt",
        u."isGuest"
      FROM user_referral_codes urc
      JOIN user_referrals ur ON urc."referralCode" = ur."referralCode"
      JOIN users u ON ur."referredUserId" = u.id
      WHERE urc."userId" = (SELECT id FROM users WHERE email = 'himanshuraj6771@gmail.com')
        AND u."isGuest" IS FALSE
      ORDER BY u."createdAt" DESC
      LIMIT 10
    `;
    
    const result = await client.query(referredUsersQuery);
    
    console.log('Sample of referred users:');
    result.rows.forEach(user => {
      console.log('---');
      console.log('Email:', user.email);
      console.log('Created:', user.createdAt);
      console.log('Updated:', user.updatedAt);
    });
    
    // Check what fields actually track activity
    const activityFieldsQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
        AND column_name IN ('updatedAt', 'lastActive', 'lastLogin', 'lastSeen', 'lastActivityAt')
    `;
    
    const fieldsResult = await client.query(activityFieldsQuery);
    console.log('\nAvailable activity tracking fields:');
    console.log(fieldsResult.rows);
    
    // Check daily activity using different fields
    const activityQuery = `
      SELECT 
        DATE(u."createdAt") as date,
        COUNT(DISTINCT CASE WHEN u."createdAt"::date = DATE(u."createdAt") THEN u.id END) as signups,
        COUNT(DISTINCT CASE WHEN u."updatedAt"::date = DATE(u."createdAt") THEN u.id END) as updated_same_day
      FROM user_referral_codes urc
      JOIN user_referrals ur ON urc."referralCode" = ur."referralCode"
      JOIN users u ON ur."referredUserId" = u.id
      WHERE urc."userId" = (SELECT id FROM users WHERE email = 'himanshuraj6771@gmail.com')
        AND u."isGuest" IS FALSE
      GROUP BY DATE(u."createdAt")
      ORDER BY date
    `;
    
    const activityResult = await client.query(activityQuery);
    console.log('\nDaily activity patterns:');
    console.log(activityResult.rows);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

testDAU();