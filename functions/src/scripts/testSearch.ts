import 'dotenv/config';
import { client } from '../services/typesense.service';


async function testSearch() {
    console.log('🔍 Testing Typesense Search...');

    try {
        // 1. Check Collection
        console.log('\nChecking Collection...');
        try {
            const collection = await client.collections('listings').retrieve();
            console.log(`✅ Collection found. Documents: ${collection.num_documents}`);
        } catch (e: any) {
            console.error(`❌ Collection check failed: ${e.message}`);
            return;
        }

        // 2. Search for * (All)
        console.log('\nSearching for * (All)...');
        const allResults = await client.collections('listings').documents().search({
            q: '*',
            query_by: 'title,description',
            per_page: 5
        });
        console.log(`Found: ${allResults.found}`);
        allResults.hits?.forEach((h: any) => {
            console.log(` - [${h.document.domain}] ${h.document.title} (${h.document.id})`);
        });

        // 3. Search for specific domain (Events)
        console.log('\nSearching for domain: Events...');
        const eventResults = await client.collections('listings').documents().search({
            q: '*',
            query_by: 'title',
            filter_by: 'domain:=Events',
            per_page: 5
        });
        console.log(`Found: ${eventResults.found}`);
        eventResults.hits?.forEach((h: any) => {
            console.log(` - ${h.document.title} (Venue: ${h.document.venue || 'N/A'})`);
        });

    } catch (error: any) {
        console.error('❌ Test failed:', error);
    }
}

if (require.main === module) {
    testSearch()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
