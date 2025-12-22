"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchReindexListings = batchReindexListings;
const logger = __importStar(require("firebase-functions/logger"));
require("dotenv/config");
const firebase_1 = require("../config/firebase");
const typesenseService = __importStar(require("../services/typesense.service"));
const errors_1 = require("../utils/errors");
/**
 * Batch reindex all Firestore listings to Typesense
 * Processes in chunks to avoid timeouts
 */
async function batchReindexListings() {
    logger.debug("🔄 Starting batch reindex...");
    try {
        // Initialize Typesense collections
        await typesenseService.initializeCollection();
        await typesenseService.initializeUserCollection();
        logger.debug("✅ Typesense collections initialized\n");
        // Get total count
        const snapshot = await firebase_1.db.collection("listings").count().get();
        const total = snapshot.data().count;
        logger.debug(`📊 Total listings in Firestore: ${total}\n`);
        const batchSize = 50; // Process 50 at a time
        let processed = 0;
        let errors = 0;
        let lastDoc = null;
        while (processed < total) {
            // Query next batch
            let query = firebase_1.db
                .collection("listings")
                .orderBy("createdAt", "desc")
                .limit(batchSize);
            if (lastDoc) {
                query = query.startAfter(lastDoc);
            }
            const batch = await query.get();
            if (batch.empty)
                break;
            // Process batch
            logger.debug(`📦 Processing batch ${Math.floor(processed / batchSize) + 1} (${batch.size} listings)...`);
            for (const doc of batch.docs) {
                try {
                    const listing = Object.assign({ id: doc.id }, doc.data());
                    await typesenseService.upsertListing(listing);
                    processed++;
                    if (processed % 10 === 0) {
                        process.stdout.write(`\r   Indexed: ${processed}/${total}`);
                    }
                }
                catch (error) {
                    errors++;
                    console.error(`\n   ❌ Error indexing ${doc.id}:`, (0, errors_1.getErrorMessage)(error));
                }
            }
            logger.debug(`\n✅ Batch complete. Total indexed: ${processed}/${total}\n`);
            lastDoc = batch.docs[batch.docs.length - 1];
            // Small delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        logger.debug("\n🎉 Reindex complete!");
        logger.debug(`   ✅ Successfully indexed: ${processed}`);
        logger.debug(`   ❌ Errors: ${errors}`);
        return { success: true, indexed: processed, errors };
    }
    catch (error) {
        console.error("❌ Reindex failed:", error);
        throw error;
    }
}
// CLI runner
if (require.main === module) {
    batchReindexListings()
        .then((result) => {
        logger.debug("\n✅ Done!", result);
        process.exit(0);
    })
        .catch((error) => {
        console.error("❌ Failed:", error);
        process.exit(1);
    });
}
//# sourceMappingURL=batchReindex.js.map