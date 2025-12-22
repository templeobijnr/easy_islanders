"use strict";
/**
 * Sharded Counters (DB-01)
 *
 * Distributed counters to eliminate hot-spot contention.
 *
 * INVARIANTS:
 * - Counter writes distributed across shards (default 10).
 * - Write throughput scales with shard count.
 * - Increments are idempotent when using incrementKey.
 * - All counter ops logged with traceId.
 *
 * DESIGN: Follows Firestore distributed counter guidance.
 * - Counter doc with `shards` subcollection
 * - 10 shards = ~10 writes/sec sustained
 *
 * @see Living Document Section 18.3 for invariants.
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
exports.initializeCounter = initializeCounter;
exports.incrementCounter = incrementCounter;
exports.getCounterTotal = getCounterTotal;
exports.decrementCounter = decrementCounter;
const logger = __importStar(require("firebase-functions/logger"));
const firebase_1 = require("../config/firebase");
/**
 * Default shard count for counters.
 */
const DEFAULT_SHARD_COUNT = 10;
/**
 * Initializes a sharded counter.
 * Call once when creating a new counter.
 *
 * @param config - Counter configuration.
 * @param traceId - Trace ID for logging.
 */
async function initializeCounter(config, traceId) {
    const { collection, counterId, shardCount = DEFAULT_SHARD_COUNT } = config;
    const counterRef = firebase_1.db.collection(collection).doc(counterId);
    const batch = firebase_1.db.batch();
    // Create main counter doc
    batch.set(counterRef, {
        total: 0,
        shardCount,
        createdAt: new Date(),
        updatedAt: new Date(),
    });
    // Create shard docs
    for (let i = 0; i < shardCount; i++) {
        const shardRef = counterRef.collection('shards').doc(`shard_${i}`);
        batch.set(shardRef, { count: 0 });
    }
    await batch.commit();
    logger.info('Counter: Initialized', {
        component: 'counters',
        event: 'counter_initialized',
        traceId,
        collection,
        counterId,
        shardCount,
    });
}
/**
 * Increments a sharded counter.
 *
 * @param config - Counter configuration.
 * @param delta - Amount to increment (default 1).
 * @param ctx - Context with traceId and optional incrementKey for idempotency.
 */
async function incrementCounter(config, delta = 1, ctx) {
    const { collection, counterId, shardCount = DEFAULT_SHARD_COUNT } = config;
    const { traceId, incrementKey } = ctx;
    // Pick random shard to distribute writes
    const shardId = Math.floor(Math.random() * shardCount);
    const shardRef = firebase_1.db
        .collection(collection)
        .doc(counterId)
        .collection('shards')
        .doc(`shard_${shardId}`);
    // Idempotency check if key provided
    if (incrementKey) {
        const idempotencyRef = firebase_1.db
            .collection('counter_increments')
            .doc(incrementKey);
        const existing = await idempotencyRef.get();
        if (existing.exists) {
            logger.info('Counter: Idempotent increment (already applied)', {
                component: 'counters',
                event: 'increment_idempotent',
                traceId,
                incrementKey,
                collection,
                counterId,
            });
            return;
        }
    }
    // Perform atomic increment
    await firebase_1.db.runTransaction(async (transaction) => {
        var _a, _b;
        const shardDoc = await transaction.get(shardRef);
        const currentCount = shardDoc.exists ? ((_b = (_a = shardDoc.data()) === null || _a === void 0 ? void 0 : _a.count) !== null && _b !== void 0 ? _b : 0) : 0;
        transaction.set(shardRef, { count: currentCount + delta, updatedAt: new Date() }, { merge: true });
        // Record idempotency if key provided
        if (incrementKey) {
            const idempotencyRef = firebase_1.db
                .collection('counter_increments')
                .doc(incrementKey);
            transaction.set(idempotencyRef, {
                counterId,
                collection,
                delta,
                shardId,
                appliedAt: new Date(),
                traceId,
            });
        }
    });
    logger.info('Counter: Incremented', {
        component: 'counters',
        event: 'counter_incremented',
        traceId,
        collection,
        counterId,
        shardId,
        delta,
    });
}
/**
 * Gets the current counter total by summing all shards.
 *
 * @param config - Counter configuration.
 * @param traceId - Trace ID for logging.
 * @returns Counter state.
 */
async function getCounterTotal(config, traceId) {
    const { collection, counterId, shardCount = DEFAULT_SHARD_COUNT } = config;
    const shardsSnapshot = await firebase_1.db
        .collection(collection)
        .doc(counterId)
        .collection('shards')
        .get();
    let total = 0;
    let lastUpdated = new Date(0);
    shardsSnapshot.docs.forEach((doc) => {
        var _a, _b;
        const data = doc.data();
        total += (_a = data.count) !== null && _a !== void 0 ? _a : 0;
        if ((_b = data.updatedAt) === null || _b === void 0 ? void 0 : _b.toDate) {
            const updated = data.updatedAt.toDate();
            if (updated > lastUpdated) {
                lastUpdated = updated;
            }
        }
    });
    logger.info('Counter: Total fetched', {
        component: 'counters',
        event: 'counter_fetched',
        traceId,
        collection,
        counterId,
        total,
        shardCount: shardsSnapshot.size,
    });
    return {
        total,
        shardCount: shardsSnapshot.size || shardCount,
        lastUpdated,
    };
}
/**
 * Decrements a sharded counter.
 */
async function decrementCounter(config, delta = 1, ctx) {
    return incrementCounter(config, -delta, {
        traceId: ctx.traceId,
        incrementKey: ctx.decrementKey,
    });
}
//# sourceMappingURL=counters.js.map