require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');

async function testAndSetupDatabase() {
  console.log('🔧 Testing Supabase database connection...');

  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to Supabase PostgreSQL successfully!');

    // Get database version
    const result = await client.query('SELECT version();');
    console.log('📊 Database version:', result.rows[0].version.split(' ')[0]);

    // Read and execute SQL file
    const sql = fs.readFileSync('./create-tables.sql', 'utf8');
    console.log('🏗️  Creating tables...');

    await client.query(sql);
    console.log('✅ Tables created successfully!');

    // Test insert
    const testResult = await client.query(`
      INSERT INTO sudoku_games (date, player, difficulty, time_seconds, mistakes, hints_used, completed, score)
      VALUES ('2025-09-22', 'test_user', 'medium', 300, 2, 1, true, 850)
      ON CONFLICT (date, player, difficulty)
      DO UPDATE SET score = EXCLUDED.score
      RETURNING id;
    `);

    console.log('✅ Test insert successful! Game ID:', testResult.rows[0].id);

    // Clean up test data
    await client.query("DELETE FROM sudoku_games WHERE player = 'test_user'");
    console.log('🧹 Test data cleaned up');

    client.release();
    console.log('🎉 Database setup complete! Ready for use.');

  } catch (error) {
    console.error('❌ Database error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testAndSetupDatabase();
