const { Client } = require('pg');

async function testSolverTables() {
  const client = new Client({
    connectionString: 'postgresql://comp_ro:turing1123%23@gpai.cluster-cnbeqlnoaeg9.us-west-2.rds.amazonaws.com:5432/production'
  });

  try {
    await client.connect();
    
    // Get himanshuraj6771@gmail.com's referred user IDs
    const userIdsQuery = `
      SELECT ur."referredUserId"
      FROM user_referral_codes urc
      JOIN user_referrals ur ON urc."referralCode" = ur."referralCode"
      JOIN users u ON ur."referredUserId" = u.id
      WHERE urc."userId" = (SELECT id FROM users WHERE email = 'himanshuraj6771@gmail.com')
        AND u."isGuest" IS FALSE
    `;
    
    const userIdsResult = await client.query(userIdsQuery);
    const userIds = userIdsResult.rows.map(r => r.referredUserId);
    console.log(`Found ${userIds.length} referred users\n`);
    
    // Check task_problem_solutions table with correct join
    const solverQuery = `
      SELECT 
        DATE(tps."startedAt") as date,
        COUNT(DISTINCT st."userId") as solver_users,
        COUNT(*) as solver_events
      FROM task_problem_solutions tps
      JOIN problem_files pf ON pf.id = tps."problemFileId"
      JOIN solver_tasks st ON st.id = pf."taskId"
      WHERE st."userId" = ANY($1::uuid[])
        AND tps."startedAt" >= '2025-08-01'
      GROUP BY DATE(tps."startedAt")
      ORDER BY date
    `;
    
    console.log('Solver activity from task_problem_solutions:');
    const solverResult = await client.query(solverQuery, [userIds]);
    console.log(solverResult.rows);
    
    // Check overall solver activity for these users
    const overallQuery = `
      SELECT 
        COUNT(DISTINCT st."userId") as unique_users,
        MIN(tps."startedAt") as earliest,
        MAX(tps."startedAt") as latest,
        COUNT(*) as total_events
      FROM task_problem_solutions tps
      JOIN problem_files pf ON pf.id = tps."problemFileId"
      JOIN solver_tasks st ON st.id = pf."taskId"
      WHERE st."userId" = ANY($1::uuid[])
    `;
    
    console.log('\nOverall solver activity:');
    const overallResult = await client.query(overallQuery, [userIds]);
    console.log(overallResult.rows[0]);
    
    // Check if ANY user in the platform has solver activity (to verify tables work)
    const platformQuery = `
      SELECT 
        DATE(tps."startedAt") as date,
        COUNT(DISTINCT st."userId") as solver_users,
        COUNT(*) as solver_events
      FROM task_problem_solutions tps
      JOIN problem_files pf ON pf.id = tps."problemFileId"
      JOIN solver_tasks st ON st.id = pf."taskId"
      WHERE tps."startedAt" >= CURRENT_DATE - INTERVAL '7 days'
        AND st."userId" IS NOT NULL
      GROUP BY DATE(tps."startedAt")
      ORDER BY date DESC
      LIMIT 7
    `;
    
    console.log('\nPlatform-wide solver activity (last 7 days):');
    const platformResult = await client.query(platformQuery);
    console.log(platformResult.rows);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

testSolverTables();