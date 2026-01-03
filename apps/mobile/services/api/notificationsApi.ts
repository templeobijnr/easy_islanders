/**
 * Notifications API Service
 * Connects mobile app to backend notifications endpoints
 */

import auth from '@react-native-firebase/auth';
import { api } from '../apiClient';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ||
    'https://us-central1-merve-app-nc.cloudfunctions.net/api';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Notification {
    id: string;
    type: string;
    title?: string;
    body?: string;
    data?: Record<string, unknown>;
    createdAt: string;
    readAt?: string | null;
}

export interface NotificationsResponse {
    notifications: Notification[];
    unreadCount: number;
}

export interface UnreadCountResponse {
    unreadCount: number;
}

export interface NotificationsQuery {
    limit?: number;
    unreadOnly?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function getAuthToken(): Promise<string> {
    const user = auth().currentUser;
    if (!user) {
        throw new Error('User not authenticated');
    }
    return user.getIdToken();
}

// ─────────────────────────────────────────────────────────────────────────────
// API FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get notifications for the current user
 */
export async function getNotifications(query?: NotificationsQuery): Promise<NotificationsResponse> {
    const token = await getAuthToken();

    const params = new URLSearchParams();
    if (query?.limit) params.append('limit', String(query.limit));
    if (query?.unreadOnly) params.append('unreadOnly', 'true');

    const url = `${API_BASE_URL}/v1/notifications${params.toString() ? '?' + params.toString() : ''}`;
    const resp = await api.get<NotificationsResponse>(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    return resp.data;
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<number> {
    const token = await getAuthToken();
    const resp = await api.get<UnreadCountResponse>(`${API_BASE_URL}/v1/notifications/unread-count`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    return resp.data.unreadCount;
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
    const token = await getAuthToken();
    await api.post<{ ok: true }>(
        `${API_BASE_URL}/v1/notifications/${notificationId}/read`,
        {},
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );
}

/**
 * Register push token with backend
 */
export async function registerPushToken(token: string, platform: 'ios' | 'android'): Promise<void> {
    const authToken = await getAuthToken();
    await api.post<{ ok: true }>(
        `${API_BASE_URL}/v1/users/push-token`,
        { token, platform },
        {
            headers: {
                Authorization: `Bearer ${authToken}`,
            },
        }
    );
}

