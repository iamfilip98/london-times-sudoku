require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function verifyTables() {
  console.log('🔍 Verifying Supabase tables...');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Try to list tables using the REST API metadata
    console.log('📋 Checking if tables exist in public schema...');

    // Test 1: Try to select from sudoku_games table
    const { data: gameData, error: gameError } = await supabase
      .from('sudoku_games')
      .select('*')
      .limit(1);

    if (gameError) {
      console.log('❌ sudoku_games table error:', gameError.message);
    } else {
      console.log('✅ sudoku_games table exists and accessible');
      console.log('📊 Sample data (if any):', gameData);
    }

    // Test 2: Try to select from daily_completions table
    const { data: completionData, error: completionError } = await supabase
      .from('daily_completions')
      .select('*')
      .limit(1);

    if (completionError) {
      console.log('❌ daily_completions table error:', completionError.message);
    } else {
      console.log('✅ daily_completions table exists and accessible');
      console.log('📊 Sample data (if any):', completionData);
    }

  } catch (error) {
    console.error('💥 Verification failed:', error);
  }
}

verifyTables();