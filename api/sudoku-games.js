const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Helper function to execute SQL queries
async function sql(strings, ...values) {
  let query = '';
  const params = [];
  let paramIndex = 1;

  for (let i = 0; i < strings.length; i++) {
    query += strings[i];
    if (i < values.length) {
      query += `$${paramIndex}`;
      params.push(values[i]);
      paramIndex++;
    }
  }

  const result = await pool.query(query, params);
  return { rows: result.rows };
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

// Save a completed Sudoku game
async function saveGameResult(gameData) {
  try {
    const { date, player, difficulty, time, mistakes, hintsUsed, completed, score } = gameData;

    // Insert the game result
    await sql`
      INSERT INTO sudoku_games (date, player, difficulty, time_seconds, mistakes, hints_used, completed, score)
      VALUES (${date}, ${player}, ${difficulty}, ${time}, ${mistakes}, ${hintsUsed}, ${completed}, ${score})
      ON CONFLICT (date, player, difficulty)
      DO UPDATE SET
        time_seconds = ${time},
        mistakes = ${mistakes},
        hints_used = ${hintsUsed},
        completed = ${completed},
        score = ${score},
        created_at = NOW()
    `;

    // Mark as completed in daily_completions
    await sql`
      INSERT INTO daily_completions (date, player, difficulty, completed, completed_at)
      VALUES (${date}, ${player}, ${difficulty}, ${completed}, NOW())
      ON CONFLICT (date, player, difficulty)
      DO UPDATE SET
        completed = ${completed},
        completed_at = NOW()
    `;

    return true;
  } catch (error) {
    console.error('Failed to save game result:', error);
    throw error;
  }
}

// Get daily completions for a player
async function getDailyCompletions(player, date) {
  try {
    const result = await sql`
      SELECT difficulty, completed, completed_at
      FROM daily_completions
      WHERE player = ${player} AND date = ${date}
    `;

    return result.rows.reduce((acc, row) => {
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
    const result = await sql`
      SELECT difficulty, time_seconds, mistakes, hints_used, score, completed
      FROM sudoku_games
      WHERE player = ${player} AND date = ${date}
    `;

    return result.rows.reduce((acc, row) => {
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
    const result = await sql`
      SELECT player, MIN(time_seconds) as best_time, MAX(score) as best_score, COUNT(*) as games_played
      FROM sudoku_games
      WHERE difficulty = ${difficulty} AND completed = true
      GROUP BY player
      ORDER BY best_score DESC, best_time ASC
      LIMIT ${limit}
    `;

    return result.rows;
  } catch (error) {
    console.error('Failed to get leaderboard:', error);
    throw error;
  }
}

module.exports = async function handler(req, res) {
  // Initialize database on first request
  try {
    await initSudokuTables();
  } catch (error) {
    console.error('Sudoku tables initialization failed:', error);
    return res.status(500).json({ error: 'Database initialization failed' });
  }

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
    console.error('Sudoku API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};