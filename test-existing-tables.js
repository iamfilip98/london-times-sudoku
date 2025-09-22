const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testExistingTables() {
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

    console.log('🔍 Testing connection to london-times-sudoku database...');
    console.log('🔗 URL:', process.env.SUPABASE_URL);

    try {
        // Test basic connection first
        console.log('\n1️⃣ Testing basic Supabase connection...');

        // Let's try using the REST API directly instead of the JS client
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/sudoku_games?select=id&limit=1`, {
            headers: {
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('📡 Direct REST API response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ sudoku_games table found via REST API');
            console.log('📊 Sample data:', data);
        } else {
            const errorText = await response.text();
            console.log('❌ REST API error:', response.status, errorText);
        }

        // Test the daily_completions table too
        console.log('\n2️⃣ Testing daily_completions table...');
        const completionsResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/daily_completions?select=id&limit=1`, {
            headers: {
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (completionsResponse.ok) {
            const completionsData = await completionsResponse.json();
            console.log('✅ daily_completions table found via REST API');
            console.log('📊 Sample data:', completionsData);
        } else {
            const errorText = await completionsResponse.text();
            console.log('❌ daily_completions REST API error:', completionsResponse.status, errorText);
        }

        // Test the save_game_result function
        console.log('\n3️⃣ Testing save_game_result function...');
        const functionResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/save_game_result`, {
            method: 'POST',
            headers: {
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                p_date: new Date().toISOString().split('T')[0],
                p_player: 'test_user',
                p_difficulty: 'easy',
                p_time_seconds: 300,
                p_mistakes: 2,
                p_hints_used: 1,
                p_completed: true,
                p_score: 850
            })
        });

        if (functionResponse.ok) {
            const functionData = await functionResponse.json();
            console.log('✅ save_game_result function working');
            console.log('📊 Function result:', functionData);
        } else {
            const errorText = await functionResponse.text();
            console.log('❌ Function error:', functionResponse.status, errorText);
        }

        console.log('\n🎯 Direct REST API testing complete!');

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

testExistingTables().catch(console.error);