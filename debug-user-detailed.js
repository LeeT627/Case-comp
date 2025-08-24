const { Client } = require('pg');

async function debugUserDetailed() {
  const client = new Client({
    connectionString: 'postgresql://comp_ro:turing1123%23@gpai.cluster-cnbeqlnoaeg9.us-west-2.rds.amazonaws.com:5432/production'
  });

  try {
    await client.connect();
    console.log('Connected to GPai database\n');
    
    // First, let's see what emails exist with similar patterns
    console.log('1. Checking all IIT Delhi users (sample):');
    const iitdUsers = await client.query(
      `SELECT id, email, "isGuest", "createdAt" 
       FROM users 
       WHERE email LIKE '%@iitd.ac.in' 
       ORDER BY "createdAt" DESC 
       LIMIT 10`
    );
    console.log('Recent IIT Delhi users:', iitdUsers.rows.length);
    iitdUsers.rows.forEach(user => {
      console.log(`- ${user.email} (Guest: ${user.isGuest}, Created: ${user.createdAt})`);
    });
    
    // Check specific variations
    console.log('\n2. Checking specific email variations:');
    const variations = [
      'me2222096@iitd.ac.in',
      'ME2222096@iitd.ac.in',
      'me2222096@IITD.AC.IN',
      'ME2222096@IITD.AC.IN'
    ];
    
    for (const email of variations) {
      const result = await client.query(
        `SELECT id, email, "isGuest" FROM users WHERE email = $1`,
        [email]
      );
      console.log(`- "${email}": ${result.rows.length > 0 ? 'FOUND' : 'not found'}`);
      if (result.rows.length > 0) {
        console.log(`  Details: ${JSON.stringify(result.rows[0])}`);
      }
    }
    
    // Check with ILIKE (case-insensitive)
    console.log('\n3. Case-insensitive search:');
    const caseInsensitive = await client.query(
      `SELECT id, email, "isGuest", "createdAt" 
       FROM users 
       WHERE email ILIKE $1`,
      ['me2222096@iitd.ac.in']
    );
    console.log('Results:', caseInsensitive.rows.length);
    if (caseInsensitive.rows.length > 0) {
      console.log('Found user(s):');
      caseInsensitive.rows.forEach(user => {
        console.log(`- Email: "${user.email}"`);
        console.log(`  ID: ${user.id}`);
        console.log(`  isGuest: ${user.isGuest}`);
        console.log(`  Created: ${user.createdAt}`);
      });
    }
    
    // Check if there might be whitespace issues
    console.log('\n4. Checking for whitespace issues:');
    const whitespaceCheck = await client.query(
      `SELECT id, email, LENGTH(email) as email_length, "isGuest"
       FROM users 
       WHERE TRIM(LOWER(email)) = $1`,
      ['me2222096@iitd.ac.in']
    );
    console.log('Results with TRIM:', whitespaceCheck.rows.length);
    if (whitespaceCheck.rows.length > 0) {
      whitespaceCheck.rows.forEach(user => {
        console.log(`- Email: "${user.email}" (length: ${user.email_length})`);
        console.log(`  Expected length: ${'me2222096@iitd.ac.in'.length}`);
      });
    }
    
    // Check the exact query our app uses
    console.log('\n5. Testing EXACT query from our app:');
    const appQuery = `
      SELECT 
        u.id,
        u.email,
        u."isGuest",
        urc."referralCode"
      FROM users u
      LEFT JOIN user_referral_codes urc ON u.id = urc."userId"
      WHERE LOWER(u.email) = $1
        AND u."isGuest" IS FALSE
      LIMIT 1
    `;
    
    const appResult = await client.query(appQuery, ['me2222096@iitd.ac.in']);
    console.log('App query result:', appResult.rows.length, 'rows');
    if (appResult.rows.length > 0) {
      console.log('User found by app query:', appResult.rows[0]);
    } else {
      console.log('User NOT found by app query');
      
      // Try without the isGuest filter
      console.log('\n6. Same query WITHOUT isGuest filter:');
      const noGuestFilter = await client.query(
        `SELECT u.id, u.email, u."isGuest"
         FROM users u
         WHERE LOWER(u.email) = $1
         LIMIT 1`,
        ['me2222096@iitd.ac.in']
      );
      if (noGuestFilter.rows.length > 0) {
        console.log('⚠️ User IS in database but filtered out!');
        console.log('User details:', noGuestFilter.rows[0]);
        if (noGuestFilter.rows[0].isGuest === true) {
          console.log('❌ PROBLEM: User is marked as GUEST account!');
        } else if (noGuestFilter.rows[0].isGuest === null) {
          console.log('❌ PROBLEM: isGuest is NULL (our query filters this out)!');
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
    console.log('\nConnection closed');
  }
}

debugUserDetailed();