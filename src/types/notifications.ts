/**
 * Notification System Types
 * Multi-channel notification delivery across WhatsApp, Push, Email, SMS, Chat
 */

// Notification channels
export type NotificationChannel = 'whatsapp' | 'push' | 'email' | 'sms' | 'chat';

// Priority levels
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

// Delivery status
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

// Notification categories
export type NotificationType =
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'vendor_reply'
  | 'order_update'
  | 'payment_received'
  | 'delivery_status'
  | 'chat_message'
  | 'system_alert'
  | 'promotion';

/**
 * Reference to related entity
 */
export interface NotificationRelatedTo {
  collection: 'taxiBookings' | 'groceryOrders' | 'serviceRequests' | 'chatSessions' | 'bookings';
  id: string;
  type?: string;
}

/**
 * Payload for sending notifications
 */
export interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  priority?: NotificationPriority;
  channels: NotificationChannel[];
  data?: Record<string, string>;
  relatedTo?: NotificationRelatedTo;
  actionUrl?: string;
  imageUrl?: string;
}

/**
 * Stored notification document
 */
export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  status: NotificationStatus;
  data?: Record<string, string>;
  relatedTo?: NotificationRelatedTo;
  actionUrl?: string;
  imageUrl?: string;

  // Delivery tracking
  results: Partial<Record<NotificationChannel, boolean>>;
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;

  // Metadata
  createdAt: string;
  updatedAt?: string;
}

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  userId: string;
  channels: Record<NotificationChannel, boolean>;
  types: Partial<Record<NotificationType, boolean>>;
  quietHours?: {
    enabled: boolean;
    start: string; // HH:mm
    end: string;
  };
  updatedAt: string;
}

/**
 * Push notification token (FCM)
 */
export interface PushToken {
  userId: string;
  token: string;
  platform: 'web' | 'ios' | 'android';
  deviceId?: string;
  deviceName?: string;
  createdAt: string;
  lastUsedAt: string;
}
