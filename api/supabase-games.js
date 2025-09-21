const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize database tables
async function initSupabaseTables() {
  try {
    // Create sudoku_games table
    const { error: gamesError } = await supabase.rpc('create_sudoku_games_table');
    if (gamesError && !gamesError.message.includes('already exists')) {
      console.error('Error creating sudoku_games table:', gamesError);
    }

    // Create daily_completions table
    const { error: completionsError } = await supabase.rpc('create_daily_completions_table');
    if (completionsError && !completionsError.message.includes('already exists')) {
      console.error('Error creating daily_completions table:', completionsError);
    }

    return true;
  } catch (error) {
    console.error('Failed to initialize Supabase tables:', error);
    return false;
  }
}

// Save a completed Sudoku game
async function saveGameResult(gameData) {
  try {
    const { date, player, difficulty, time, mistakes, hintsUsed, completed, score } = gameData;

    // Insert the game result
    const { error: gameError } = await supabase
      .from('sudoku_games')
      .upsert({
        date,
        player,
        difficulty,
        time_seconds: time,
        mistakes,
        hints_used: hintsUsed,
        completed,
        score,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'date,player,difficulty'
      });

    if (gameError) throw gameError;

    // Mark as completed in daily_completions
    const { error: completionError } = await supabase
      .from('daily_completions')
      .upsert({
        date,
        player,
        difficulty,
        completed,
        completed_at: new Date().toISOString()
      }, {
        onConflict: 'date,player,difficulty'
      });

    if (completionError) throw completionError;

    return true;
  } catch (error) {
    console.error('Failed to save game result:', error);
    throw error;
  }
}

// Get daily completions for a player
async function getDailyCompletions(player, date) {
  try {
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
  try {
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
  try {
    const { data, error } = await supabase
      .from('sudoku_games')
      .select(`
        player,
        time_seconds,
        score,
        created_at
      `)
      .eq('difficulty', difficulty)
      .eq('completed', true)
      .order('score', { ascending: false })
      .order('time_seconds', { ascending: true })
      .limit(limit);

    if (error) throw error;

    // Group by player and get best scores
    const playerBest = data.reduce((acc, game) => {
      if (!acc[game.player] || game.score > acc[game.player].score) {
        acc[game.player] = {
          player: game.player,
          best_time: game.time_seconds,
          best_score: game.score,
          games_played: 1
        };
      } else {
        acc[game.player].games_played++;
        if (game.time_seconds < acc[game.player].best_time) {
          acc[game.player].best_time = game.time_seconds;
        }
      }
      return acc;
    }, {});

    return Object.values(playerBest)
      .sort((a, b) => b.best_score - a.best_score || a.best_time - b.best_time)
      .slice(0, limit);
  } catch (error) {
    console.error('Failed to get leaderboard:', error);
    throw error;
  }
}

module.exports = async function handler(req, res) {
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
          return res.status(200).json(completions);
        }

        if (action === 'results') {
          const results = await getGameResults(player, date);
          return res.status(200).json(results);
        }

        if (action === 'leaderboard') {
          const leaderboard = await getLeaderboard(difficulty);
          return res.status(200).json(leaderboard);
        }

        return res.status(400).json({ error: 'Invalid action parameter' });

      case 'POST':
        const gameData = req.body;

        // Validate required fields
        if (!gameData.date || !gameData.player || !gameData.difficulty || !gameData.time) {
          return res.status(400).json({ error: 'Missing required game data' });
        }

        await saveGameResult(gameData);

        return res.status(200).json({
          success: true,
          message: 'Game result saved successfully'
        });

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Supabase API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}