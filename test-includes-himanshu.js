const { Client } = require('pg');

async function testIncludesHimanshu() {
  const client = new Client({
    connectionString: 'postgresql://comp_ro:turing1123%23@gpai.cluster-cnbeqlnoaeg9.us-west-2.rds.amazonaws.com:5432/production'
  });

  try {
    await client.connect();
    
    const himanshuId = 'b2196d39-0478-4fea-96bd-b57adddb0969';
    
    // Get referred users (old way)
    const referralUsersQuery = `
      SELECT ur."referredUserId", u."createdAt"
      FROM user_referral_codes urc
      JOIN user_referrals ur ON urc."referralCode" = ur."referralCode"
      JOIN users u ON ur."referredUserId" = u.id
      WHERE urc."userId" = $1
        AND u."isGuest" IS FALSE
      ORDER BY u."createdAt" ASC
    `;
    
    const referralUsers = await client.query(referralUsersQuery, [himanshuId]);
    const userIdsOld = referralUsers.rows.map(r => r.referredUserId);
    
    // New way - include himanshu
    const userIdsNew = [himanshuId, ...referralUsers.rows.map(r => r.referredUserId)];
    
    console.log('OLD WAY (referred users only):');
    console.log(`Total users: ${userIdsOld.length}`);
    console.log(`Includes himanshu? ${userIdsOld.includes(himanshuId)}`);
    
    console.log('\nNEW WAY (referrer + referred):');
    console.log(`Total users: ${userIdsNew.length}`);
    console.log(`Includes himanshu? ${userIdsNew.includes(himanshuId)}`);
    
    // Check solver activity with OLD way
    const solverQueryOld = `
      SELECT 
        COUNT(DISTINCT st."userId") as solver_users,
        COUNT(*) as solver_events,
        MIN(tps."startedAt") as earliest,
        MAX(tps."startedAt") as latest
      FROM task_problem_solutions tps
      JOIN problem_files pf ON pf.id = tps."problemFileId"
      JOIN solver_tasks st ON st.id = pf."taskId"
      WHERE st."userId" = ANY($1::uuid[])
    `;
    
    const oldResult = await client.query(solverQueryOld, [userIdsOld]);
    console.log('\nSolver activity OLD way (referred only):');
    console.log(oldResult.rows[0]);
    
    // Check solver activity with NEW way
    const newResult = await client.query(solverQueryOld, [userIdsNew]);
    console.log('\nSolver activity NEW way (includes himanshu):');
    console.log(newResult.rows[0]);
    
    // Show himanshu's own solver activity
    const himanshuOnly = await client.query(solverQueryOld, [[himanshuId]]);
    console.log('\nHimanshu\'s solver activity alone:');
    console.log(himanshuOnly.rows[0]);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

testIncludesHimanshu();