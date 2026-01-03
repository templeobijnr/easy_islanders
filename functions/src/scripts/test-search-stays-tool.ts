/**
 * Direct test of searchStays tool
 * Run: npx ts-node --project tsconfig.json src/scripts/test-search-stays-tool.ts
 */

// Import the actual tool - it will initialize Firebase from config/firebase
import { searchTools } from '../services/tools/search.tools';

async function testSearchStaysTool() {
    console.log('\n🧪 TESTING searchStays Tool Directly\n');
    console.log('='.repeat(50));

    try {
        // Call the tool with no arguments
        console.log('\n1. Calling searchStays({})...');
        const results = await searchTools.searchStays({});

        console.log(`   Returned: ${(results as any[]).length} results`);

        if ((results as any[]).length > 0) {
            console.log('\n   Results:');
            (results as any[]).forEach((r, i) => {
                console.log(`   [${i + 1}] ${r.title} - ${r.location} - ${r.price || 'N/A'}`);
            });

            console.log('\n   First result structure:');
            console.log(JSON.stringify((results as any[])[0], null, 2));

            console.log('\n✅ SUCCESS: searchStays tool is working!');
        } else {
            console.log('\n❌ FAIL: Tool returned 0 results');
        }
    } catch (error) {
        console.log('\n❌ ERROR:', error);
    }

    console.log('\n' + '='.repeat(50));
}

testSearchStaysTool()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
