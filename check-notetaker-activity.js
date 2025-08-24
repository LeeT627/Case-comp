const { Client } = require('pg');

async function checkNotetakerActivity() {
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
    
    // Check notetaker_tasks activity
    const notetakerQuery = `
      SELECT 
        DATE(nt."createdAt") as date,
        COUNT(DISTINCT nt."userId") as notetaker_users,
        COUNT(*) as notetaker_events
      FROM notetaker_tasks nt
      WHERE nt."userId" = ANY($1::uuid[])
        AND nt."createdAt" >= '2025-08-01'
      GROUP BY DATE(nt."createdAt")
      ORDER BY date
    `;
    
    console.log('Notetaker activity:');
    try {
      const notetakerResult = await client.query(notetakerQuery, [userIds]);
      if (notetakerResult.rows.length === 0) {
        console.log('No notetaker activity found');
      } else {
        console.log(notetakerResult.rows);
      }
    } catch (e) {
      console.log('Error querying notetaker_tasks:', e.message);
    }
    
    // Check cheatsheet_tasks activity
    const cheatsheetQuery = `
      SELECT 
        DATE(ct."createdAt") as date,
        COUNT(DISTINCT ct."userId") as cheatsheet_users,
        COUNT(*) as cheatsheet_events
      FROM cheatsheet_tasks ct
      WHERE ct."userId" = ANY($1::uuid[])
        AND ct."createdAt" >= '2025-08-01'
      GROUP BY DATE(ct."createdAt")
      ORDER BY date
    `;
    
    console.log('\nCheatsheet activity:');
    try {
      const cheatsheetResult = await client.query(cheatsheetQuery, [userIds]);
      if (cheatsheetResult.rows.length === 0) {
        console.log('No cheatsheet activity found');
      } else {
        console.log(cheatsheetResult.rows);
      }
    } catch (e) {
      console.log('Error querying cheatsheet_tasks:', e.message);
    }
    
    // Summary of all activities for these users
    console.log('\n=== ACTIVITY SUMMARY ===');
    
    // Solver
    const solverSummary = await client.query(`
      SELECT COUNT(DISTINCT st."userId") as users, COUNT(*) as events
      FROM task_problem_solutions tps
      JOIN problem_files pf ON pf.id = tps."problemFileId"
      JOIN solver_tasks st ON st.id = pf."taskId"
      WHERE st."userId" = ANY($1::uuid[])
    `, [userIds]);
    console.log('Solver:', solverSummary.rows[0]);
    
    // Chat
    const chatSummary = await client.query(`
      SELECT COUNT(DISTINCT c."userId") as users, COUNT(*) as events
      FROM chats c
      JOIN chat_messages cm ON c.id = cm."chatId"
      WHERE c."userId" = ANY($1::uuid[])
    `, [userIds]);
    console.log('Chat:', chatSummary.rows[0]);
    
    // Notetaker
    try {
      const notetakerSummary = await client.query(`
        SELECT COUNT(DISTINCT "userId") as users, COUNT(*) as events
        FROM notetaker_tasks
        WHERE "userId" = ANY($1::uuid[])
      `, [userIds]);
      console.log('Notetaker:', notetakerSummary.rows[0]);
    } catch (e) {
      console.log('Notetaker: Not accessible');
    }
    
    // Cheatsheet
    try {
      const cheatsheetSummary = await client.query(`
        SELECT COUNT(DISTINCT "userId") as users, COUNT(*) as events
        FROM cheatsheet_tasks
        WHERE "userId" = ANY($1::uuid[])
      `, [userIds]);
      console.log('Cheatsheet:', cheatsheetSummary.rows[0]);
    } catch (e) {
      console.log('Cheatsheet: Not accessible');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkNotetakerActivity();