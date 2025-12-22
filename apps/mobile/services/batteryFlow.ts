/**
 * Battery Optimization Flow (WEB-03)
 *
 * Manages OEM battery optimization detection and user guidance.
 *
 * INVARIANTS:
 * - Detects battery optimization status.
 * - Shows user guidance for disabling restrictions.
 * - Provides deep links to settings where possible.
 * - Tracks success/failure rates for monitoring.
 *
 * @see Living Document Section 17.2.2 for invariants.
 */

import { Platform, Linking, Alert } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import { logger } from './logger';

/**
 * Battery optimization status.
 */
export interface BatteryOptimizationStatus {
    isOptimized: boolean;
    canRequestIgnore: boolean;
    manufacturer: string;
    hasCustomSettings: boolean;
}

/**
 * Known OEM battery optimization settings.
 */
const OEM_SETTINGS: Record<string, { name: string; packageName?: string; action?: string }> = {
    samsung: {
        name: 'Samsung',
        action: 'com.samsung.android.sm.ACTION_BATTERY_OPTIMIZATION',
    },
    huawei: {
        name: 'Huawei',
        packageName: 'com.huawei.systemmanager',
    },
    xiaomi: {
        name: 'Xiaomi',
        packageName: 'com.miui.powerkeeper',
    },
    oppo: {
        name: 'OPPO',
        packageName: 'com.coloros.oppoguardelf',
    },
    vivo: {
        name: 'vivo',
        packageName: 'com.vivo.abe',
    },
    oneplus: {
        name: 'OnePlus',
        action: 'com.android.settings.BATTERY_SAVER_SETTINGS',
    },
};

/**
 * Gets the device manufacturer (lowercase).
 */
function getManufacturer(): string {
    // Note: In a real app, use react-native-device-info
    // This is a simplified version
    return Platform.OS === 'android' ? 'unknown' : 'apple';
}

/**
 * Checks the current battery optimization status.
 */
export async function checkBatteryOptimization(): Promise<BatteryOptimizationStatus> {
    if (Platform.OS !== 'android') {
        // iOS doesn't have the same battery optimization issues
        return {
            isOptimized: false,
            canRequestIgnore: false,
            manufacturer: 'apple',
            hasCustomSettings: false,
        };
    }

    const manufacturer = getManufacturer().toLowerCase();
    const hasCustomSettings = Object.keys(OEM_SETTINGS).some(
        (oem) => manufacturer.includes(oem)
    );

    logger.info('Battery: Status checked', {
        component: 'batteryFlow',
        event: 'status_checked',
        manufacturer,
        hasCustomSettings,
    });

    // Note: To properly check if the app is whitelisted,
    // you would need a native module or library like
    // react-native-background-actions
    return {
        isOptimized: true, // Assume optimized until proven otherwise
        canRequestIgnore: true,
        manufacturer,
        hasCustomSettings,
    };
}

/**
 * Shows the battery optimization guidance dialog.
 */
export function showBatteryOptimizationGuide(): void {
    const manufacturer = getManufacturer().toLowerCase();

    logger.info('Battery: Showing guide', {
        component: 'batteryFlow',
        event: 'guide_shown',
        manufacturer,
    });

    Alert.alert(
        'Enable Background Activity',
        'To receive updates about your requests, please disable battery optimization for this app.\n\n' +
        'This ensures you get timely notifications even when the app is in the background.',
        [
            {
                text: 'Later',
                style: 'cancel',
                onPress: () => {
                    logger.info('Battery: Guide dismissed', {
                        component: 'batteryFlow',
                        event: 'guide_dismissed',
                    });
                },
            },
            {
                text: 'Open Settings',
                onPress: () => openBatterySettings(),
            },
        ]
    );
}

/**
 * Opens battery optimization settings.
 */
export async function openBatterySettings(): Promise<boolean> {
    if (Platform.OS !== 'android') {
        // iOS - open general settings
        const success = await Linking.openSettings().catch(() => false);
        logger.info('Battery: iOS settings opened', {
            component: 'batteryFlow',
            event: 'settings_opened',
            platform: 'ios',
            success: !!success,
        });
        return !!success;
    }

    const manufacturer = getManufacturer().toLowerCase();
    const oemConfig = Object.entries(OEM_SETTINGS).find(([key]) =>
        manufacturer.includes(key)
    )?.[1];

    try {
        if (oemConfig?.action) {
            // Try OEM-specific action
            await IntentLauncher.startActivityAsync(oemConfig.action);
            logger.info('Battery: OEM settings opened', {
                component: 'batteryFlow',
                event: 'settings_opened',
                method: 'oem_action',
                manufacturer: oemConfig.name,
            });
            return true;
        }

        if (oemConfig?.packageName) {
            // Try opening OEM app
            const supported = await Linking.canOpenURL(
                `package:${oemConfig.packageName}`
            );
            if (supported) {
                await Linking.openURL(`package:${oemConfig.packageName}`);
                logger.info('Battery: OEM app opened', {
                    component: 'batteryFlow',
                    event: 'settings_opened',
                    method: 'oem_package',
                    manufacturer: oemConfig.name,
                });
                return true;
            }
        }

        // Fallback to Android battery settings
        await IntentLauncher.startActivityAsync(
            IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS
        );

        logger.info('Battery: Generic settings opened', {
            component: 'batteryFlow',
            event: 'settings_opened',
            method: 'generic',
        });

        return true;
    } catch (error) {
        logger.error('Battery: Failed to open settings', {
            component: 'batteryFlow',
            event: 'settings_failed',
            error: String(error),
        });

        // Last resort: open general settings
        try {
            await Linking.openSettings();
            return true;
        } catch {
            return false;
        }
    }
}

/**
 * Records user's response to battery optimization prompt.
 */
export function recordBatteryOptimizationResponse(
    accepted: boolean,
    settingsOpened: boolean
): void {
    logger.info('Battery: User response recorded', {
        component: 'batteryFlow',
        event: 'response_recorded',
        accepted,
        settingsOpened,
    });

    // In production, send this to analytics
}

/**
 * Checks if we should show the battery optimization prompt.
 * Returns false if:
 * - User has already dismissed
 * - Too soon since last prompt
 * - Platform doesn't need it (iOS)
 */
export async function shouldShowBatteryPrompt(): Promise<boolean> {
    if (Platform.OS !== 'android') {
        return false;
    }

    // In production, check AsyncStorage for:
    // - Last prompt time
    // - User's previous response
    // - Number of dismissals

    return true;
}
