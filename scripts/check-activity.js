const { Client } = require('pg');

async function checkActivity() {
  const client = new Client({
    connectionString: 'postgresql://comp_ro:turing1123%23@gpai.cluster-cnbeqlnoaeg9.us-west-2.rds.amazonaws.com:5432/production'
  });

  try {
    await client.connect();
    
    // Check task_events structure
    const eventsColumnsQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'task_events'
      ORDER BY ordinal_position;
    `;
    const eventsColumns = await client.query(eventsColumnsQuery);
    console.log('=== TASK_EVENTS TABLE COLUMNS ===');
    eventsColumns.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type}`);
    });

    // Check solutions table for user activity
    const solutionsColumnsQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'solutions'
      ORDER BY ordinal_position
      LIMIT 10;
    `;
    const solutionsColumns = await client.query(solutionsColumnsQuery);
    console.log('\n=== SOLUTIONS TABLE COLUMNS (first 10) ===');
    solutionsColumns.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type}`);
    });

    // Count referrals for test user
    console.log('\n=== REFERRAL COUNTS FOR himanshuraj6771@gmail.com ===');
    const referralCount = await client.query(`
      SELECT 
        COUNT(*) as total_referrals,
        COUNT(CASE WHEN u."createdAt" >= NOW() - INTERVAL '7 days' THEN 1 END) as recent_7d,
        COUNT(CASE WHEN u."createdAt" >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_30d
      FROM users u1
      JOIN user_referral_codes urc ON u1.id = urc."userId"
      JOIN user_referrals ur ON urc."referralCode" = ur."referralCode"
      JOIN users u ON ur."referredUserId" = u.id
      WHERE u1.email = 'himanshuraj6771@gmail.com'
        AND u.email IS NOT NULL
        AND u."isGuest" IS FALSE
    `);
    console.log(referralCount.rows[0]);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkActivity();