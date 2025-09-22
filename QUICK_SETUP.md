# 🚀 Quick Database Setup (2 minutes)

## Step 1: Open Supabase Dashboard
**Click this link:** https://your-project-ref.supabase.co

## Step 2: Go to SQL Editor
1. In the left sidebar, click **"SQL Editor"**
2. Click **"New Query"** button

## Step 3: Paste and Run This SQL
Copy this entire block and paste it into the SQL editor:

```sql
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
```

## Step 4: Click "Run"
Click the **"Run"** button to execute the SQL.

## Step 5: Verify Success
You should see a success message. You can also check the **"Table Editor"** tab to see your new tables.

## Step 6: Test the Integration
After creating the tables, run this command to test:

```bash
curl -X POST http://localhost:3000/api/sudoku-games \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-09-22",
    "player": "filip",
    "difficulty": "medium",
    "time": 300,
    "mistakes": 2,
    "hintsUsed": 1,
    "completed": true,
    "score": 850
  }'
```

**Expected Response:**
```json
{"success":true,"message":"Game result saved successfully"}
```

## 🎉 That's It!
Once you see the success response, your database is fully configured and the sudoku results will be stored in the database instead of localStorage.

## What Happens Next
- All sudoku game completions will be saved to the database
- Data will sync across devices
- Real-time leaderboards will work
- localStorage remains as backup/fallback