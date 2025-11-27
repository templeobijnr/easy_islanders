/**
 * Messaging types for WhatsApp, SMS and other channels.
 *
 * These are shared between:
 *  - Firebase Functions (Twilio webhook, vendor reply router)
 *  - Frontend tools that inspect message history
 *
 * The goal is to have a single, typed view over everything that
 * flows through the `whatsappMessages` (and future SMS) collections.
 */

/** Direction of a message relative to our system. */
export type MessageDirection = 'inbound' | 'outbound';

/** High‑level lifecycle status for a message. */
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed';

/**
 * Logical message categories that sit above the raw text.
 * Used for analytics, routing and UI labelling.
 */
export type MessageType =
  | 'booking_request'
  | 'vendor_reply'
  | 'confirmation'
  | 'update'
  | 'reminder'
  | 'general';

/** Kind of actor that produced a given message. */
export type SenderType = 'customer' | 'vendor' | 'system' | 'agent';

/** Reference to a booking / order document the message is about. */
export interface MessageRelatedTo {
  collection: 'taxiBookings' | 'groceryOrders' | 'serviceRequests' | 'bookings';
  id: string;
}

/** Metadata describing who sent the message. */
export interface MessageSender {
  type: SenderType;
  userId?: string;
  vendorPhone?: string;
  vendorName?: string;
  systemName?: string;
}

/** Optional additional metadata attached during processing. */
export interface MessageMetadata {
  bookingStatus?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notificationsSent?: string[]; // Array of notification IDs
  processedAsVendorReply?: boolean;
  vendorReplyType?: 'confirm' | 'reject' | 'arrived' | 'completed' | 'update';
}

/**
 * Canonical WhatsApp message document.
 * Maps 1‑to‑1 with the `whatsappMessages` collection shape.
 */
export interface WhatsAppMessage {
  id: string;
  from: string; // whatsapp:+1234567890
  to: string;
  body: string;
  direction: MessageDirection;
  messageSid: string; // Twilio message ID
  status: MessageStatus;

  // Categorization
  messageType: MessageType;
  sender: MessageSender;
  relatedTo?: MessageRelatedTo;
  thread?: string; // Thread ID for grouping related messages

  // Metadata
  metadata?: MessageMetadata;

  // Timestamps
  receivedAt?: string; // For inbound
  sentAt?: string; // For outbound
  deliveredAt?: string;
  readAt?: string;
}

/** Conversation/thread grouping multiple messages. */
export interface MessageThread {
  id: string;
  participants: string[]; // Phone numbers
  relatedTo?: MessageRelatedTo;
  lastMessage: string;
  lastMessageAt: string;
  messageCount: number;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Result from vendor reply detection logic. */
export interface VendorReplyMatch {
  matched: boolean;
  bookingId?: string;
  bookingType?: 'taxi' | 'grocery' | 'service';
  replyType?: 'confirm' | 'reject' | 'arrived' | 'completed' | 'update';
  message: string;
}

/** SMS message record (non‑WhatsApp). */
export interface SMSMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  direction: MessageDirection;
  messageSid: string;
  status: MessageStatus;
  sentAt?: string;
  deliveredAt?: string;
}
