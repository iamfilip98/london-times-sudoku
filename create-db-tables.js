require('dotenv').config({ path: '.env.local' });

async function createTables() {
  console.log('🏗️  Creating database tables...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const sql = `
    -- Create sudoku_games table for individual game results
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

    -- Create daily_completions table for tracking puzzle availability
    CREATE TABLE IF NOT EXISTS daily_completions (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        player VARCHAR(50) NOT NULL,
        difficulty VARCHAR(20) NOT NULL,
        completed BOOLEAN DEFAULT false,
        completed_at TIMESTAMP,
        UNIQUE(date, player, difficulty)
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_sudoku_games_date ON sudoku_games (date DESC);
    CREATE INDEX IF NOT EXISTS idx_sudoku_games_player ON sudoku_games (player);
    CREATE INDEX IF NOT EXISTS idx_daily_completions_date ON daily_completions (date DESC);
    CREATE INDEX IF NOT EXISTS idx_daily_completions_player ON daily_completions (player);
  `;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      // Try alternative approach using direct SQL execution
      console.log('Trying alternative method...');
      
      const altResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey
        },
        body: JSON.stringify({
          query: sql
        })
      });
      
      if (!altResponse.ok) {
        throw new Error(`Failed to create tables: ${response.status} ${await response.text()}`);
      }
    }

    console.log('✅ Database tables created successfully!');
    
    // Test the tables by inserting and then deleting a test record
    console.log('🧪 Testing table functionality...');
    
    const testResponse = await fetch(`${supabaseUrl}/rest/v1/sudoku_games`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        date: '2025-09-22',
        player: 'test_user',
        difficulty: 'medium',
        time_seconds: 300,
        mistakes: 2,
        hints_used: 1,
        completed: true,
        score: 850
      })
    });

    if (testResponse.ok) {
      const testData = await testResponse.json();
      console.log('✅ Test insert successful! Record ID:', testData[0]?.id);
      
      // Clean up test data
      await fetch(`${supabaseUrl}/rest/v1/sudoku_games?player=eq.test_user`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey
        }
      });
      console.log('🧹 Test data cleaned up');
    } else {
      console.log('⚠️  Table creation might have succeeded, but test insert failed');
    }

    console.log('🎉 Database setup complete!');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    process.exit(1);
  }
}

createTables();
