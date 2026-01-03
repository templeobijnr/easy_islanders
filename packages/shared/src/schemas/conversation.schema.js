"use strict";
/**
 * Conversation & Message Schemas for AskMerve V1
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageSchema = exports.MessageContentTypeSchema = exports.ConversationSchema = exports.ChannelSchema = exports.ConversationTypeSchema = void 0;
const zod_1 = require("zod");
const job_schema_1 = require("./job.schema");
// =============================================================================
// CONVERSATION SCHEMA
// =============================================================================
/**
 * Conversation type determines routing and UI presentation.
 */
exports.ConversationTypeSchema = zod_1.z.enum([
    'user_merve', // User ↔ Merve (general assistant)
    'user_business', // User ↔ Business agent
    'merchant_ops', // Merchant ↔ Ops (dispatch, job management)
]);
/**
 * Channel where conversation is happening.
 */
exports.ChannelSchema = zod_1.z.enum([
    'app', // Mobile/web app chat
    'whatsapp', // WhatsApp Business API
    'web', // Web widget
]);
/**
 * Conversation document schema.
 */
exports.ConversationSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    /** Conversation type */
    type: exports.ConversationTypeSchema,
    /** Channel */
    channel: exports.ChannelSchema,
    /** User ID (Firebase Auth UID) */
    userId: zod_1.z.string().min(1),
    /** Business ID if business-scoped */
    businessId: zod_1.z.string().optional(),
    /** Listing ID if listing-scoped */
    listingId: zod_1.z.string().optional(),
    /** Last message preview */
    lastMessage: zod_1.z.string().optional(),
    /** Last activity timestamp */
    lastActivityAt: zod_1.z.string(),
    /** Number of unread messages */
    unreadCount: zod_1.z.number().int().nonnegative().default(0),
    /** Conversation status */
    status: zod_1.z.enum(['active', 'archived', 'blocked']).default('active'),
    /** Timestamps */
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
// =============================================================================
// MESSAGE SCHEMA
// =============================================================================
/**
 * Message content types.
 */
exports.MessageContentTypeSchema = zod_1.z.enum([
    'text',
    'image',
    'audio',
    'location',
    'job_card', // Rich job status card
    'confirmation', // Confirmation prompt
]);
/**
 * Message document schema.
 */
exports.MessageSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    /** Parent conversation ID */
    conversationId: zod_1.z.string().min(1),
    /** Message source (user, assistant, system, tool) */
    source: job_schema_1.MessageSourceSchema,
    /** Content type */
    contentType: exports.MessageContentTypeSchema.default('text'),
    /** Text content */
    text: zod_1.z.string().optional(),
    /** Media URL if image/audio */
    mediaUrl: zod_1.z.string().url().optional(),
    /** Location data if location message */
    location: zod_1.z.object({
        lat: zod_1.z.number(),
        lng: zod_1.z.number(),
        address: zod_1.z.string().optional(),
    }).optional(),
    /** Job reference if job_card or related */
    jobId: zod_1.z.string().optional(),
    /** Tool call info if from tool execution */
    toolCall: zod_1.z.object({
        name: zod_1.z.string(),
        args: zod_1.z.record(zod_1.z.unknown()).optional(),
        result: zod_1.z.unknown().optional(),
    }).optional(),
    /** Timestamps */
    createdAt: zod_1.z.string(),
    /** Delivery status (for outbound WhatsApp) */
    deliveryStatus: zod_1.z.enum(['pending', 'sent', 'delivered', 'read', 'failed']).optional(),
});
//# sourceMappingURL=conversation.schema.js.map