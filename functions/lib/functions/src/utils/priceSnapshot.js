"use strict";
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
exports.createPriceSnapshot = createPriceSnapshot;
exports.validatePriceImmutability = validatePriceImmutability;
exports.verifyPriceSnapshot = verifyPriceSnapshot;
const logger = __importStar(require("firebase-functions/logger"));
const crypto_1 = require("crypto");
/**
 * Creates a hash of the price data for integrity verification.
 */
function createPriceHash(amount, currency, listingId, timestamp) {
    const data = `${amount}|${currency}|${listingId}|${timestamp.toISOString()}`;
    return (0, crypto_1.createHash)('sha256').update(data).digest('hex').slice(0, 16);
}
/**
 * Creates a price snapshot from listing data.
 *
 * @param listingId - The listing ID.
 * @param price - The price data from the listing.
 * @param traceId - Trace ID for logging.
 * @returns Price snapshot to store with job/action.
 */
function createPriceSnapshot(listingId, price, traceId) {
    const snapshotAt = new Date();
    const snapshotHash = createPriceHash(price.amount, price.currency, listingId, snapshotAt);
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
function validatePriceImmutability(existingSnapshot, newData, ctx) {
    if (!existingSnapshot) {
        // No existing snapshot, creation is allowed
        return;
    }
    const { traceId, jobId, actionId } = ctx;
    // Check if attempting to modify price fields
    if (newData.priceSnapshot) {
        const { amount, currency } = newData.priceSnapshot;
        if ((amount !== undefined && amount !== existingSnapshot.amount) ||
            (currency !== undefined && currency !== existingSnapshot.currency)) {
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
function verifyPriceSnapshot(snapshot) {
    const expectedHash = createPriceHash(snapshot.amount, snapshot.currency, snapshot.listingId, snapshot.snapshotAt);
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
//# sourceMappingURL=priceSnapshot.js.map