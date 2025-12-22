"use strict";
/**
 * Orphan Cleanup Service (SCH-05)
 *
 * Detects and removes ghost subcollections from deleted parent documents.
 *
 * INVARIANTS:
 * - Orphans detected by parent document not existing.
 * - Deletion is transactional with audit logging.
 * - Feature flagged: `orphanCleanupEnabled`.
 * - Dry-run mode for safety testing.
 *
 * ROLLOUT: 1% → 10% → 50% → 100% with rollback on error rate > 1%.
 *
 * @see Living Document Section 18.2 for invariants.
 */
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
exports.runOrphanCleanup = runOrphanCleanup;
const logger = __importStar(require("firebase-functions/logger"));
const firebase_1 = require("../config/firebase");
/**
 * Known parent-child relationships for orphan detection.
 */
const PARENT_CHILD_RELATIONSHIPS = [
    { parentCollection: 'jobs', subcollection: 'messages' },
    { parentCollection: 'jobs', subcollection: 'status_history' },
    { parentCollection: 'listings', subcollection: 'reviews' },
    { parentCollection: 'listings', subcollection: 'menu_items' },
    { parentCollection: 'users', subcollection: 'preferences' },
    { parentCollection: 'businesses', subcollection: 'staff' },
];
/**
 * Checks if a parent document exists.
 */
async function parentExists(parentCollection, parentId) {
    const doc = await firebase_1.db.collection(parentCollection).doc(parentId).get();
    return doc.exists;
}
/**
 * Deletes orphan documents in a subcollection.
 */
async function deleteOrphans(parentCollection, parentId, subcollection, options) {
    const { traceId, dryRun, batchSize = 100 } = options;
    const subcollectionRef = firebase_1.db
        .collection(parentCollection)
        .doc(parentId)
        .collection(subcollection);
    const snapshot = await subcollectionRef.limit(batchSize).get();
    if (snapshot.empty) {
        return 0;
    }
    if (dryRun) {
        logger.info('OrphanCleanup: Would delete (dry run)', {
            component: 'orphanCleanup',
            event: 'dry_run_delete',
            traceId,
            parentCollection,
            parentId,
            subcollection,
            count: snapshot.size,
        });
        return snapshot.size;
    }
    // Batch delete
    const batch = firebase_1.db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();
    logger.info('OrphanCleanup: Deleted orphans', {
        component: 'orphanCleanup',
        event: 'orphans_deleted',
        traceId,
        parentCollection,
        parentId,
        subcollection,
        count: snapshot.size,
    });
    // Record in audit log
    await firebase_1.db.collection('orphan_cleanup_log').add({
        parentCollection,
        parentId,
        subcollection,
        deletedCount: snapshot.size,
        traceId,
        deletedAt: new Date(),
    });
    return snapshot.size;
}
/**
 * Scans for orphans in a specific parent-child relationship.
 */
async function scanForOrphans(parentCollection, subcollection, options) {
    const { traceId, maxOrphans = 100 } = options;
    const results = [];
    // Get all documents that have the subcollection
    // This is an approximation since Firestore doesn't directly list subcollection parents
    // In practice, you'd need to maintain an index or use a collection group query
    logger.info('OrphanCleanup: Scanning for orphans', {
        component: 'orphanCleanup',
        event: 'scan_started',
        traceId,
        parentCollection,
        subcollection,
    });
    // Use collection group query to find documents in subcollections
    const subcollectionDocs = await firebase_1.db
        .collectionGroup(subcollection)
        .limit(maxOrphans)
        .get();
    // Group by parent
    const parentIds = new Set();
    subcollectionDocs.docs.forEach((doc) => {
        const pathParts = doc.ref.path.split('/');
        // Path is: parentCollection/parentId/subcollection/docId
        if (pathParts.length >= 4 && pathParts[0] === parentCollection) {
            parentIds.add(pathParts[1]);
        }
    });
    // Check each parent
    for (const parentId of parentIds) {
        const exists = await parentExists(parentCollection, parentId);
        if (!exists) {
            const result = {
                parentCollection,
                parentId,
                subcollection,
                orphanCount: 0,
                status: 'detected',
            };
            try {
                const deletedCount = await deleteOrphans(parentCollection, parentId, subcollection, options);
                result.orphanCount = deletedCount;
                result.status = options.dryRun ? 'detected' : 'deleted';
            }
            catch (error) {
                result.status = 'error';
                result.error = String(error);
                logger.error('OrphanCleanup: Delete failed', {
                    component: 'orphanCleanup',
                    event: 'delete_failed',
                    traceId,
                    parentCollection,
                    parentId,
                    subcollection,
                    error: String(error),
                });
            }
            results.push(result);
        }
    }
    return results;
}
/**
 * Runs orphan cleanup for all known relationships.
 *
 * @param options - Cleanup options.
 * @returns Results for each relationship.
 */
async function runOrphanCleanup(options) {
    const { traceId, dryRun } = options;
    logger.info('OrphanCleanup: Starting cleanup run', {
        component: 'orphanCleanup',
        event: 'cleanup_started',
        traceId,
        dryRun,
        relationshipCount: PARENT_CHILD_RELATIONSHIPS.length,
    });
    const allResults = [];
    for (const { parentCollection, subcollection } of PARENT_CHILD_RELATIONSHIPS) {
        const results = await scanForOrphans(parentCollection, subcollection, options);
        allResults.push(...results);
    }
    const summary = {
        total: allResults.length,
        deleted: allResults.filter((r) => r.status === 'deleted').length,
        detected: allResults.filter((r) => r.status === 'detected').length,
        errors: allResults.filter((r) => r.status === 'error').length,
    };
    logger.info('OrphanCleanup: Cleanup completed', {
        component: 'orphanCleanup',
        event: 'cleanup_completed',
        traceId,
        dryRun,
        summary,
    });
    return allResults;
}
//# sourceMappingURL=orphanCleanup.js.map