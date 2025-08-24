const { Client } = require('pg');

async function verifyActivityTables() {
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
    
    // Check solutions table activity
    const solutionsQuery = `
      SELECT 
        DATE(s."createdAt") as date,
        COUNT(DISTINCT s.metadata->>'userId') as unique_users,
        COUNT(*) as total_solutions,
        ARRAY_AGG(DISTINCT s.metadata->>'userId') as user_ids
      FROM solutions s
      WHERE s.metadata->>'userId' = ANY($1::text[])
      GROUP BY DATE(s."createdAt")
      ORDER BY date DESC
      LIMIT 20
    `;
    
    console.log('Solutions activity:');
    const solutionsResult = await client.query(solutionsQuery, [userIds.map(id => id.toString())]);
    if (solutionsResult.rows.length === 0) {
      console.log('No solutions found for these users');
    } else {
      console.log(solutionsResult.rows);
    }
    
    // Check task_events table activity
    const taskEventsQuery = `
      SELECT 
        DATE(te."createdAt") as date,
        COUNT(DISTINCT te."taskId") as unique_tasks,
        COUNT(*) as total_events,
        ARRAY_AGG(DISTINCT te."eventType") as event_types
      FROM task_events te
      WHERE EXISTS (
        SELECT 1 FROM solutions s 
        WHERE s.metadata->>'userId' = ANY($1::text[])
        AND s.id::text = te."taskId"
      )
      GROUP BY DATE(te."createdAt")
      ORDER BY date DESC
      LIMIT 20
    `;
    
    console.log('\nTask events activity:');
    try {
      const taskEventsResult = await client.query(taskEventsQuery, [userIds.map(id => id.toString())]);
      if (taskEventsResult.rows.length === 0) {
        console.log('No task events found for these users');
      } else {
        console.log(taskEventsResult.rows);
      }
    } catch (e) {
      console.log('Error querying task_events:', e.message);
    }
    
    // Check chat_messages table activity
    const chatMessagesQuery = `
      SELECT 
        DATE(cm."createdAt") as date,
        COUNT(DISTINCT c."userId") as unique_users,
        COUNT(*) as total_messages
      FROM chats c
      JOIN chat_messages cm ON c.id = cm."chatId"
      WHERE c."userId" = ANY($1::uuid[])
      GROUP BY DATE(cm."createdAt")
      ORDER BY date DESC
      LIMIT 20
    `;
    
    console.log('\nChat messages activity:');
    try {
      const chatResult = await client.query(chatMessagesQuery, [userIds]);
      if (chatResult.rows.length === 0) {
        console.log('No chat messages found for these users');
      } else {
        console.log(chatResult.rows);
      }
    } catch (e) {
      console.log('Error querying chat_messages:', e.message);
    }
    
    // Check if ANY of these users have ANY activity in solutions
    const anyActivityQuery = `
      SELECT 
        COUNT(DISTINCT s.metadata->>'userId') as users_with_solutions,
        MIN(s."createdAt") as earliest_solution,
        MAX(s."createdAt") as latest_solution,
        COUNT(*) as total_solutions
      FROM solutions s
      WHERE s.metadata->>'userId' = ANY($1::text[])
    `;
    
    console.log('\nOverall solutions activity summary:');
    const anyActivityResult = await client.query(anyActivityQuery, [userIds.map(id => id.toString())]);
    console.log(anyActivityResult.rows[0]);
    
    // Let's also check if the metadata field actually contains userId correctly
    const sampleSolutionQuery = `
      SELECT 
        s.id,
        s.metadata,
        s."createdAt"
      FROM solutions s
      LIMIT 5
    `;
    
    console.log('\nSample solutions to verify metadata structure:');
    const sampleResult = await client.query(sampleSolutionQuery);
    sampleResult.rows.forEach(row => {
      console.log(`ID: ${row.id}, Created: ${row.createdAt}`);
      console.log(`Metadata: ${JSON.stringify(row.metadata)}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

verifyActivityTables();