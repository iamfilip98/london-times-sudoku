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