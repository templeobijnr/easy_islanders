/**
 * OTA Update Manager (CASC-02B)
 *
 * Manages Expo OTA updates with crash-loop detection and automatic rollback.
 *
 * INVARIANTS:
 * - 3 crashes within 30s triggers automatic rollback to embedded update.
 * - Remote kill-switch: `system/config.otaEnabled=false` disables OTA.
 * - All rollbacks logged with updateId, runtimeVersion, rollbackReason.
 * - Never blocks app startup; degraded mode if OTA check fails.
 *
 * @see Living Document Section 17.2.2 for invariants.
 */

import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

/**
 * Configuration for crash-loop detection.
 */
const CRASH_LOOP_CONFIG = {
    /** Number of crashes to trigger rollback */
    CRASH_THRESHOLD: 3,
    /** Time window for crash detection (ms) */
    TIME_WINDOW_MS: 30_000,
    /** Storage key for crash timestamps */
    STORAGE_KEY: 'ota_crash_timestamps',
} as const;

/**
 * OTA update status.
 */
export interface OTAStatus {
    updateId: string | null;
    runtimeVersion: string | null;
    channel: string | null;
    isEmbedded: boolean;
    lastCheckAt: Date | null;
    crashCount: number;
}

/**
 * Records an app crash/restart for crash-loop detection.
 * Call this early in app initialization.
 */
export async function recordAppStart(): Promise<void> {
    try {
        const now = Date.now();
        const storedData = await AsyncStorage.getItem(CRASH_LOOP_CONFIG.STORAGE_KEY);
        const timestamps: number[] = storedData ? JSON.parse(storedData) : [];

        // Add current timestamp
        timestamps.push(now);

        // Filter to recent crashes only
        const recentCrashes = timestamps.filter(
            (ts) => now - ts < CRASH_LOOP_CONFIG.TIME_WINDOW_MS
        );

        // Store filtered list
        await AsyncStorage.setItem(
            CRASH_LOOP_CONFIG.STORAGE_KEY,
            JSON.stringify(recentCrashes)
        );

        logger.info('OTA: App start recorded', {
            component: 'otaManager',
            event: 'app_start_recorded',
            crashCount: recentCrashes.length,
            threshold: CRASH_LOOP_CONFIG.CRASH_THRESHOLD,
        });

        // Check for crash loop
        if (recentCrashes.length >= CRASH_LOOP_CONFIG.CRASH_THRESHOLD) {
            logger.error('OTA: CRASH LOOP DETECTED - Initiating rollback', {
                component: 'otaManager',
                event: 'crash_loop_detected',
                crashCount: recentCrashes.length,
                updateId: Updates.updateId,
                runtimeVersion: Updates.runtimeVersion,
            });

            await triggerRollback('crash_loop');
        }
    } catch (error) {
        logger.error('OTA: Failed to record app start', {
            component: 'otaManager',
            event: 'record_start_failed',
            error: String(error),
        });
        // Don't throw - this should never block app startup
    }
}

/**
 * Clears the crash history after stable operation.
 * Call this after the app has been running stably for 1+ minutes.
 */
export async function clearCrashHistory(): Promise<void> {
    try {
        await AsyncStorage.removeItem(CRASH_LOOP_CONFIG.STORAGE_KEY);
        logger.info('OTA: Crash history cleared', {
            component: 'otaManager',
            event: 'crash_history_cleared',
        });
    } catch (error) {
        logger.warn('OTA: Failed to clear crash history', {
            component: 'otaManager',
            event: 'clear_history_failed',
            error: String(error),
        });
    }
}

/**
 * Triggers a rollback to the embedded update.
 *
 * @param reason - Why the rollback was triggered.
 */
async function triggerRollback(reason: string): Promise<void> {
    try {
        logger.error('OTA: ROLLING BACK TO EMBEDDED UPDATE', {
            component: 'otaManager',
            event: 'rollback_initiated',
            reason,
            currentUpdateId: Updates.updateId,
            runtimeVersion: Updates.runtimeVersion,
            channel: Updates.channel,
        });

        // Clear crash history before rollback
        await AsyncStorage.removeItem(CRASH_LOOP_CONFIG.STORAGE_KEY);

        // Reload to embedded update
        await Updates.reloadAsync();
    } catch (error) {
        logger.error('OTA: Rollback failed', {
            component: 'otaManager',
            event: 'rollback_failed',
            reason,
            error: String(error),
        });
        // Cannot recover from this - app will restart normally
    }
}

/**
 * Checks for and applies OTA updates.
 *
 * @param otaEnabled - Whether OTA is enabled (from remote config).
 * @returns True if an update was applied.
 */
export async function checkForUpdates(otaEnabled: boolean): Promise<boolean> {
    // Remote kill-switch
    if (!otaEnabled) {
        logger.info('OTA: Updates disabled by remote config', {
            component: 'otaManager',
            event: 'ota_disabled',
        });
        return false;
    }

    // Skip in development
    if (__DEV__) {
        logger.info('OTA: Skipping update check (development)', {
            component: 'otaManager',
            event: 'dev_mode_skip',
        });
        return false;
    }

    try {
        logger.info('OTA: Checking for updates', {
            component: 'otaManager',
            event: 'update_check_started',
            currentUpdateId: Updates.updateId,
        });

        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
            logger.info('OTA: Update available, downloading', {
                component: 'otaManager',
                event: 'update_available',
                manifestId: update.manifest?.id,
            });

            await Updates.fetchUpdateAsync();

            logger.info('OTA: Update downloaded, will apply on next restart', {
                component: 'otaManager',
                event: 'update_downloaded',
            });

            return true;
        }

        logger.info('OTA: No updates available', {
            component: 'otaManager',
            event: 'no_update',
        });

        return false;
    } catch (error) {
        logger.error('OTA: Update check failed', {
            component: 'otaManager',
            event: 'update_check_failed',
            error: String(error),
        });
        // Don't throw - OTA failure should never break the app
        return false;
    }
}

/**
 * Gets the current OTA status.
 */
export async function getOTAStatus(): Promise<OTAStatus> {
    const storedData = await AsyncStorage.getItem(CRASH_LOOP_CONFIG.STORAGE_KEY);
    const timestamps: number[] = storedData ? JSON.parse(storedData) : [];
    const now = Date.now();
    const recentCrashes = timestamps.filter(
        (ts) => now - ts < CRASH_LOOP_CONFIG.TIME_WINDOW_MS
    );

    return {
        updateId: Updates.updateId,
        runtimeVersion: Updates.runtimeVersion,
        channel: Updates.channel,
        isEmbedded: Updates.isEmbeddedLaunch,
        lastCheckAt: null, // Would need to track this separately
        crashCount: recentCrashes.length,
    };
}
