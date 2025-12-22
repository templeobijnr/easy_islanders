/**
 * Migration Runner (MAINT-03)
 *
 * Idempotent database migrations with audit trail.
 *
 * INVARIANTS:
 * - Each migration runs exactly once (idempotent via migration_log).
 * - Migrations are versioned and ordered.
 * - Failures are logged and can be retried.
 * - Audit trail: every migration logged with timestamp, duration, outcome.
 *
 * ROLLOUT: Run via admin endpoint, feature flagged.
 *
 * @see Living Document Section 18.2 for invariants.
 */

import * as logger from 'firebase-functions/logger';
import { db } from '../config/firebase';

/**
 * Migration definition.
 */
export interface Migration {
    id: string;
    name: string;
    version: number;
    execute: (ctx: MigrationContext) => Promise<void>;
}

/**
 * Migration context passed to each migration.
 */
export interface MigrationContext {
    traceId: string;
    dryRun: boolean;
    db: FirebaseFirestore.Firestore;
    log: (message: string) => void;
}

/**
 * Migration result.
 */
export interface MigrationResult {
    id: string;
    name: string;
    status: 'completed' | 'skipped' | 'failed';
    durationMs?: number;
    error?: string;
}

/**
 * Migration log entry (stored in Firestore).
 */
interface MigrationLogEntry {
    migrationId: string;
    name: string;
    version: number;
    status: 'completed' | 'failed';
    startedAt: Date;
    completedAt?: Date;
    durationMs?: number;
    error?: string;
    traceId: string;
}

/**
 * Collection for migration log.
 */
const MIGRATION_LOG_COLLECTION = 'migration_log';

/**
 * Checks if a migration has already been applied.
 */
async function isMigrationApplied(migrationId: string): Promise<boolean> {
    const doc = await db.collection(MIGRATION_LOG_COLLECTION).doc(migrationId).get();

    if (!doc.exists) {
        return false;
    }

    const data = doc.data() as MigrationLogEntry;
    return data.status === 'completed';
}

/**
 * Records a migration attempt.
 */
async function recordMigration(entry: MigrationLogEntry): Promise<void> {
    await db.collection(MIGRATION_LOG_COLLECTION).doc(entry.migrationId).set(entry);
}

/**
 * Runs a single migration.
 */
async function runMigration(
    migration: Migration,
    ctx: MigrationContext
): Promise<MigrationResult> {
    const { traceId, dryRun } = ctx;

    // Check if already applied
    const alreadyApplied = await isMigrationApplied(migration.id);
    if (alreadyApplied) {
        logger.info('MigrationRunner: Skipping (already applied)', {
            component: 'migrationRunner',
            event: 'migration_skipped',
            traceId,
            migrationId: migration.id,
            name: migration.name,
        });

        return {
            id: migration.id,
            name: migration.name,
            status: 'skipped',
        };
    }

    if (dryRun) {
        logger.info('MigrationRunner: Dry run (would apply)', {
            component: 'migrationRunner',
            event: 'migration_dry_run',
            traceId,
            migrationId: migration.id,
            name: migration.name,
        });

        return {
            id: migration.id,
            name: migration.name,
            status: 'skipped',
        };
    }

    const startTime = Date.now();

    logger.info('MigrationRunner: Starting migration', {
        component: 'migrationRunner',
        event: 'migration_started',
        traceId,
        migrationId: migration.id,
        name: migration.name,
        version: migration.version,
    });

    try {
        await migration.execute(ctx);

        const durationMs = Date.now() - startTime;

        await recordMigration({
            migrationId: migration.id,
            name: migration.name,
            version: migration.version,
            status: 'completed',
            startedAt: new Date(startTime),
            completedAt: new Date(),
            durationMs,
            traceId,
        });

        logger.info('MigrationRunner: Migration completed', {
            component: 'migrationRunner',
            event: 'migration_completed',
            traceId,
            migrationId: migration.id,
            durationMs,
        });

        return {
            id: migration.id,
            name: migration.name,
            status: 'completed',
            durationMs,
        };
    } catch (error) {
        const durationMs = Date.now() - startTime;
        const errorMessage = String(error);

        await recordMigration({
            migrationId: migration.id,
            name: migration.name,
            version: migration.version,
            status: 'failed',
            startedAt: new Date(startTime),
            completedAt: new Date(),
            durationMs,
            error: errorMessage,
            traceId,
        });

        logger.error('MigrationRunner: Migration failed', {
            component: 'migrationRunner',
            event: 'migration_failed',
            traceId,
            migrationId: migration.id,
            error: errorMessage,
            durationMs,
        });

        return {
            id: migration.id,
            name: migration.name,
            status: 'failed',
            durationMs,
            error: errorMessage,
        };
    }
}

/**
 * Runs all pending migrations in order.
 *
 * @param migrations - List of migrations to run.
 * @param options - Runner options.
 * @returns Results for each migration.
 */
export async function runMigrations(
    migrations: Migration[],
    options: { traceId: string; dryRun?: boolean }
): Promise<MigrationResult[]> {
    const { traceId, dryRun = false } = options;

    // Sort by version
    const sorted = [...migrations].sort((a, b) => a.version - b.version);

    const results: MigrationResult[] = [];

    const ctx: MigrationContext = {
        traceId,
        dryRun,
        db,
        log: (message) => {
            logger.info(`MigrationRunner: ${message}`, {
                component: 'migrationRunner',
                event: 'migration_log',
                traceId,
            });
        },
    };

    for (const migration of sorted) {
        const result = await runMigration(migration, ctx);
        results.push(result);

        // Stop on failure
        if (result.status === 'failed') {
            logger.error('MigrationRunner: Stopping due to failure', {
                component: 'migrationRunner',
                event: 'runner_stopped',
                traceId,
                failedMigration: migration.id,
            });
            break;
        }
    }

    return results;
}

/**
 * Gets migration status.
 */
export async function getMigrationStatus(): Promise<MigrationLogEntry[]> {
    const snapshot = await db
        .collection(MIGRATION_LOG_COLLECTION)
        .orderBy('version')
        .get();

    return snapshot.docs.map((doc) => doc.data() as MigrationLogEntry);
}
