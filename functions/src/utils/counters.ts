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

import * as logger from 'firebase-functions/logger';
import { db } from '../config/firebase';

/**
 * Default shard count for counters.
 */
const DEFAULT_SHARD_COUNT = 10;

/**
 * Counter configuration.
 */
export interface CounterConfig {
    collection: string;
    counterId: string;
    shardCount?: number;
}

/**
 * Counter state.
 */
export interface CounterState {
    total: number;
    shardCount: number;
    lastUpdated: Date;
}

/**
 * Initializes a sharded counter.
 * Call once when creating a new counter.
 *
 * @param config - Counter configuration.
 * @param traceId - Trace ID for logging.
 */
export async function initializeCounter(
    config: CounterConfig,
    traceId: string
): Promise<void> {
    const { collection, counterId, shardCount = DEFAULT_SHARD_COUNT } = config;

    const counterRef = db.collection(collection).doc(counterId);
    const batch = db.batch();

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
export async function incrementCounter(
    config: CounterConfig,
    delta: number = 1,
    ctx: { traceId: string; incrementKey?: string }
): Promise<void> {
    const { collection, counterId, shardCount = DEFAULT_SHARD_COUNT } = config;
    const { traceId, incrementKey } = ctx;

    // Pick random shard to distribute writes
    const shardId = Math.floor(Math.random() * shardCount);
    const shardRef = db
        .collection(collection)
        .doc(counterId)
        .collection('shards')
        .doc(`shard_${shardId}`);

    // Idempotency check if key provided
    if (incrementKey) {
        const idempotencyRef = db
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
    await db.runTransaction(async (transaction) => {
        const shardDoc = await transaction.get(shardRef);
        const currentCount = shardDoc.exists ? (shardDoc.data()?.count ?? 0) : 0;

        transaction.set(
            shardRef,
            { count: currentCount + delta, updatedAt: new Date() },
            { merge: true }
        );

        // Record idempotency if key provided
        if (incrementKey) {
            const idempotencyRef = db
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
export async function getCounterTotal(
    config: CounterConfig,
    traceId: string
): Promise<CounterState> {
    const { collection, counterId, shardCount = DEFAULT_SHARD_COUNT } = config;

    const shardsSnapshot = await db
        .collection(collection)
        .doc(counterId)
        .collection('shards')
        .get();

    let total = 0;
    let lastUpdated = new Date(0);

    shardsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        total += data.count ?? 0;

        if (data.updatedAt?.toDate) {
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
export async function decrementCounter(
    config: CounterConfig,
    delta: number = 1,
    ctx: { traceId: string; decrementKey?: string }
): Promise<void> {
    return incrementCounter(config, -delta, {
        traceId: ctx.traceId,
        incrementKey: ctx.decrementKey,
    });
}
