const { Client } = require('pg');

async function debugUser() {
  const client = new Client({
    connectionString: 'postgresql://comp_ro:turing1123%23@gpai.cluster-cnbeqlnoaeg9.us-west-2.rds.amazonaws.com:5432/production'
  });

  try {
    await client.connect();
    console.log('Connected to GPai database\n');
    
    const email = 'me2222096@iitd.ac.in';
    
    // Check exact match with lowercase
    console.log('1. Checking with LOWER(email) =', email.toLowerCase());
    const result1 = await client.query(
      `SELECT id, email, "isGuest", "createdAt" FROM users WHERE LOWER(email) = $1`,
      [email.toLowerCase()]
    );
    console.log('Result:', result1.rows.length, 'rows found');
    if (result1.rows.length > 0) {
      console.log('User found:', result1.rows[0]);
    }
    
    // Check exact match without lowercase
    console.log('\n2. Checking with exact email =', email);
    const result2 = await client.query(
      `SELECT id, email, "isGuest", "createdAt" FROM users WHERE email = $1`,
      [email]
    );
    console.log('Result:', result2.rows.length, 'rows found');
    if (result2.rows.length > 0) {
      console.log('User found:', result2.rows[0]);
    }
    
    // Check with different case variations
    console.log('\n3. Checking case variations');
    const result3 = await client.query(
      `SELECT id, email, "isGuest" FROM users WHERE email IN ($1, $2, $3)`,
      [email, email.toUpperCase(), 'ME2222096@iitd.ac.in']
    );
    console.log('Result:', result3.rows.length, 'rows found');
    if (result3.rows.length > 0) {
      console.log('User found:', result3.rows[0]);
    }
    
    // Check partial match
    console.log('\n4. Checking partial match with LIKE');
    const result4 = await client.query(
      `SELECT id, email, "isGuest" FROM users WHERE email ILIKE $1 LIMIT 5`,
      ['%me2222096%']
    );
    console.log('Result:', result4.rows.length, 'rows found');
    result4.rows.forEach(row => console.log('- ', row.email));
    
    // Check if it's a guest account issue
    console.log('\n5. Checking without guest filter');
    const result5 = await client.query(
      `SELECT id, email, "isGuest", "createdAt" FROM users WHERE LOWER(email) = $1`,
      [email.toLowerCase()]
    );
    console.log('Result (including guests):', result5.rows.length, 'rows found');
    if (result5.rows.length > 0) {
      const user = result5.rows[0];
      console.log('User details:');
      console.log('- ID:', user.id);
      console.log('- Email:', user.email);
      console.log('- Is Guest:', user.isGuest);
      console.log('- Created:', user.createdAt);
      
      if (user.isGuest === true) {
        console.log('\n⚠️  ISSUE FOUND: User is marked as GUEST!');
        console.log('This is why they cannot join the competition.');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
    console.log('\nConnection closed');
  }
}

debugUser();