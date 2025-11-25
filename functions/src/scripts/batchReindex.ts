import 'dotenv/config';
import { db } from '../config/firebase';
import * as typesenseService from '../services/typesense.service';


/**
 * Batch reindex all Firestore listings to Typesense
 * Processes in chunks to avoid timeouts
 */
export async function batchReindexListings() {
    console.log('🔄 Starting batch reindex...');

    try {
        // Initialize Typesense collections
        await typesenseService.initializeCollection();
        await typesenseService.initializeUserCollection();
        console.log('✅ Typesense collections initialized\n');

        // Get total count
        const snapshot = await db.collection('listings').count().get();
        const total = snapshot.data().count;
        console.log(`📊 Total listings in Firestore: ${total}\n`);

        const batchSize = 50; // Process 50 at a time
        let processed = 0;
        let errors = 0;
        let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

        while (processed < total) {
            // Query next batch
            let query = db.collection('listings')
                .orderBy('createdAt', 'desc')
                .limit(batchSize);

            if (lastDoc) {
                query = query.startAfter(lastDoc);
            }

            const batch = await query.get();

            if (batch.empty) break;

            // Process batch
            console.log(`📦 Processing batch ${Math.floor(processed / batchSize) + 1} (${batch.size} listings)...`);

            for (const doc of batch.docs) {
                try {
                    const listing = { id: doc.id, ...doc.data() };

                    await typesenseService.upsertListing(listing);
                    processed++;

                    if (processed % 10 === 0) {
                        process.stdout.write(`\r   Indexed: ${processed}/${total}`);
                    }
                } catch (error: any) {
                    errors++;
                    console.error(`\n   ❌ Error indexing ${doc.id}:`, error.message);
                }
            }

            console.log(`\n✅ Batch complete. Total indexed: ${processed}/${total}\n`);

            lastDoc = batch.docs[batch.docs.length - 1];

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('\n🎉 Reindex complete!');
        console.log(`   ✅ Successfully indexed: ${processed}`);
        console.log(`   ❌ Errors: ${errors}`);

        return { success: true, indexed: processed, errors };

    } catch (error: any) {
        console.error('❌ Reindex failed:', error);
        throw error;
    }
}

// CLI runner
if (require.main === module) {
    batchReindexListings()
        .then((result) => {
            console.log('\n✅ Done!', result);
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Failed:', error);
            process.exit(1);
        });
}
