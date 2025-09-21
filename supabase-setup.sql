-- Supabase Database Setup for London Times Sudoku
-- Run these SQL commands in your Supabase SQL editor

-- Create sudoku_games table
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, player, difficulty)
);

-- Create daily_completions table
CREATE TABLE IF NOT EXISTS daily_completions (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  player VARCHAR(50) NOT NULL,
  difficulty VARCHAR(20) NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(date, player, difficulty)
);

-- Create entries table (for existing competition data)
CREATE TABLE IF NOT EXISTS entries (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  achievement_id VARCHAR(255) NOT NULL,
  player VARCHAR(50) NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(achievement_id, player, unlocked_at)
);

-- Create streaks table
CREATE TABLE IF NOT EXISTS streaks (
  id SERIAL PRIMARY KEY,
  player VARCHAR(50) UNIQUE NOT NULL,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initialize default streak records for both players
INSERT INTO streaks (player, current_streak, best_streak)
VALUES ('faidao', 0, 0), ('filip', 0, 0)
ON CONFLICT (player) DO NOTHING;

-- Enable Row Level Security (RLS) for better security
ALTER TABLE sudoku_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access (you can restrict these later)
CREATE POLICY "Allow all operations on sudoku_games" ON sudoku_games FOR ALL USING (true);
CREATE POLICY "Allow all operations on daily_completions" ON daily_completions FOR ALL USING (true);
CREATE POLICY "Allow all operations on entries" ON entries FOR ALL USING (true);
CREATE POLICY "Allow all operations on achievements" ON achievements FOR ALL USING (true);
CREATE POLICY "Allow all operations on streaks" ON streaks FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sudoku_games_player_date ON sudoku_games(player, date);
CREATE INDEX IF NOT EXISTS idx_sudoku_games_difficulty ON sudoku_games(difficulty);
CREATE INDEX IF NOT EXISTS idx_daily_completions_player_date ON daily_completions(player, date);
CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
CREATE INDEX IF NOT EXISTS idx_achievements_player ON achievements(player);

-- Create a function to get leaderboard data
CREATE OR REPLACE FUNCTION get_leaderboard(difficulty_param TEXT, limit_param INTEGER DEFAULT 10)
RETURNS TABLE (
  player TEXT,
  best_time INTEGER,
  best_score INTEGER,
  games_played BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sg.player::TEXT,
    MIN(sg.time_seconds)::INTEGER as best_time,
    MAX(sg.score)::INTEGER as best_score,
    COUNT(*)::BIGINT as games_played
  FROM sudoku_games sg
  WHERE sg.difficulty = difficulty_param AND sg.completed = true
  GROUP BY sg.player
  ORDER BY best_score DESC, best_time ASC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;