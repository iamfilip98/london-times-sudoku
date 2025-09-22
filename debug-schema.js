const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function debugSchema() {
    console.log('🔍 Debugging Supabase schema for london-times-sudoku...');

    // Try multiple connection approaches
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        // 1. Try to list all tables in public schema
        console.log('\n1️⃣ Trying to query information_schema to see what tables exist...');

        const { data: tables, error: tablesError } = await supabase
            .from('information_schema.tables')
            .select('table_name, table_schema')
            .eq('table_schema', 'public');

        if (tablesError) {
            console.log('❌ Could not query information_schema:', tablesError.message);
        } else {
            console.log('📋 Tables found in public schema:', tables);
        }

        // 2. Check if we can use SQL directly
        console.log('\n2️⃣ Trying direct SQL query...');

        const { data: sqlResult, error: sqlError } = await supabase
            .rpc('exec', { sql: 'SELECT * FROM information_schema.tables WHERE table_schema = \'public\' LIMIT 10;' });

        if (sqlError) {
            console.log('❌ Direct SQL failed:', sqlError.message);
        } else {
            console.log('✅ Direct SQL worked:', sqlResult);
        }

        // 3. Try to manually refresh the schema cache
        console.log('\n3️⃣ Trying to refresh schema cache...');

        const refreshResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
            method: 'OPTIONS',
            headers: {
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('🔄 Schema refresh attempt status:', refreshResponse.status);

        // 4. Check current user permissions
        console.log('\n4️⃣ Checking current user...');

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) {
            console.log('ℹ️ Auth user check (expected to fail with service role):', userError.message);
        } else {
            console.log('👤 Current user:', userData);
        }

        // 5. Try listing functions instead
        console.log('\n5️⃣ Checking for functions...');

        const functionsResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/`, {
            headers: {
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('🔧 Functions endpoint status:', functionsResponse.status);

    } catch (error) {
        console.error('❌ Debug error:', error.message);
    }

    // Final suggestion
    console.log('\n💡 TROUBLESHOOTING SUGGESTIONS:');
    console.log('1. Go to your Supabase dashboard → Settings → API');
    console.log('2. Make sure "Enable Schema cache refresh" is enabled');
    console.log('3. Click "Refresh Schema" button to force refresh');
    console.log('4. Check that tables are in the "public" schema, not a custom schema');
    console.log('5. Verify Row Level Security (RLS) policies if any are enabled');
    console.log('6. Make sure service_role key has full access to the tables');
}

debugSchema().catch(console.error);