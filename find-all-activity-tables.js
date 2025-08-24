const { Client } = require('pg');

async function findAllActivityTables() {
  const client = new Client({
    connectionString: 'postgresql://comp_ro:turing1123%23@gpai.cluster-cnbeqlnoaeg9.us-west-2.rds.amazonaws.com:5432/production'
  });

  try {
    await client.connect();
    
    // Find ALL tables that might track user activity
    const tablesQuery = `
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_name = t.table_name 
         AND column_name IN ('userId', 'user_id', 'createdAt', 'startedAt', 'timestamp')) as relevant_columns
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    const tables = await client.query(tablesQuery);
    console.log('All tables with potential activity tracking:\n');
    
    // Filter to show only tables with relevant columns
    const relevantTables = tables.rows.filter(t => t.relevant_columns > 0);
    
    for (const table of relevantTables) {
      // Check if table has userId column
      const columnsQuery = `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1 
          AND column_name IN ('userId', 'user_id', 'createdAt', 'updatedAt', 'startedAt', 'timestamp')
        ORDER BY column_name
      `;
      
      const columns = await client.query(columnsQuery, [table.table_name]);
      
      // Check if this table has recent data for himanshu
      const himanshuId = 'b2196d39-0478-4fea-96bd-b57adddb0969';
      let hasRecentActivity = false;
      let activityCount = 0;
      
      try {
        // Try different column names
        let userColumn = columns.rows.find(c => c.column_name === 'userId' || c.column_name === 'user_id');
        let dateColumn = columns.rows.find(c => ['createdAt', 'startedAt', 'updatedAt', 'timestamp'].includes(c.column_name));
        
        if (userColumn && dateColumn) {
          const activityQuery = `
            SELECT COUNT(*) as count,
                   MAX("${dateColumn.column_name}") as last_activity
            FROM ${table.table_name}
            WHERE "${userColumn.column_name}" = $1
              AND "${dateColumn.column_name}" >= NOW() - INTERVAL '30 days'
          `;
          
          const result = await client.query(activityQuery, [himanshuId]);
          activityCount = parseInt(result.rows[0].count);
          hasRecentActivity = activityCount > 0;
          
          if (hasRecentActivity) {
            console.log(`✅ ${table.table_name}:`);
            console.log(`   - Columns: ${columns.rows.map(c => c.column_name).join(', ')}`);
            console.log(`   - Recent activity for himanshu: ${activityCount} records`);
            console.log(`   - Last activity: ${result.rows[0].last_activity}`);
            console.log('');
          }
        }
      } catch (e) {
        // Table might not be accessible or query failed
      }
    }
    
    // Now check the specific tables we're currently tracking
    console.log('\n=== CURRENT TRACKING STATUS ===\n');
    
    const himanshuId = 'b2196d39-0478-4fea-96bd-b57adddb0969';
    
    // Check updatedAt
    const updatedQuery = `
      SELECT "updatedAt", ("updatedAt" >= NOW() - INTERVAL '7 days') as is_recent
      FROM users
      WHERE id = $1
    `;
    const updatedResult = await client.query(updatedQuery, [himanshuId]);
    console.log('users.updatedAt:', updatedResult.rows[0].updatedAt);
    console.log('Is recent (last 7 days)?', updatedResult.rows[0].is_recent);
    
    // Check chat messages
    const chatQuery = `
      SELECT COUNT(*) as count, MAX(cm."createdAt") as last_message
      FROM chats c
      JOIN chat_messages cm ON c.id = cm."chatId"
      WHERE c."userId" = $1
        AND cm."createdAt" >= NOW() - INTERVAL '7 days'
    `;
    const chatResult = await client.query(chatQuery, [himanshuId]);
    console.log('\nchat_messages in last 7 days:', chatResult.rows[0].count);
    console.log('Last message:', chatResult.rows[0].last_message);
    
    // Check solver activity
    const solverQuery = `
      SELECT COUNT(*) as count, MAX(tps."startedAt") as last_solve
      FROM task_problem_solutions tps
      JOIN problem_files pf ON pf.id = tps."problemFileId"
      JOIN solver_tasks st ON st.id = pf."taskId"
      WHERE st."userId" = $1
        AND tps."startedAt" >= NOW() - INTERVAL '7 days'
    `;
    const solverResult = await client.query(solverQuery, [himanshuId]);
    console.log('\ntask_problem_solutions in last 7 days:', solverResult.rows[0].count);
    console.log('Last solve:', solverResult.rows[0].last_solve);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

findAllActivityTables();