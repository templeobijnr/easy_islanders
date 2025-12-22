/**
 * Conversation & Message Schemas for AskMerve V1
 */

import { z } from 'zod';
import { MessageSourceSchema } from './job.schema';

// =============================================================================
// CONVERSATION SCHEMA
// =============================================================================

/**
 * Conversation type determines routing and UI presentation.
 */
export const ConversationTypeSchema = z.enum([
    'user_merve',      // User ↔ Merve (general assistant)
    'user_business',   // User ↔ Business agent
    'merchant_ops',    // Merchant ↔ Ops (dispatch, job management)
]);

export type ConversationType = z.infer<typeof ConversationTypeSchema>;

/**
 * Channel where conversation is happening.
 */
export const ChannelSchema = z.enum([
    'app',       // Mobile/web app chat
    'whatsapp',  // WhatsApp Business API
    'web',       // Web widget
]);

export type Channel = z.infer<typeof ChannelSchema>;

/**
 * Conversation document schema.
 */
export const ConversationSchema = z.object({
    id: z.string().min(1),

    /** Conversation type */
    type: ConversationTypeSchema,

    /** Channel */
    channel: ChannelSchema,

    /** User ID (Firebase Auth UID) */
    userId: z.string().min(1),

    /** Business ID if business-scoped */
    businessId: z.string().optional(),

    /** Listing ID if listing-scoped */
    listingId: z.string().optional(),

    /** Last message preview */
    lastMessage: z.string().optional(),

    /** Last activity timestamp */
    lastActivityAt: z.string(),

    /** Number of unread messages */
    unreadCount: z.number().int().nonnegative().default(0),

    /** Conversation status */
    status: z.enum(['active', 'archived', 'blocked']).default('active'),

    /** Timestamps */
    createdAt: z.string(),
    updatedAt: z.string(),
});

export type Conversation = z.infer<typeof ConversationSchema>;

// =============================================================================
// MESSAGE SCHEMA
// =============================================================================

/**
 * Message content types.
 */
export const MessageContentTypeSchema = z.enum([
    'text',
    'image',
    'audio',
    'location',
    'job_card',     // Rich job status card
    'confirmation', // Confirmation prompt
]);

export type MessageContentType = z.infer<typeof MessageContentTypeSchema>;

/**
 * Message document schema.
 */
export const MessageSchema = z.object({
    id: z.string().min(1),

    /** Parent conversation ID */
    conversationId: z.string().min(1),

    /** Message source (user, assistant, system, tool) */
    source: MessageSourceSchema,

    /** Content type */
    contentType: MessageContentTypeSchema.default('text'),

    /** Text content */
    text: z.string().optional(),

    /** Media URL if image/audio */
    mediaUrl: z.string().url().optional(),

    /** Location data if location message */
    location: z.object({
        lat: z.number(),
        lng: z.number(),
        address: z.string().optional(),
    }).optional(),

    /** Job reference if job_card or related */
    jobId: z.string().optional(),

    /** Tool call info if from tool execution */
    toolCall: z.object({
        name: z.string(),
        args: z.record(z.unknown()).optional(),
        result: z.unknown().optional(),
    }).optional(),

    /** Timestamps */
    createdAt: z.string(),

    /** Delivery status (for outbound WhatsApp) */
    deliveryStatus: z.enum(['pending', 'sent', 'delivered', 'read', 'failed']).optional(),
});

export type Message = z.infer<typeof MessageSchema>;
