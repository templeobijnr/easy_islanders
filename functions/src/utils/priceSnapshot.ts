/**
 * Snapshot Pricing Guard (STATE-01)
 *
 * Copies and immutably stores price snapshots at job/action creation.
 *
 * INVARIANTS:
 * - Price copied from Listing at creation time.
 * - Price immutable post-create (enforced server-side).
 * - priceSnapshotHash stored with each action for audit.
 * - Price modification attempts logged and rejected.
 *
 * @see Living Document Section 17.2.4 for invariants.
 */

import * as logger from 'firebase-functions/logger';
import { createHash } from 'crypto';

/**
 * Price snapshot structure.
 */
export interface PriceSnapshot {
    amount: number;
    currency: string;
    unit?: string;
    listingId: string;
    snapshotAt: Date;
    snapshotHash: string;
}

/**
 * Listing price data (from Firestore).
 */
export interface ListingPrice {
    amount: number;
    currency: string;
    unit?: string;
}

/**
 * Creates a hash of the price data for integrity verification.
 */
function createPriceHash(
    amount: number,
    currency: string,
    listingId: string,
    timestamp: Date
): string {
    const data = `${amount}|${currency}|${listingId}|${timestamp.toISOString()}`;
    return createHash('sha256').update(data).digest('hex').slice(0, 16);
}

/**
 * Creates a price snapshot from listing data.
 *
 * @param listingId - The listing ID.
 * @param price - The price data from the listing.
 * @param traceId - Trace ID for logging.
 * @returns Price snapshot to store with job/action.
 */
export function createPriceSnapshot(
    listingId: string,
    price: ListingPrice,
    traceId: string
): PriceSnapshot {
    const snapshotAt = new Date();
    const snapshotHash = createPriceHash(
        price.amount,
        price.currency,
        listingId,
        snapshotAt
    );

    logger.info('PriceSnapshot: Created', {
        component: 'priceSnapshot',
        event: 'snapshot_created',
        traceId,
        listingId,
        amount: price.amount,
        currency: price.currency,
        snapshotHash,
    });

    return {
        amount: price.amount,
        currency: price.currency,
        unit: price.unit,
        listingId,
        snapshotAt,
        snapshotHash,
    };
}

/**
 * Validates that a price update is not attempting to modify an immutable snapshot.
 *
 * @param existingSnapshot - The existing price snapshot.
 * @param newData - The new data being submitted.
 * @param ctx - Context for logging.
 * @throws Error if price modification attempted.
 */
export function validatePriceImmutability(
    existingSnapshot: PriceSnapshot | undefined,
    newData: { priceSnapshot?: Partial<PriceSnapshot> },
    ctx: { traceId: string; jobId?: string; actionId?: string }
): void {
    if (!existingSnapshot) {
        // No existing snapshot, creation is allowed
        return;
    }

    const { traceId, jobId, actionId } = ctx;

    // Check if attempting to modify price fields
    if (newData.priceSnapshot) {
        const { amount, currency } = newData.priceSnapshot;

        if (
            (amount !== undefined && amount !== existingSnapshot.amount) ||
            (currency !== undefined && currency !== existingSnapshot.currency)
        ) {
            logger.error('PriceSnapshot: Modification attempt BLOCKED', {
                component: 'priceSnapshot',
                event: 'modification_blocked',
                traceId,
                jobId,
                actionId,
                existingAmount: existingSnapshot.amount,
                attemptedAmount: amount,
                existingCurrency: existingSnapshot.currency,
                attemptedCurrency: currency,
            });

            throw new Error('Price snapshot is immutable after creation');
        }
    }
}

/**
 * Verifies a price snapshot hash for integrity.
 *
 * @param snapshot - The snapshot to verify.
 * @returns True if hash is valid.
 */
export function verifyPriceSnapshot(snapshot: PriceSnapshot): boolean {
    const expectedHash = createPriceHash(
        snapshot.amount,
        snapshot.currency,
        snapshot.listingId,
        snapshot.snapshotAt
    );

    const isValid = expectedHash === snapshot.snapshotHash;

    if (!isValid) {
        logger.error('PriceSnapshot: Hash verification failed', {
            component: 'priceSnapshot',
            event: 'hash_invalid',
            listingId: snapshot.listingId,
            expectedHash,
            actualHash: snapshot.snapshotHash,
        });
    }

    return isValid;
}
