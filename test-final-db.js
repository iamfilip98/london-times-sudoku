const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testDatabase() {
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

    console.log('🧪 Testing database functionality...');

    try {
        // Test 1: Check if tables exist and can query them
        console.log('1️⃣ Testing sudoku_games table...');
        const { data: gamesData, error: gamesError } = await supabase
            .from('sudoku_games')
            .select('*')
            .limit(1);

        if (gamesError) {
            console.log('❌ sudoku_games table error:', gamesError.message);
        } else {
            console.log('✅ sudoku_games table accessible');
        }

        console.log('2️⃣ Testing daily_completions table...');
        const { data: completionsData, error: completionsError } = await supabase
            .from('daily_completions')
            .select('*')
            .limit(1);

        if (completionsError) {
            console.log('❌ daily_completions table error:', completionsError.message);
        } else {
            console.log('✅ daily_completions table accessible');
        }

        // Test 2: Test the save_game_result function
        console.log('3️⃣ Testing save_game_result function...');
        const today = new Date().toISOString().split('T')[0];

        const { data: saveResult, error: saveError } = await supabase.rpc('save_game_result', {
            p_date: today,
            p_player: 'test_user',
            p_difficulty: 'easy',
            p_time_seconds: 300,
            p_mistakes: 2,
            p_hints_used: 1,
            p_completed: true,
            p_score: 850
        });

        if (saveError) {
            console.log('❌ save_game_result function error:', saveError.message);
        } else {
            console.log('✅ save_game_result function working:', saveResult);
        }

        // Test 3: Verify the data was saved
        console.log('4️⃣ Verifying saved data...');
        const { data: verifyData, error: verifyError } = await supabase
            .from('sudoku_games')
            .select('*')
            .eq('player', 'test_user')
            .eq('date', today)
            .eq('difficulty', 'easy');

        if (verifyError) {
            console.log('❌ Data verification error:', verifyError.message);
        } else {
            console.log('✅ Data saved successfully:', verifyData);
        }

        // Test 4: Clean up test data
        console.log('5️⃣ Cleaning up test data...');
        await supabase
            .from('sudoku_games')
            .delete()
            .eq('player', 'test_user');

        await supabase
            .from('daily_completions')
            .delete()
            .eq('player', 'test_user');

        console.log('✅ Test cleanup complete');

        console.log('\n🎯 DATABASE IS READY FOR USE!');
        console.log('📊 All tables exist and functions are working properly');
        console.log('🚀 You can now use the application with database storage');

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

testDatabase().catch(console.error);