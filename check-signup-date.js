const { Client } = require('pg');

async function checkSignupDate() {
  const client = new Client({
    connectionString: 'postgresql://comp_ro:turing1123%23@gpai.cluster-cnbeqlnoaeg9.us-west-2.rds.amazonaws.com:5432/production'
  });

  try {
    await client.connect();
    
    // Check when himanshuraj6771@gmail.com signed up
    const result = await client.query(`
      SELECT 
        u.email,
        u."createdAt",
        u."updatedAt",
        urc."referralCode"
      FROM users u
      LEFT JOIN user_referral_codes urc ON u.id = urc."userId"
      WHERE u.email = 'himanshuraj6771@gmail.com'
    `);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('User:', user.email);
      console.log('Created At:', user.createdAt);
      console.log('Updated At:', user.updatedAt);
      console.log('Referral Code:', user.referralCode);
      
      // Check when their referrals signed up
      const referralsResult = await client.query(`
        SELECT 
          MIN(u2."createdAt") as earliest_referral,
          MAX(u2."createdAt") as latest_referral,
          COUNT(*) as total_referrals
        FROM user_referral_codes urc
        JOIN user_referrals ur ON urc."referralCode" = ur."referralCode"
        JOIN users u2 ON ur."referredUserId" = u2.id
        WHERE urc."userId" = (SELECT id FROM users WHERE email = 'himanshuraj6771@gmail.com')
      `);
      
      if (referralsResult.rows.length > 0) {
        console.log('\nReferral Stats:');
        console.log('Earliest Referral:', referralsResult.rows[0].earliest_referral);
        console.log('Latest Referral:', referralsResult.rows[0].latest_referral);
        console.log('Total Referrals:', referralsResult.rows[0].total_referrals);
      }
    } else {
      console.log('User not found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkSignupDate();