/**
 * Schema Versioning Service (SCH-02)
 *
 * Server-client schema version handshake with tolerant readers.
 *
 * INVARIANTS:
 * - Every document has a schemaVersion field.
 * - Server rejects clients with unsupported versions.
 * - Tolerant reading: old versions mapped to current via migration.
 * - Version mismatch logged with traceId + clientVersion + serverVersion.
 *
 * ROLLOUT: Feature flagged, default OFF.
 *
 * @see Living Document Section 18.2 for invariants.
 */

import * as logger from 'firebase-functions/logger';

/**
 * Current schema versions by collection.
 */
export const CURRENT_VERSIONS: Record<string, number> = {
    jobs: 3,
    listings: 2,
    users: 2,
    bookings: 1,
    businesses: 2,
};

/**
 * Minimum supported client versions.
 */
export const MIN_CLIENT_VERSIONS: Record<string, number> = {
    jobs: 1,
    listings: 1,
    users: 1,
    bookings: 1,
    businesses: 1,
};

/**
 * Schema version mismatch error.
 */
export class SchemaVersionError extends Error {
    public readonly code = 'SCHEMA_VERSION_MISMATCH';
    public readonly httpStatus = 400;
    public readonly retryable = false;

    constructor(
        public readonly collection: string,
        public readonly documentVersion: number,
        public readonly serverVersion: number,
        public readonly traceId: string
    ) {
        super(
            `Schema version mismatch for '${collection}': document v${documentVersion}, server v${serverVersion}`
        );
        this.name = 'SchemaVersionError';
    }
}

/**
 * Validates document schema version.
 *
 * @param collection - Collection name.
 * @param documentVersion - Version in the document.
 * @param traceId - Trace ID for logging.
 * @throws SchemaVersionError if version is unsupported.
 */
export function validateSchemaVersion(
    collection: string,
    documentVersion: number | undefined,
    traceId: string
): void {
    const minVersion = MIN_CLIENT_VERSIONS[collection];
    const currentVersion = CURRENT_VERSIONS[collection];

    // No version = legacy document (version 0)
    const version = documentVersion ?? 0;

    if (version < minVersion) {
        logger.error('SchemaVersion: Unsupported version', {
            component: 'schemaVersioning',
            event: 'version_unsupported',
            traceId,
            collection,
            documentVersion: version,
            minVersion,
            currentVersion,
        });

        throw new SchemaVersionError(collection, version, currentVersion, traceId);
    }

    if (version > currentVersion) {
        logger.warn('SchemaVersion: Future version detected (client ahead)', {
            component: 'schemaVersioning',
            event: 'future_version',
            traceId,
            collection,
            documentVersion: version,
            currentVersion,
        });
        // Allow but log - client may have newer schema
    }

    logger.debug('SchemaVersion: Validated', {
        component: 'schemaVersioning',
        event: 'validated',
        traceId,
        collection,
        documentVersion: version,
    });
}

/**
 * Adds schema version to document data.
 *
 * @param collection - Collection name.
 * @param data - Document data.
 * @returns Data with schemaVersion added.
 */
export function withSchemaVersion<T extends Record<string, unknown>>(
    collection: string,
    data: T
): T & { schemaVersion: number } {
    const version = CURRENT_VERSIONS[collection] ?? 1;
    return {
        ...data,
        schemaVersion: version,
    };
}

/**
 * Migrates document from old version to current version.
 * Tolerant reader pattern: apply migrations in order.
 *
 * @param collection - Collection name.
 * @param data - Document data.
 * @param traceId - Trace ID.
 * @returns Migrated data at current version.
 */
export function migrateToCurrentVersion(
    collection: string,
    data: Record<string, unknown>,
    traceId: string
): Record<string, unknown> {
    const currentVersion = CURRENT_VERSIONS[collection] ?? 1;
    const documentVersion = (data.schemaVersion as number) ?? 0;

    if (documentVersion >= currentVersion) {
        return data;
    }

    let migrated: Record<string, unknown> = { ...data };

    // Apply migrations sequentially
    for (let v = documentVersion; v < currentVersion; v++) {
        const migration = getMigration(collection, v, v + 1);
        if (migration) {
            migrated = migration(migrated);

            logger.info('SchemaVersion: Migration applied', {
                component: 'schemaVersioning',
                event: 'migration_applied',
                traceId,
                collection,
                fromVersion: v,
                toVersion: v + 1,
            });
        }
    }

    migrated.schemaVersion = currentVersion;
    return migrated;
}

/**
 * Gets migration function for a specific version transition.
 */
function getMigration(
    collection: string,
    fromVersion: number,
    toVersion: number
): ((data: Record<string, unknown>) => Record<string, unknown>) | null {
    const key = `${collection}:${fromVersion}→${toVersion}`;

    const migrations: Record<
        string,
        (data: Record<string, unknown>) => Record<string, unknown>
    > = {
        // Example migrations
        'jobs:0→1': (data) => ({
            ...data,
            status: (data.status as string)?.toLowerCase() || 'collecting',
        }),
        'jobs:1→2': (data) => ({
            ...data,
            priceSnapshot: data.priceSnapshot || null,
        }),
        'jobs:2→3': (data) => ({
            ...data,
            dispatchEvidence: data.dispatchEvidence || null,
        }),
        'listings:0→1': (data) => ({
            ...data,
            merveEnabled: data.merveEnabled ?? false,
        }),
        'listings:1→2': (data) => ({
            ...data,
            merveActions: data.merveActions || [],
        }),
    };

    return migrations[key] || null;
}

/**
 * Gets current version for a collection.
 */
export function getCurrentVersion(collection: string): number {
    return CURRENT_VERSIONS[collection] ?? 1;
}
