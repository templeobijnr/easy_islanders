"use strict";
/**
 * Clean up old taxi listings that don't have proper fields
 */
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_1 = require("../config/firebase");
async function cleanOldTaxis() {
    console.log('🧹 Cleaning up old taxi listings...\n');
    const taxis = await firebase_1.db.collection('listings')
        .where('domain', '==', 'Cars')
        .where('type', '==', 'taxi')
        .get();
    console.log(`Found ${taxis.size} taxi listings\n`);
    let deleted = 0;
    let kept = 0;
    for (const doc of taxis.docs) {
        const data = doc.data();
        // Check if this is an old/bad taxi listing
        if (!data.agentPhone || !data.vehicleModel || !data.plateNumber) {
            console.log(`❌ Deleting: ${doc.id} - ${data.title || 'Unknown'} (Missing required fields)`);
            await doc.ref.delete();
            deleted++;
        }
        else {
            console.log(`✅ Keeping: ${data.title} - ${data.vehicleColor} ${data.vehicleModel} (${data.plateNumber})`);
            kept++;
        }
    }
    console.log(`\n📊 Summary:`);
    console.log(`   Kept: ${kept} taxi listings`);
    console.log(`   Deleted: ${deleted} old/invalid listings`);
    console.log(`\n✅ Cleanup complete!`);
    process.exit(0);
}
if (require.main === module) {
    cleanOldTaxis().catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
}
//# sourceMappingURL=cleanOldTaxis.js.map