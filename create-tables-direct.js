const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function createTables() {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );

    console.log('🏗️ Creating database tables directly...');

    try {
        // Create sudoku_games table
        const { data: gamesTable, error: gamesError } = await supabase
            .from('sudoku_games')
            .select('id')
            .limit(1);

        if (gamesError && gamesError.code === 'PGRST116') {
            console.log('📄 sudoku_games table does not exist. Please create it manually in Supabase.');
            console.log('SQL to execute in Supabase SQL Editor:');
            console.log(`
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

CREATE TABLE IF NOT EXISTS daily_completions (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    player VARCHAR(50) NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    UNIQUE(date, player, difficulty)
);

-- Create PostgreSQL function for saving game results
CREATE OR REPLACE FUNCTION save_game_result(
    p_date DATE,
    p_player VARCHAR(50),
    p_difficulty VARCHAR(20),
    p_time_seconds INTEGER,
    p_mistakes INTEGER DEFAULT 0,
    p_hints_used INTEGER DEFAULT 0,
    p_completed BOOLEAN DEFAULT true,
    p_score INTEGER DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Insert or update sudoku_games table
    INSERT INTO sudoku_games (date, player, difficulty, time_seconds, mistakes, hints_used, completed, score)
    VALUES (p_date, p_player, p_difficulty, p_time_seconds, p_mistakes, p_hints_used, p_completed, p_score)
    ON CONFLICT (date, player, difficulty)
    DO UPDATE SET
        time_seconds = EXCLUDED.time_seconds,
        mistakes = EXCLUDED.mistakes,
        hints_used = EXCLUDED.hints_used,
        completed = EXCLUDED.completed,
        score = EXCLUDED.score,
        created_at = NOW();

    -- Insert or update daily_completions table
    INSERT INTO daily_completions (date, player, difficulty, completed, completed_at)
    VALUES (p_date, p_player, p_difficulty, p_completed, CASE WHEN p_completed THEN NOW() ELSE NULL END)
    ON CONFLICT (date, player, difficulty)
    DO UPDATE SET
        completed = EXCLUDED.completed,
        completed_at = CASE WHEN EXCLUDED.completed THEN NOW() ELSE NULL END;

    -- Return success message
    SELECT json_build_object('success', true, 'message', 'Game result saved successfully') INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sudoku_games_date ON sudoku_games (date DESC);
CREATE INDEX IF NOT EXISTS idx_sudoku_games_player ON sudoku_games (player);
CREATE INDEX IF NOT EXISTS idx_daily_completions_date ON daily_completions (date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_completions_player ON daily_completions (player);
            `);
        } else {
            console.log('✅ sudoku_games table already exists');
        }

        // Test basic functionality
        const { data: testData, error: testError } = await supabase
            .from('sudoku_games')
            .select('count(*)')
            .limit(1);

        if (!testError) {
            console.log('✅ Database connection working properly');
            console.log('🎯 Database is ready for use');
        } else {
            console.log('❌ Database test failed:', testError.message);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

createTables().catch(console.error);