const { Client } = require('pg');

async function checkSolverFields() {
  const client = new Client({
    connectionString: 'postgresql://comp_ro:turing1123%23@gpai.cluster-cnbeqlnoaeg9.us-west-2.rds.amazonaws.com:5432/production'
  });

  try {
    await client.connect();
    
    // Check solver_tasks columns
    console.log('=== SOLVER_TASKS TABLE STRUCTURE ===\n');
    const solverTasksColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'solver_tasks'
      ORDER BY ordinal_position
    `);
    console.log('solver_tasks columns:');
    solverTasksColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Check task_problem_solutions columns
    console.log('\n=== TASK_PROBLEM_SOLUTIONS TABLE STRUCTURE ===\n');
    const tpsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'task_problem_solutions'
      ORDER BY ordinal_position
    `);
    console.log('task_problem_solutions columns:');
    tpsColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Check task_events columns
    console.log('\n=== TASK_EVENTS TABLE STRUCTURE ===\n');
    const taskEventsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'task_events'
      ORDER BY ordinal_position
    `);
    console.log('task_events columns:');
    taskEventsColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Sample data from solver_tasks for himanshu
    const himanshuId = 'b2196d39-0478-4fea-96bd-b57adddb0969';
    console.log('\n=== SAMPLE SOLVER_TASKS DATA FOR HIMANSHU ===\n');
    const sampleSolver = await client.query(`
      SELECT *
      FROM solver_tasks
      WHERE "userId" = $1
      ORDER BY "createdAt" DESC
      LIMIT 3
    `, [himanshuId]);
    
    if (sampleSolver.rows.length > 0) {
      console.log('Sample solver_tasks records:');
      sampleSolver.rows.forEach(row => {
        console.log('\n---');
        Object.keys(row).forEach(key => {
          if (row[key] !== null && key !== 'prompt' && key !== 'result') {
            console.log(`${key}: ${row[key]}`);
          }
        });
      });
    }
    
    // Check for stream-related fields
    console.log('\n=== CHECKING FOR STREAM-RELATED FIELDS ===\n');
    
    // Check all tables for stream-related columns
    const streamColumns = await client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          column_name ILIKE '%stream%'
          OR column_name ILIKE '%start%'
          OR column_name ILIKE '%begin%'
        )
      ORDER BY table_name, column_name
    `);
    
    console.log('Columns with stream/start/begin in name:');
    streamColumns.rows.forEach(col => {
      console.log(`  - ${col.table_name}.${col.column_name}: ${col.data_type}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkSolverFields();