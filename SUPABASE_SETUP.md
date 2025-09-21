# 🚀 Supabase Setup Guide - Much Easier!

## Why Supabase?
- ✅ **2-minute setup** vs 10+ minutes with Neon
- ✅ **Better free tier** (500MB database, 50MB file storage)
- ✅ **Built-in authentication** ready to go
- ✅ **Real-time subscriptions** for live updates
- ✅ **Auto-generated API** with instant REST endpoints

## 📋 Quick Setup (2 minutes)

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in with GitHub
4. Click "New Project"
5. Name: `london-times-sudoku`
6. Database Password: `sudoku2025!` (or your choice)
7. Region: Choose closest to you
8. Click "Create new project"

### Step 2: Get Your Keys
1. Go to **Settings** > **API**
2. Copy these values:
   - **Project URL**: `https://xxx.supabase.co`
   - **Project API Key (anon public)**: `eyJhbGc...`
   - **Project API Key (service_role)**: `eyJhbGc...` (click "Reveal")

### Step 3: Set Environment Variables
Update your `.env` file:
```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here
NODE_ENV=development
```

### Step 4: Create Database Tables
1. Go to **SQL Editor** in your Supabase dashboard
2. Copy and paste the entire contents of `supabase-setup.sql`
3. Click "Run" to create all tables

### Step 5: Test Connection
```bash
# Test the API endpoint
curl -X GET "http://localhost:3000/api/supabase-games?action=completions&player=faidao&date=2025-01-21"
```

## 🗄️ Database Schema Created

Your Supabase database now has:

- ✅ **`sudoku_games`** - Individual game results
- ✅ **`daily_completions`** - Daily puzzle tracking
- ✅ **`entries`** - Competition entries (legacy)
- ✅ **`achievements`** - Player achievements
- ✅ **`streaks`** - Win/loss streaks
- ✅ **Row Level Security** enabled
- ✅ **Performance indexes**
- ✅ **Helper functions** for leaderboards

## 🚀 Deploy to Vercel

### Environment Variables in Vercel:
```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
NODE_ENV=production
```

### Auto-Deploy:
```bash
git add .
git commit -m "Switch to Supabase database"
git push origin main
```

Vercel will automatically deploy!

## 🎮 What Works Now

- ✅ **Real-time game saving** to Supabase
- ✅ **Daily completion tracking** per user
- ✅ **Offline mode** with localStorage backup
- ✅ **Leaderboards** with SQL functions
- ✅ **Competition data** integration
- ✅ **Achievement tracking** ready

## 🔧 API Endpoints

**Save Game Result:**
```bash
POST /api/supabase-games
{
  "date": "2025-01-21",
  "player": "faidao",
  "difficulty": "medium",
  "time": 185,
  "mistakes": 2,
  "completed": true
}
```

**Get Daily Completions:**
```bash
GET /api/supabase-games?action=completions&player=faidao&date=2025-01-21
```

**Get Leaderboard:**
```bash
GET /api/supabase-games?action=leaderboard&difficulty=medium
```

## 🎯 Advantages Over Neon

| Feature | Supabase | Neon |
|---------|----------|------|
| Setup Time | 2 minutes | 10+ minutes |
| Free Database Size | 500MB | 512MB |
| Auto API | ✅ Built-in | ❌ Manual |
| Real-time | ✅ Native | ❌ Need setup |
| Authentication | ✅ Built-in | ❌ Manual |
| Dashboard | ✅ Full-featured | ❌ Basic |
| File Storage | ✅ Included | ❌ Separate service |

## 🐛 Troubleshooting

**Connection Issues:**
- Verify all 3 environment variables are set
- Check project URL format: `https://xxx.supabase.co`
- Ensure service role key is used for server-side

**Table Issues:**
- Go to Supabase Table Editor
- Verify all tables exist
- Check Row Level Security policies

**API Issues:**
- Check Vercel function logs
- Test locally first: `npm run dev`
- Verify CORS is working

---

**🎉 Your Supabase setup is complete and ready!**

Much simpler than Neon, with more features and better performance! 🚀