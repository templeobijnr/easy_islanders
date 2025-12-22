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

import * as logger from 'firebase-functions/logger';
import { db } from '../config/firebase';

/**
 * Orphan detection result.
 */
export interface OrphanResult {
    parentCollection: string;
    parentId: string;
    subcollection: string;
    orphanCount: number;
    status: 'detected' | 'deleted' | 'skipped' | 'error';
    error?: string;
}

/**
 * Cleanup options.
 */
export interface CleanupOptions {
    traceId: string;
    dryRun: boolean;
    batchSize?: number;
    maxOrphans?: number;
}

/**
 * Known parent-child relationships for orphan detection.
 */
const PARENT_CHILD_RELATIONSHIPS: Array<{
    parentCollection: string;
    subcollection: string;
}> = [
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
async function parentExists(
    parentCollection: string,
    parentId: string
): Promise<boolean> {
    const doc = await db.collection(parentCollection).doc(parentId).get();
    return doc.exists;
}

/**
 * Deletes orphan documents in a subcollection.
 */
async function deleteOrphans(
    parentCollection: string,
    parentId: string,
    subcollection: string,
    options: CleanupOptions
): Promise<number> {
    const { traceId, dryRun, batchSize = 100 } = options;

    const subcollectionRef = db
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
    const batch = db.batch();
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
    await db.collection('orphan_cleanup_log').add({
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
async function scanForOrphans(
    parentCollection: string,
    subcollection: string,
    options: CleanupOptions
): Promise<OrphanResult[]> {
    const { traceId, maxOrphans = 100 } = options;
    const results: OrphanResult[] = [];

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
    const subcollectionDocs = await db
        .collectionGroup(subcollection)
        .limit(maxOrphans)
        .get();

    // Group by parent
    const parentIds = new Set<string>();
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
            const result: OrphanResult = {
                parentCollection,
                parentId,
                subcollection,
                orphanCount: 0,
                status: 'detected',
            };

            try {
                const deletedCount = await deleteOrphans(
                    parentCollection,
                    parentId,
                    subcollection,
                    options
                );

                result.orphanCount = deletedCount;
                result.status = options.dryRun ? 'detected' : 'deleted';
            } catch (error) {
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
export async function runOrphanCleanup(
    options: CleanupOptions
): Promise<OrphanResult[]> {
    const { traceId, dryRun } = options;

    logger.info('OrphanCleanup: Starting cleanup run', {
        component: 'orphanCleanup',
        event: 'cleanup_started',
        traceId,
        dryRun,
        relationshipCount: PARENT_CHILD_RELATIONSHIPS.length,
    });

    const allResults: OrphanResult[] = [];

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
