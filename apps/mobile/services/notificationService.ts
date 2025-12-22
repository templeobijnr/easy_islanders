/**
 * Notification Service
 * 
 * Handles push notification registration, permission handling, and event listeners.
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { logger } from '../utils/logger';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/**
 * Register for push notifications and return the token
 */
export async function registerForPushNotifications(): Promise<string | null> {
    try {
        // Push notifications require physical device
        if (!Device.isDevice) {
            logger.warn('Push notifications require a physical device');
            return null;
        }

        // Check existing permission
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        // Request permission if not already granted
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            logger.warn('Push notification permission denied');
            return null;
        }

        // Get push token
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: projectId ?? undefined,
        });
        const token = tokenData.data;

        logger.log('Push token obtained:', token);

        // Android-specific channel setup
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'Default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#007AFF',
            });

            await Notifications.setNotificationChannelAsync('jobs', {
                name: 'Job Updates',
                description: 'Notifications about your job status',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
            });
        }

        return token;
    } catch (error) {
        logger.error('Failed to register for push notifications', error);
        return null;
    }
}

/**
 * Add listener for incoming notifications (foreground)
 */
export function addNotificationReceivedListener(
    handler: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
    return Notifications.addNotificationReceivedListener(handler);
}

/**
 * Add listener for notification interactions (taps)
 */
export function addNotificationResponseListener(
    handler: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription {
    return Notifications.addNotificationResponseReceivedListener(handler);
}

/**
 * Send a local notification (for testing)
 */
export async function sendLocalNotification(
    title: string,
    body: string,
    data?: Record<string, unknown>
): Promise<string> {
    return Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data: data || {},
            sound: true,
        },
        trigger: null, // Immediate
    });
}

/**
 * Get the last notification response (for deep linking on app open)
 */
export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
    return Notifications.getLastNotificationResponseAsync();
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Set badge count (iOS)
 */
export async function setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
}
