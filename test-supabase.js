require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testSupabase() {
  console.log('🔧 Testing Supabase client connection...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Test connection by creating tables
    console.log('🏗️  Creating sudoku_games table...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS sudoku_games (
          id SERIAL PRIMARY KEY,
          date DATE NOT NULL,
          player VARCHAR(50) NOT NULL,
          difficulty VARCHAR(20) NOT NULL,
          time_seconds INTEGER NOT NULL,
          mistakes INTEGER DEFAULT 0,
          hints_used INTEGER DEFAULT 0,
          completed BOOLEAN DEFAULT true,
          score INTEGER,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(date, player, difficulty)
        );
      `
    });

    if (error) {
      console.log('ℹ️  Table creation via RPC not available, trying direct insert...');
      
      // Test with a simple insert operation
      const { data: testData, error: insertError } = await supabase
        .from('sudoku_games')
        .insert([
          {
            date: '2025-09-22',
            player: 'test_user',
            difficulty: 'medium',
            time_seconds: 300,
            mistakes: 2,
            hints_used: 1,
            completed: true,
            score: 850
          }
        ])
        .select();

      if (insertError) {
        console.log('⚠️  Insert failed, likely table doesn\'t exist:', insertError.message);
        console.log('📋 Please create the tables manually using the Supabase dashboard');
        console.log('📄 Use the SQL from create-tables.sql file');
      } else {
        console.log('✅ Supabase connection successful!');
        console.log('🎯 Test insert successful:', testData);
        
        // Clean up
        await supabase
          .from('sudoku_games')
          .delete()
          .eq('player', 'test_user');
        
        console.log('🧹 Test data cleaned up');
      }
    } else {
      console.log('✅ Tables created successfully via RPC');
    }

  } catch (error) {
    console.error('❌ Supabase error:', error.message);
  }
}

testSupabase();
