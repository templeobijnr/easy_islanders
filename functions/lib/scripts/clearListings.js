"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_1 = require("../config/firebase");
/**
 * One-off script to delete ALL documents from the `listings` collection.
 * Use with care – this is destructive.
 *
 * Run from the functions directory:
 *   npx ts-node -r esbuild-register src/scripts/clearListings.ts
 */
async function clearListings() {
    const snapshot = await firebase_1.db.collection('listings').get();
    console.log(`Found ${snapshot.size} listings to delete...`);
    const batchSize = 500;
    let batch = firebase_1.db.batch();
    let counter = 0;
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        counter++;
        if (counter % batchSize === 0) {
            batch.commit();
            batch = firebase_1.db.batch();
        }
    });
    if (counter % batchSize !== 0) {
        await batch.commit();
    }
    console.log('✅ Listings collection cleared.');
}
clearListings()
    .then(() => process.exit(0))
    .catch((err) => {
    console.error('Failed to clear listings:', err);
    process.exit(1);
});
//# sourceMappingURL=clearListings.js.map