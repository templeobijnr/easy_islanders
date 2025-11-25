"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const typesense_service_1 = require("../services/typesense.service");
async function testSearch() {
    var _a, _b;
    console.log('🔍 Testing Typesense Search...');
    try {
        // 1. Check Collection
        console.log('\nChecking Collection...');
        try {
            const collection = await typesense_service_1.client.collections('listings').retrieve();
            console.log(`✅ Collection found. Documents: ${collection.num_documents}`);
        }
        catch (e) {
            console.error(`❌ Collection check failed: ${e.message}`);
            return;
        }
        // 2. Search for * (All)
        console.log('\nSearching for * (All)...');
        const allResults = await typesense_service_1.client.collections('listings').documents().search({
            q: '*',
            query_by: 'title,description',
            per_page: 5
        });
        console.log(`Found: ${allResults.found}`);
        (_a = allResults.hits) === null || _a === void 0 ? void 0 : _a.forEach((h) => {
            console.log(` - [${h.document.domain}] ${h.document.title} (${h.document.id})`);
        });
        // 3. Search for specific domain (Events)
        console.log('\nSearching for domain: Events...');
        const eventResults = await typesense_service_1.client.collections('listings').documents().search({
            q: '*',
            query_by: 'title',
            filter_by: 'domain:=Events',
            per_page: 5
        });
        console.log(`Found: ${eventResults.found}`);
        (_b = eventResults.hits) === null || _b === void 0 ? void 0 : _b.forEach((h) => {
            console.log(` - ${h.document.title} (Venue: ${h.document.venue || 'N/A'})`);
        });
    }
    catch (error) {
        console.error('❌ Test failed:', error);
    }
}
if (require.main === module) {
    testSearch()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
//# sourceMappingURL=testSearch.js.map