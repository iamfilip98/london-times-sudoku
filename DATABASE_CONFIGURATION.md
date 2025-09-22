# 🗄️ Database Configuration Guide

## Current Status
✅ **Supabase project configured**
✅ **Environment variables loaded**
✅ **API endpoints ready**
🔧 **Tables need to be created manually**

## Quick Setup (2 minutes)

### 1. Open Supabase Dashboard
Go to: https://jffrziyhdkosiffenfsy.supabase.co

### 2. Create Tables
1. Click on **SQL Editor** in the left sidebar
2. Click **New Query**
3. Copy and paste this SQL:

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

4. Click **Run** to execute the SQL

### 3. Test the Setup
After creating the tables, test the API:

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

Expected response:
```json
{"success":true,"message":"Game result saved successfully"}
```

## Environment Variables
These are already configured in `.env.local`:

```
POSTGRES_URL=postgres://postgres.jffrziyhdkosiffenfsy:...
SUPABASE_URL=https://jffrziyhdkosiffenfsy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

## Troubleshooting

### If tables already exist:
The SQL uses `IF NOT EXISTS` so it's safe to run multiple times.

### If API still returns errors:
1. Check that tables were created in Supabase dashboard (Table Editor)
2. Restart the local server: `npm run dev`
3. Check server logs for connection messages

### SSL Certificate Issues:
These are automatically handled with `rejectUnauthorized: false` in the connection config.

## What Happens After Setup

1. **Sudoku game completions** will be stored in the database
2. **Real-time leaderboards** will show actual data
3. **Cross-device synchronization** will work
4. **Data persistence** across sessions
5. **Local storage** remains as backup/fallback

## Production Deployment

The database is already configured for production on Vercel. No additional setup needed for deployment.