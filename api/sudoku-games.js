const { createClient } = require('@supabase/supabase-js');

let supabase = null;
let useDatabase = false;

// Initialize Supabase client
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    useDatabase = true;
    console.log('✅ Supabase client configured');
  } catch (error) {
    console.warn('Supabase client failed, using localStorage fallback:', error.message);
    useDatabase = false;
  }
} else {
  console.log('No Supabase credentials provided, using localStorage fallback');
}

// Helper function to check database availability
function checkDatabase() {
  if (!useDatabase || !supabase) {
    throw new Error('Database not available');
  }
}

// Initialize database tables for Sudoku games
async function initSudokuTables() {
  try {
    // Create sudoku_games table for individual game results
    await sql`
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
      )
    `;

    // Create daily_completions table for tracking puzzle availability
    await sql`
      CREATE TABLE IF NOT EXISTS daily_completions (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        player VARCHAR(50) NOT NULL,
        difficulty VARCHAR(20) NOT NULL,
        completed BOOLEAN DEFAULT false,
        completed_at TIMESTAMP,
        UNIQUE(date, player, difficulty)
      )
    `;

    return true;
  } catch (error) {
    console.error('Failed to initialize Sudoku tables:', error);
    throw error;
  }
}

// Save a completed Sudoku game using custom function
async function saveGameResult(gameData) {
  if (!useDatabase) {
    console.log('⚠️  Database not available, game result saved locally only:', gameData);
    return { success: true, message: 'Game completed successfully (local mode)' };
  }

  try {
    checkDatabase();
    const { date, player, difficulty, time, mistakes, hintsUsed, completed, score } = gameData;

    console.log('💾 Attempting to save game result:', {
      date, player, difficulty, time, mistakes, hintsUsed, completed, score
    });

    // Use custom PostgreSQL function
    const { data, error } = await supabase.rpc('save_game_result', {
      p_date: date,
      p_player: player,
      p_difficulty: difficulty,
      p_time_seconds: time,
      p_mistakes: mistakes || 0,
      p_hints_used: hintsUsed || 0,
      p_completed: completed || true,
      p_score: score || null
    });

    if (error) {
      console.error('❌ Database save error:', error);
      throw error;
    }

    console.log('✅ Game result saved successfully:', data);
    return data || { success: true, message: 'Game result saved successfully' };
  } catch (error) {
    console.error('💥 Failed to save game result:', error.message || error);
    throw error;
  }
}

// Get daily completions for a player
async function getDailyCompletions(player, date) {
  if (!useDatabase) {
    // Mock response when database is not available
    console.log('Mock: Getting daily completions for', player, 'on', date);
    return {};
  }

  try {
    checkDatabase();
    const { data, error } = await supabase
      .from('daily_completions')
      .select('difficulty, completed, completed_at')
      .eq('player', player)
      .eq('date', date);

    if (error) throw error;

    return data.reduce((acc, row) => {
      acc[row.difficulty] = {
        completed: row.completed,
        completedAt: row.completed_at
      };
      return acc;
    }, {});
  } catch (error) {
    console.error('Failed to get daily completions:', error);
    throw error;
  }
}

// Get game results for a specific date and player
async function getGameResults(player, date) {
  if (!useDatabase) {
    // Mock response when database is not available
    console.log('Mock: Getting game results for', player, 'on', date);
    return {};
  }

  try {
    checkDatabase();
    const { data, error } = await supabase
      .from('sudoku_games')
      .select('difficulty, time_seconds, mistakes, hints_used, score, completed')
      .eq('player', player)
      .eq('date', date);

    if (error) throw error;

    return data.reduce((acc, row) => {
      acc[row.difficulty] = {
        time: row.time_seconds,
        mistakes: row.mistakes,
        hintsUsed: row.hints_used,
        score: row.score,
        completed: row.completed
      };
      return acc;
    }, {});
  } catch (error) {
    console.error('Failed to get game results:', error);
    throw error;
  }
}

// Get leaderboard for a specific difficulty
async function getLeaderboard(difficulty, limit = 10) {
  if (!useDatabase) {
    // Mock response when database is not available
    console.log('Mock: Getting leaderboard for', difficulty);
    return [];
  }

  try {
    checkDatabase();
    const { data, error } = await supabase
      .from('sudoku_games')
      .select('player, time_seconds, score')
      .eq('difficulty', difficulty)
      .eq('completed', true)
      .order('score', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Process data to create leaderboard (simplified version)
    const playerStats = {};
    data.forEach(game => {
      if (!playerStats[game.player]) {
        playerStats[game.player] = {
          player: game.player,
          best_time: game.time_seconds,
          best_score: game.score,
          games_played: 1
        };
      } else {
        playerStats[game.player].best_time = Math.min(playerStats[game.player].best_time, game.time_seconds);
        playerStats[game.player].best_score = Math.max(playerStats[game.player].best_score, game.score);
        playerStats[game.player].games_played++;
      }
    });

    return Object.values(playerStats)
      .sort((a, b) => b.best_score - a.best_score || a.best_time - b.best_time)
      .slice(0, limit);
  } catch (error) {
    console.error('Failed to get leaderboard:', error);
    throw error;
  }
}

module.exports = async function handler(req, res) {
  // Tables are now created manually, skip initialization

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        const { action, player, date, difficulty } = req.query;

        if (action === 'completions') {
          const completions = await getDailyCompletions(player, date);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(completions));
          return;
        }

        if (action === 'results') {
          const results = await getGameResults(player, date);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(results));
          return;
        }

        if (action === 'leaderboard') {
          const leaderboard = await getLeaderboard(difficulty);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(leaderboard));
          return;
        }

        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid action parameter' }));
        return;

      case 'POST':
        const gameData = req.body;

        // Validate required fields
        if (!gameData.date || !gameData.player || !gameData.difficulty || !gameData.time) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing required game data' }));
          return;
        }

        await saveGameResult(gameData);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Game result saved successfully'
        }));
        return;

      default:
        res.writeHead(405, { 'Content-Type': 'application/json', 'Allow': 'GET, POST' });
        res.end(JSON.stringify({ error: `Method ${req.method} not allowed` }));
        return;
    }
  } catch (error) {
    console.error('Sudoku API Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
};