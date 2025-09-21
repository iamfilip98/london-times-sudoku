#!/usr/bin/env node

/**
 * Clear today's game data for testing purposes
 * This script clears data from both localStorage and Supabase database
 */

const { createClient } = require('@supabase/supabase-js');

// Get today's date in YYYY-MM-DD format
const today = new Date().toISOString().split('T')[0];

console.log(`🧹 Clearing game data for ${today}...`);

// Function to clear localStorage data (instructions for browser)
function clearLocalStorage() {
    console.log('\n📱 To clear localStorage data:');
    console.log('1. Open your browser developer tools (F12)');
    console.log('2. Go to Console tab');
    console.log('3. Run this command:');
    console.log(`localStorage.removeItem('dailyCompletions'); localStorage.removeItem('sudokuGameResults'); console.log('✅ LocalStorage cleared for testing');`);
    console.log('\nOr manually:');
    console.log('- Go to Application/Storage tab → Local Storage → remove dailyCompletions and sudokuGameResults keys\n');
}

// Function to clear Supabase data
async function clearSupabaseData() {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.log('⚠️  Supabase credentials not found in environment variables');
            console.log('🔧 To clear Supabase data manually:');
            console.log('1. Go to your Supabase dashboard');
            console.log('2. Open SQL Editor');
            console.log('3. Run these queries:');
            console.log(`   DELETE FROM sudoku_games WHERE date = '${today}';`);
            console.log(`   DELETE FROM daily_completions WHERE date = '${today}';`);
            return;
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log('🗃️  Clearing Supabase database data...');

        // Clear sudoku_games for today
        const { error: gamesError } = await supabase
            .from('sudoku_games')
            .delete()
            .eq('date', today);

        if (gamesError) {
            console.log('⚠️  Error clearing sudoku_games:', gamesError.message);
        } else {
            console.log('✅ Cleared sudoku_games table');
        }

        // Clear daily_completions for today
        const { error: completionsError } = await supabase
            .from('daily_completions')
            .delete()
            .eq('date', today);

        if (completionsError) {
            console.log('⚠️  Error clearing daily_completions:', completionsError.message);
        } else {
            console.log('✅ Cleared daily_completions table');
        }

        console.log('🎉 Supabase data cleared successfully!');

    } catch (error) {
        console.error('❌ Failed to clear Supabase data:', error.message);
        console.log('🔧 Manual cleanup required - see instructions above');
    }
}

// Main execution
async function main() {
    console.log('🎯 This will clear ALL game data for today to allow fresh testing\n');

    // Clear localStorage (instructions)
    clearLocalStorage();

    // Clear Supabase data
    await clearSupabaseData();

    console.log('\n🚀 Ready for testing! You can now:');
    console.log('- Complete games again for today');
    console.log('- Test the scoring system');
    console.log('- Verify all bug fixes are working');
    console.log('\n💡 Tip: Refresh your browser after clearing localStorage');
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { clearLocalStorage, clearSupabaseData };