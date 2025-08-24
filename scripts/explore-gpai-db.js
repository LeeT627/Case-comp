const { Client } = require('pg');

async function exploreDatabase() {
  const client = new Client({
    connectionString: 'postgresql://comp_ro:turing1123%23@gpai.cluster-cnbeqlnoaeg9.us-west-2.rds.amazonaws.com:5432/production'
  });

  try {
    await client.connect();
    console.log('Connected to GPai database\n');

    // List all tables
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    const tables = await client.query(tablesQuery);
    console.log('=== TABLES ===');
    tables.rows.forEach(row => console.log(`- ${row.table_name}`));

    // Get users table structure
    const usersColumnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `;
    const usersColumns = await client.query(usersColumnsQuery);
    console.log('\n=== USERS TABLE COLUMNS ===');
    usersColumns.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Get user_referrals table structure
    const referralsColumnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'user_referrals'
      ORDER BY ordinal_position;
    `;
    const referralsColumns = await client.query(referralsColumnsQuery);
    console.log('\n=== USER_REFERRALS TABLE COLUMNS ===');
    referralsColumns.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Get user_referral_codes table structure
    const codesColumnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'user_referral_codes'
      ORDER BY ordinal_position;
    `;
    const codesColumns = await client.query(codesColumnsQuery);
    console.log('\n=== USER_REFERRAL_CODES TABLE COLUMNS ===');
    codesColumns.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Check for activity/session related tables
    const activityTablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND (table_name LIKE '%session%' 
          OR table_name LIKE '%activity%' 
          OR table_name LIKE '%active%'
          OR table_name LIKE '%login%'
          OR table_name LIKE '%event%')
      ORDER BY table_name;
    `;
    const activityTables = await client.query(activityTablesQuery);
    console.log('\n=== ACTIVITY/SESSION RELATED TABLES ===');
    activityTables.rows.forEach(row => console.log(`- ${row.table_name}`));

    // Sample a user to see actual data structure
    console.log('\n=== SAMPLE USER DATA ===');
    const sampleUser = await client.query(`
      SELECT * FROM users 
      WHERE email = 'himanshuraj6771@gmail.com'
      LIMIT 1
    `);
    if (sampleUser.rows.length > 0) {
      console.log('User columns available:');
      Object.keys(sampleUser.rows[0]).forEach(key => {
        const value = sampleUser.rows[0][key];
        console.log(`- ${key}: ${value !== null ? typeof value : 'null'}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

exploreDatabase();