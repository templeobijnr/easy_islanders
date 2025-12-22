/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MESSAGING MODULE — SCHEMA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Source of truth for Messaging data shapes.
 * NO Firebase imports. NO business logic.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CONTRACT SURFACE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * CAPABILITIES:
 *   - Receive WhatsApp inbound via Twilio webhook (FAST ACK + async processing)
 *   - Send WhatsApp outbound via Twilio API (idempotent)
 *   - Track message delivery status via Twilio callbacks
 *   - Correlate messages to threads/jobs/requests/providers
 *   - Route inbound messages to appropriate handlers
 *
 * OWNS (WRITES):
 *   - whatsappInbound/{messageSid}        (inbound receipts)
 *   - whatsappOutbound/{id}               (outbound message records)
 *   - whatsapp_logs/{id}                  (status callbacks, legacy compat)
 *   - messageCorrelation/{id}             (correlation records)
 *   - outboundIdempotency/{key}           (dedupe for outbound sends)
 *
 * ALLOWED READS:
 *   - users/{userId}                      (phone lookup)
 *   - threads/{threadId}                  (correlation target)
 *   - chatSessions/{id}                   (legacy correlation)
 *   - taxi_requests/{id}                  (driver reply matching)
 *   - food_orders/{id}                    (vendor reply matching)
 *   - service_requests/{id}               (vendor reply matching)
 *
 * FORBIDDEN WRITES:
 *   - users/{userId}
 *   - bookings/{id}
 *   - listings/{id}
 *   - requests/{id}
 *
 * EXPOSED CLOUD FUNCTIONS:
 *   - twilioInboundWebhook      (HTTP POST, Twilio signature required)
 *   - twilioStatusWebhook       (HTTP POST, Twilio signature required)
 *   - processWhatsAppInbound    (Cloud Task, internal)
 *
 * MESSAGE LIFECYCLE:
 *   Inbound:  queued → processing → processed | failed
 *   Outbound: pending → sent → delivered | failed
 *
 * IDEMPOTENCY STRATEGY:
 *   Inbound:  Twilio MessageSid (unique per message)
 *   Outbound: hash(channel:to:correlationId:templateKey:hourBucket)
 *
 * CONTRACT ISSUE #1: No formal contract doc exists for messaging.
 * RESOLUTION: Derived from existing implementations (twilio.controller.ts,
 *             whatsappInbound.repository.ts, whatsapp.service.ts).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Status of inbound message processing.
 * queued → processing → processed | failed
 */
export const InboundStatusSchema = z.enum([
    "queued",
    "processing",
    "processed",
    "failed",
]);
export type InboundStatus = z.infer<typeof InboundStatusSchema>;

/**
 * Status of outbound message delivery.
 * pending → sent → delivered | failed
 * (Twilio also sends: queued, sending, undelivered)
 */
export const DeliveryStatusSchema = z.enum([
    "pending",
    "queued",
    "sending",
    "sent",
    "delivered",
    "undelivered",
    "failed",
]);
export type DeliveryStatus = z.infer<typeof DeliveryStatusSchema>;

/**
 * Message channel.
 */
export const MessageChannelSchema = z.enum([
    "whatsapp",
    "sms",
    "app",
]);
export type MessageChannel = z.infer<typeof MessageChannelSchema>;

/**
 * Correlation type - what kind of entity this message relates to.
 */
export const CorrelationTypeSchema = z.enum([
    "thread",       // General conversation thread
    "job",          // Job dispatch
    "request",      // Service/food request
    "taxi",         // Taxi request
    "vendor",       // Vendor reply (food_orders, service_requests)
    "ops",          // Business ops
    "unresolved",   // Could not determine correlation
]);
export type CorrelationType = z.infer<typeof CorrelationTypeSchema>;

/**
 * Inbound route decision.
 */
export const InboundRouteSchema = z.enum([
    "consumer",     // Route to Merve agent
    "business_ops", // Route to business ops handler
    "driver",       // Route to taxi driver handler
]);
export type InboundRoute = z.infer<typeof InboundRouteSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// INBOUND WHATSAPP PAYLOAD (normalized Twilio payload)
// ─────────────────────────────────────────────────────────────────────────────

export const LocationPayloadSchema = z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional(),
    label: z.string().optional(),
});
export type LocationPayload = z.infer<typeof LocationPayloadSchema>;

export const InboundWhatsAppPayloadSchema = z.object({
    messageId: z.string().min(1),           // Twilio MessageSid
    fromE164: z.string().min(1),            // E.164 phone number
    toE164: z.string().optional(),          // E.164 phone number
    text: z.string().optional(),            // Message body
    mediaUrls: z.array(z.string()).default([]),
    location: LocationPayloadSchema.optional(),
});
export type InboundWhatsAppPayload = z.infer<typeof InboundWhatsAppPayloadSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// INBOUND RECEIPT (stored in whatsappInbound/{messageSid})
// ─────────────────────────────────────────────────────────────────────────────

export const InboundReceiptSchema = z.object({
    messageSid: z.string().min(1),
    fromE164: z.string().min(1),
    toE164: z.string().optional(),
    body: z.string(),
    mediaUrls: z.array(z.string()).optional(),
    location: LocationPayloadSchema.optional(),
    receivedAt: z.string(),                 // ISO string (transport-safe)
    status: InboundStatusSchema,
    attempts: z.number().default(0),
    lastError: z.string().optional(),
    // Populated after processing
    threadId: z.string().optional(),
    route: InboundRouteSchema.optional(),
    processedAt: z.string().optional(),     // ISO string
});
export type InboundReceipt = z.infer<typeof InboundReceiptSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// OUTBOUND MESSAGE (stored in whatsappOutbound/{id})
// ─────────────────────────────────────────────────────────────────────────────

export const OutboundMessageSchema = z.object({
    id: z.string().min(1),
    idempotencyKey: z.string().min(1),
    channel: MessageChannelSchema,
    fromE164: z.string().min(1),
    toE164: z.string().min(1),
    body: z.string().min(1),
    templateKey: z.string().optional(),      // If using a template
    status: DeliveryStatusSchema,
    twilioSid: z.string().optional(),        // Populated after send
    errorCode: z.string().optional(),
    errorMessage: z.string().optional(),
    // Correlation
    correlationId: z.string().optional(),    // threadId, jobId, requestId, etc.
    correlationType: CorrelationTypeSchema.optional(),
    // Timestamps (ISO strings for transport safety)
    createdAt: z.string(),
    sentAt: z.string().optional(),
    deliveredAt: z.string().optional(),
    failedAt: z.string().optional(),
});
export type OutboundMessage = z.infer<typeof OutboundMessageSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE CORRELATION (stored in messageCorrelation/{id})
// ─────────────────────────────────────────────────────────────────────────────

export const MessageCorrelationSchema = z.object({
    id: z.string().min(1),
    channel: MessageChannelSchema,
    fromE164: z.string().min(1),
    toE164: z.string().optional(),
    direction: z.enum(["inbound", "outbound"]),
    messageSid: z.string().optional(),           // For inbound
    outboundMessageId: z.string().optional(),    // For outbound
    // Correlation targets (at least one should be set)
    threadId: z.string().optional(),
    jobId: z.string().optional(),
    requestId: z.string().optional(),
    taxiRequestId: z.string().optional(),
    providerId: z.string().optional(),
    listingId: z.string().optional(),
    marketId: z.string().optional(),
    correlationType: CorrelationTypeSchema,
    // Timestamps
    createdAt: z.string(),
});
export type MessageCorrelation = z.infer<typeof MessageCorrelationSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// INPUT SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const CreateInboundReceiptInputSchema = z.object({
    messageSid: z.string().min(1),
    fromE164: z.string().min(1),
    toE164: z.string().optional(),
    body: z.string(),
    mediaUrls: z.array(z.string()).optional(),
    location: LocationPayloadSchema.optional(),
});
export type CreateInboundReceiptInput = z.infer<typeof CreateInboundReceiptInputSchema>;

export const SendMessageInputSchema = z.object({
    to: z.string().min(1),                       // E.164 phone number
    body: z.string().min(1),
    templateKey: z.string().optional(),
    correlationId: z.string().optional(),
    correlationType: CorrelationTypeSchema.optional(),
    idempotencyKey: z.string().optional(),       // If not provided, derived
});
export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;

export const StatusCallbackInputSchema = z.object({
    MessageSid: z.string().min(1),
    MessageStatus: z.string().min(1),
    To: z.string().optional(),
    From: z.string().optional(),
    ErrorCode: z.string().optional(),
    ErrorMessage: z.string().optional(),
});
export type StatusCallbackInput = z.infer<typeof StatusCallbackInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive idempotency key for outbound messages.
 * Uses channel + to + correlationId + templateKey + hour bucket.
 */
export function deriveOutboundIdempotencyKey(
    to: string,
    correlationId: string | undefined,
    templateKey: string | undefined
): string {
    const hourBucket = Math.floor(Date.now() / (1000 * 60 * 60)); // 1-hour buckets
    const parts = [
        "whatsapp",
        to.replace(/\+/g, ""),
        correlationId || "general",
        templateKey || "freeform",
        String(hourBucket),
    ];
    return parts.join(":");
}

/**
 * Map Twilio status to our DeliveryStatus.
 */
export function mapTwilioStatus(twilioStatus: string): DeliveryStatus {
    switch (twilioStatus.toLowerCase()) {
        case "queued":
            return "queued";
        case "sending":
            return "sending";
        case "sent":
            return "sent";
        case "delivered":
            return "delivered";
        case "undelivered":
            return "undelivered";
        case "failed":
            return "failed";
        default:
            return "pending";
    }
}

/**
 * Check if status is terminal (no more updates expected).
 */
export function isTerminalStatus(status: DeliveryStatus): boolean {
    return status === "delivered" || status === "failed" || status === "undelivered";
}
