"use strict";
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
exports.SchemaVersionError = exports.MIN_CLIENT_VERSIONS = exports.CURRENT_VERSIONS = void 0;
exports.validateSchemaVersion = validateSchemaVersion;
exports.withSchemaVersion = withSchemaVersion;
exports.migrateToCurrentVersion = migrateToCurrentVersion;
exports.getCurrentVersion = getCurrentVersion;
const logger = __importStar(require("firebase-functions/logger"));
/**
 * Current schema versions by collection.
 */
exports.CURRENT_VERSIONS = {
    jobs: 3,
    listings: 2,
    users: 2,
    bookings: 1,
    businesses: 2,
};
/**
 * Minimum supported client versions.
 */
exports.MIN_CLIENT_VERSIONS = {
    jobs: 1,
    listings: 1,
    users: 1,
    bookings: 1,
    businesses: 1,
};
/**
 * Schema version mismatch error.
 */
class SchemaVersionError extends Error {
    constructor(collection, documentVersion, serverVersion, traceId) {
        super(`Schema version mismatch for '${collection}': document v${documentVersion}, server v${serverVersion}`);
        this.collection = collection;
        this.documentVersion = documentVersion;
        this.serverVersion = serverVersion;
        this.traceId = traceId;
        this.code = 'SCHEMA_VERSION_MISMATCH';
        this.httpStatus = 400;
        this.retryable = false;
        this.name = 'SchemaVersionError';
    }
}
exports.SchemaVersionError = SchemaVersionError;
/**
 * Validates document schema version.
 *
 * @param collection - Collection name.
 * @param documentVersion - Version in the document.
 * @param traceId - Trace ID for logging.
 * @throws SchemaVersionError if version is unsupported.
 */
function validateSchemaVersion(collection, documentVersion, traceId) {
    const minVersion = exports.MIN_CLIENT_VERSIONS[collection];
    const currentVersion = exports.CURRENT_VERSIONS[collection];
    // No version = legacy document (version 0)
    const version = documentVersion !== null && documentVersion !== void 0 ? documentVersion : 0;
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
function withSchemaVersion(collection, data) {
    var _a;
    const version = (_a = exports.CURRENT_VERSIONS[collection]) !== null && _a !== void 0 ? _a : 1;
    return Object.assign(Object.assign({}, data), { schemaVersion: version });
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
function migrateToCurrentVersion(collection, data, traceId) {
    var _a, _b;
    const currentVersion = (_a = exports.CURRENT_VERSIONS[collection]) !== null && _a !== void 0 ? _a : 1;
    const documentVersion = (_b = data.schemaVersion) !== null && _b !== void 0 ? _b : 0;
    if (documentVersion >= currentVersion) {
        return data;
    }
    let migrated = Object.assign({}, data);
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
function getMigration(collection, fromVersion, toVersion) {
    const key = `${collection}:${fromVersion}→${toVersion}`;
    const migrations = {
        // Example migrations
        'jobs:0→1': (data) => {
            var _a;
            return (Object.assign(Object.assign({}, data), { status: ((_a = data.status) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || 'collecting' }));
        },
        'jobs:1→2': (data) => (Object.assign(Object.assign({}, data), { priceSnapshot: data.priceSnapshot || null })),
        'jobs:2→3': (data) => (Object.assign(Object.assign({}, data), { dispatchEvidence: data.dispatchEvidence || null })),
        'listings:0→1': (data) => {
            var _a;
            return (Object.assign(Object.assign({}, data), { merveEnabled: (_a = data.merveEnabled) !== null && _a !== void 0 ? _a : false }));
        },
        'listings:1→2': (data) => (Object.assign(Object.assign({}, data), { merveActions: data.merveActions || [] })),
    };
    return migrations[key] || null;
}
/**
 * Gets current version for a collection.
 */
function getCurrentVersion(collection) {
    var _a;
    return (_a = exports.CURRENT_VERSIONS[collection]) !== null && _a !== void 0 ? _a : 1;
}
//# sourceMappingURL=schemaVersioning.js.map