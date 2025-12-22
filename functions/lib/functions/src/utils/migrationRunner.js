"use strict";
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
exports.runMigrations = runMigrations;
exports.getMigrationStatus = getMigrationStatus;
const logger = __importStar(require("firebase-functions/logger"));
const firebase_1 = require("../config/firebase");
/**
 * Collection for migration log.
 */
const MIGRATION_LOG_COLLECTION = 'migration_log';
/**
 * Checks if a migration has already been applied.
 */
async function isMigrationApplied(migrationId) {
    const doc = await firebase_1.db.collection(MIGRATION_LOG_COLLECTION).doc(migrationId).get();
    if (!doc.exists) {
        return false;
    }
    const data = doc.data();
    return data.status === 'completed';
}
/**
 * Records a migration attempt.
 */
async function recordMigration(entry) {
    await firebase_1.db.collection(MIGRATION_LOG_COLLECTION).doc(entry.migrationId).set(entry);
}
/**
 * Runs a single migration.
 */
async function runMigration(migration, ctx) {
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
    }
    catch (error) {
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
async function runMigrations(migrations, options) {
    const { traceId, dryRun = false } = options;
    // Sort by version
    const sorted = [...migrations].sort((a, b) => a.version - b.version);
    const results = [];
    const ctx = {
        traceId,
        dryRun,
        db: firebase_1.db,
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
async function getMigrationStatus() {
    const snapshot = await firebase_1.db
        .collection(MIGRATION_LOG_COLLECTION)
        .orderBy('version')
        .get();
    return snapshot.docs.map((doc) => doc.data());
}
//# sourceMappingURL=migrationRunner.js.map