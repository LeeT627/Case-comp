const { Client } = require('pg');

async function checkHimanshuActivity() {
  const client = new Client({
    connectionString: 'postgresql://comp_ro:turing1123%23@gpai.cluster-cnbeqlnoaeg9.us-west-2.rds.amazonaws.com:5432/production'
  });

  try {
    await client.connect();
    
    // Get himanshuraj6771@gmail.com's user ID
    const userQuery = `
      SELECT id, email, "createdAt", "updatedAt"
      FROM users
      WHERE email = 'himanshuraj6771@gmail.com'
    `;
    
    const userResult = await client.query(userQuery);
    if (userResult.rows.length === 0) {
      console.log('User not found');
      return;
    }
    
    const user = userResult.rows[0];
    const userId = user.id;
    console.log('User:', user.email);
    console.log('Created:', user.createdAt);
    console.log('Updated:', user.updatedAt);
    console.log('User ID:', userId);
    console.log('\n=== HIMANSHU\'S OWN ACTIVITY ===\n');
    
    // Check Solver activity
    const solverQuery = `
      SELECT 
        DATE(tps."startedAt") as date,
        COUNT(*) as solver_events
      FROM task_problem_solutions tps
      JOIN problem_files pf ON pf.id = tps."problemFileId"
      JOIN solver_tasks st ON st.id = pf."taskId"
      WHERE st."userId" = $1
        AND tps."startedAt" >= '2025-08-01'
      GROUP BY DATE(tps."startedAt")
      ORDER BY date
    `;
    
    console.log('Solver activity by day:');
    const solverResult = await client.query(solverQuery, [userId]);
    if (solverResult.rows.length === 0) {
      console.log('No solver activity');
    } else {
      console.log(solverResult.rows);
    }
    
    // Check Chat activity
    const chatQuery = `
      SELECT 
        DATE(cm."createdAt") as date,
        COUNT(*) as messages
      FROM chats c
      JOIN chat_messages cm ON c.id = cm."chatId"
      WHERE c."userId" = $1
        AND cm."createdAt" >= '2025-08-01'
      GROUP BY DATE(cm."createdAt")
      ORDER BY date
    `;
    
    console.log('\nChat activity by day:');
    const chatResult = await client.query(chatQuery, [userId]);
    if (chatResult.rows.length === 0) {
      console.log('No chat activity');
    } else {
      console.log(chatResult.rows);
    }
    
    // Check Notetaker activity
    const notetakerQuery = `
      SELECT 
        DATE("createdAt") as date,
        COUNT(*) as tasks
      FROM notetaker_tasks
      WHERE "userId" = $1
        AND "createdAt" >= '2025-08-01'
      GROUP BY DATE("createdAt")
      ORDER BY date
    `;
    
    console.log('\nNotetaker activity by day:');
    try {
      const notetakerResult = await client.query(notetakerQuery, [userId]);
      if (notetakerResult.rows.length === 0) {
        console.log('No notetaker activity');
      } else {
        console.log(notetakerResult.rows);
      }
    } catch (e) {
      console.log('Error accessing notetaker_tasks');
    }
    
    // Summary
    console.log('\n=== ACTIVITY SUMMARY FOR HIMANSHU ===');
    
    const summaryQuery = `
      WITH solver_stats AS (
        SELECT COUNT(*) as count
        FROM task_problem_solutions tps
        JOIN problem_files pf ON pf.id = tps."problemFileId"
        JOIN solver_tasks st ON st.id = pf."taskId"
        WHERE st."userId" = $1
      ),
      chat_stats AS (
        SELECT COUNT(*) as count
        FROM chats c
        JOIN chat_messages cm ON c.id = cm."chatId"
        WHERE c."userId" = $1
      ),
      notetaker_stats AS (
        SELECT COUNT(*) as count
        FROM notetaker_tasks
        WHERE "userId" = $1
      ),
      cheatsheet_stats AS (
        SELECT COUNT(*) as count
        FROM cheatsheet_tasks
        WHERE "userId" = $1
      )
      SELECT 
        (SELECT count FROM solver_stats) as solver_events,
        (SELECT count FROM chat_stats) as chat_messages,
        (SELECT count FROM notetaker_stats) as notetaker_tasks,
        (SELECT count FROM cheatsheet_stats) as cheatsheet_tasks
    `;
    
    const summaryResult = await client.query(summaryQuery, [userId]);
    console.log(summaryResult.rows[0]);
    
    // Check last activity dates
    const lastActivityQuery = `
      WITH last_solver AS (
        SELECT MAX(tps."startedAt") as last_date
        FROM task_problem_solutions tps
        JOIN problem_files pf ON pf.id = tps."problemFileId"
        JOIN solver_tasks st ON st.id = pf."taskId"
        WHERE st."userId" = $1
      ),
      last_chat AS (
        SELECT MAX(cm."createdAt") as last_date
        FROM chats c
        JOIN chat_messages cm ON c.id = cm."chatId"
        WHERE c."userId" = $1
      )
      SELECT 
        (SELECT last_date FROM last_solver) as last_solver_activity,
        (SELECT last_date FROM last_chat) as last_chat_activity
    `;
    
    const lastActivityResult = await client.query(lastActivityQuery, [userId]);
    console.log('\nLast activity dates:');
    console.log('Last solver:', lastActivityResult.rows[0].last_solver_activity);
    console.log('Last chat:', lastActivityResult.rows[0].last_chat_activity);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkHimanshuActivity();