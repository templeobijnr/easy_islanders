/**
 * Remote Config Service (SCH-01)
 *
 * Safe remote configuration with defaults, validation, and versioning.
 *
 * INVARIANTS:
 * - All flags require hardcoded defaults.
 * - Missing/invalid config = safe degradation, never crash.
 * - Config versioning + structured logging.
 * - Remote fetch failures return defaults.
 *
 * @see Living Document Section 17.2.2 for invariants.
 */

import { logger } from './logger';

/**
 * Configuration schema with defaults.
 */
export interface RemoteConfigSchema {
    // Feature flags
    otaEnabled: boolean;
    backgroundJobsEnabled: boolean;
    offlineModeEnabled: boolean;

    // Limits
    maxRetryAttempts: number;
    requestTimeoutMs: number;
    syncTimeoutMs: number;

    // Kill switches
    maintenanceMode: boolean;

    // Version tracking
    configVersion: number;
}

/**
 * Default configuration values.
 * These are used if remote config fails or is invalid.
 */
const DEFAULT_CONFIG: RemoteConfigSchema = {
    // Feature flags - conservative defaults
    otaEnabled: true,
    backgroundJobsEnabled: false, // Disabled by default until tested
    offlineModeEnabled: true,

    // Limits - safe defaults
    maxRetryAttempts: 3,
    requestTimeoutMs: 30_000,
    syncTimeoutMs: 10_000,

    // Kill switches
    maintenanceMode: false,

    // Version
    configVersion: 0,
};

/**
 * Current active configuration.
 */
let currentConfig: RemoteConfigSchema = { ...DEFAULT_CONFIG };
let lastFetchAt: Date | null = null;
let fetchError: string | null = null;

/**
 * Validates a config value against expected type.
 */
function validateValue<T>(
    key: string,
    value: unknown,
    defaultValue: T,
    expectedType: string
): T {
    if (value === undefined || value === null) {
        return defaultValue;
    }

    if (typeof value !== expectedType) {
        logger.warn('RemoteConfig: Invalid type, using default', {
            component: 'remoteConfig',
            event: 'validation_failed',
            key,
            expectedType,
            actualType: typeof value,
        });
        return defaultValue;
    }

    return value as T;
}

/**
 * Validates and merges remote config with defaults.
 */
function validateConfig(
    remote: Partial<RemoteConfigSchema>
): RemoteConfigSchema {
    return {
        otaEnabled: validateValue(
            'otaEnabled',
            remote.otaEnabled,
            DEFAULT_CONFIG.otaEnabled,
            'boolean'
        ),
        backgroundJobsEnabled: validateValue(
            'backgroundJobsEnabled',
            remote.backgroundJobsEnabled,
            DEFAULT_CONFIG.backgroundJobsEnabled,
            'boolean'
        ),
        offlineModeEnabled: validateValue(
            'offlineModeEnabled',
            remote.offlineModeEnabled,
            DEFAULT_CONFIG.offlineModeEnabled,
            'boolean'
        ),
        maxRetryAttempts: validateValue(
            'maxRetryAttempts',
            remote.maxRetryAttempts,
            DEFAULT_CONFIG.maxRetryAttempts,
            'number'
        ),
        requestTimeoutMs: validateValue(
            'requestTimeoutMs',
            remote.requestTimeoutMs,
            DEFAULT_CONFIG.requestTimeoutMs,
            'number'
        ),
        syncTimeoutMs: validateValue(
            'syncTimeoutMs',
            remote.syncTimeoutMs,
            DEFAULT_CONFIG.syncTimeoutMs,
            'number'
        ),
        maintenanceMode: validateValue(
            'maintenanceMode',
            remote.maintenanceMode,
            DEFAULT_CONFIG.maintenanceMode,
            'boolean'
        ),
        configVersion: validateValue(
            'configVersion',
            remote.configVersion,
            DEFAULT_CONFIG.configVersion,
            'number'
        ),
    };
}

/**
 * Fetches remote configuration.
 *
 * @param fetchFn - Function to fetch config from backend
 * @returns Current config (remote or default)
 */
export async function fetchRemoteConfig(
    fetchFn: () => Promise<Partial<RemoteConfigSchema>>
): Promise<RemoteConfigSchema> {
    try {
        logger.info('RemoteConfig: Fetching', {
            component: 'remoteConfig',
            event: 'fetch_started',
            currentVersion: currentConfig.configVersion,
        });

        const remote = await fetchFn();
        const validated = validateConfig(remote);

        // Only update if version is newer
        if (validated.configVersion > currentConfig.configVersion) {
            const previousVersion = currentConfig.configVersion;
            currentConfig = validated;

            logger.info('RemoteConfig: Updated', {
                component: 'remoteConfig',
                event: 'config_updated',
                previousVersion,
                newVersion: validated.configVersion,
            });
        } else {
            logger.info('RemoteConfig: No update needed', {
                component: 'remoteConfig',
                event: 'config_current',
                version: currentConfig.configVersion,
            });
        }

        lastFetchAt = new Date();
        fetchError = null;

        return currentConfig;
    } catch (error) {
        fetchError = String(error);

        logger.error('RemoteConfig: Fetch failed, using defaults', {
            component: 'remoteConfig',
            event: 'fetch_failed',
            error: fetchError,
            usingVersion: currentConfig.configVersion,
        });

        // Return current config (which may be defaults)
        return currentConfig;
    }
}

/**
 * Gets a config value with type safety.
 */
export function getConfig<K extends keyof RemoteConfigSchema>(
    key: K
): RemoteConfigSchema[K] {
    return currentConfig[key];
}

/**
 * Gets the full current configuration.
 */
export function getFullConfig(): Readonly<RemoteConfigSchema> {
    return { ...currentConfig };
}

/**
 * Gets config status for debugging.
 */
export function getConfigStatus(): {
    version: number;
    lastFetchAt: Date | null;
    fetchError: string | null;
    isDefault: boolean;
} {
    return {
        version: currentConfig.configVersion,
        lastFetchAt,
        fetchError,
        isDefault: currentConfig.configVersion === 0,
    };
}

/**
 * Resets to default configuration (for testing).
 */
export function resetToDefaults(): void {
    currentConfig = { ...DEFAULT_CONFIG };
    lastFetchAt = null;
    fetchError = null;

    logger.info('RemoteConfig: Reset to defaults', {
        component: 'remoteConfig',
        event: 'reset',
    });
}
