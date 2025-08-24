const { Client } = require('pg');

async function checkTaskEvents() {
  const client = new Client({
    connectionString: 'postgresql://comp_ro:turing1123%23@gpai.cluster-cnbeqlnoaeg9.us-west-2.rds.amazonaws.com:5432/production'
  });

  try {
    await client.connect();
    
    const himanshuId = 'b2196d39-0478-4fea-96bd-b57adddb0969';
    
    // Check what event types exist in task_events
    console.log('=== TASK_EVENTS EVENT TYPES ===\n');
    const eventTypes = await client.query(`
      SELECT DISTINCT "eventType", COUNT(*) as count
      FROM task_events
      WHERE "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY "eventType"
      ORDER BY count DESC
    `);
    console.log('Event types in last 30 days:');
    eventTypes.rows.forEach(row => {
      console.log(`  - ${row.eventType}: ${row.count} events`);
    });
    
    // Check himanshu's recent task events
    console.log('\n=== HIMANSHU\'S RECENT TASK EVENTS ===\n');
    const himanshuEvents = await client.query(`
      SELECT 
        te."eventType",
        te."createdAt",
        te."taskId",
        te."eventData"
      FROM task_events te
      WHERE te."taskId" IN (
        SELECT id FROM solver_tasks WHERE "userId" = $1
      )
      ORDER BY te."createdAt" DESC
      LIMIT 20
    `, [himanshuId]);
    
    if (himanshuEvents.rows.length > 0) {
      console.log('Recent events:');
      himanshuEvents.rows.forEach(event => {
        console.log(`${event.createdAt}: ${event.eventType} (task: ${event.taskId})`);
        if (event.eventData) {
          console.log(`  Data: ${JSON.stringify(event.eventData).substring(0, 100)}...`);
        }
      });
    } else {
      console.log('No recent task events found');
    }
    
    // Check relationship between solver_tasks and task_problem_solutions
    console.log('\n=== SOLVER TASKS vs SOLUTIONS RELATIONSHIP ===\n');
    const relationship = await client.query(`
      SELECT 
        st.id as task_id,
        st."createdAt" as task_created,
        st."updatedAt" as task_updated,
        COUNT(DISTINCT pf.id) as problem_files,
        COUNT(DISTINCT tps.id) as solutions,
        MIN(tps."startedAt") as first_solution_start,
        MAX(tps."completedAt") as last_solution_complete
      FROM solver_tasks st
      LEFT JOIN problem_files pf ON pf."taskId" = st.id
      LEFT JOIN task_problem_solutions tps ON tps."problemFileId" = pf.id
      WHERE st."userId" = $1
        AND st."createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY st.id, st."createdAt", st."updatedAt"
      ORDER BY st."createdAt" DESC
      LIMIT 10
    `, [himanshuId]);
    
    console.log('Recent solver tasks and their solutions:');
    relationship.rows.forEach(row => {
      console.log(`\nTask ${row.task_id}:`);
      console.log(`  Created: ${row.task_created}`);
      console.log(`  Updated: ${row.task_updated}`);
      console.log(`  Problem files: ${row.problem_files}`);
      console.log(`  Solutions: ${row.solutions}`);
      console.log(`  First solution started: ${row.first_solution_start}`);
      console.log(`  Last solution completed: ${row.last_solution_complete}`);
    });
    
    // Check if there's activity we're missing
    console.log('\n=== CHECKING FOR RECENT ACTIVITY ===\n');
    
    // Check solver_tasks created/updated in last 7 days
    const recentSolverTasks = await client.query(`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*) as tasks_created,
        COUNT(CASE WHEN "updatedAt" != "createdAt" THEN 1 END) as tasks_updated
      FROM solver_tasks
      WHERE "userId" = $1
        AND ("createdAt" >= NOW() - INTERVAL '7 days' OR "updatedAt" >= NOW() - INTERVAL '7 days')
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
    `, [himanshuId]);
    
    console.log('Solver tasks activity (last 7 days):');
    if (recentSolverTasks.rows.length > 0) {
      recentSolverTasks.rows.forEach(row => {
        console.log(`  ${row.date}: ${row.tasks_created} created, ${row.tasks_updated} updated`);
      });
    } else {
      console.log('  No activity in last 7 days');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTaskEvents();