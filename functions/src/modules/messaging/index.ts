/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MESSAGING MODULE — INDEX
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Re-exports for the Messaging module.
 * No wildcard exports.
 */

// Schemas & Types
export {
    InboundStatusSchema,
    DeliveryStatusSchema,
    MessageChannelSchema,
    CorrelationTypeSchema,
    InboundRouteSchema,
    LocationPayloadSchema,
    InboundWhatsAppPayloadSchema,
    InboundReceiptSchema,
    OutboundMessageSchema,
    MessageCorrelationSchema,
    CreateInboundReceiptInputSchema,
    SendMessageInputSchema,
    StatusCallbackInputSchema,
    deriveOutboundIdempotencyKey,
    mapTwilioStatus,
    isTerminalStatus,
} from "./messaging.schema";

export type {
    InboundStatus,
    DeliveryStatus,
    MessageChannel,
    CorrelationType,
    InboundRoute,
    LocationPayload,
    InboundWhatsAppPayload,
    InboundReceipt,
    OutboundMessage,
    MessageCorrelation,
    CreateInboundReceiptInput,
    SendMessageInput,
    StatusCallbackInput,
} from "./messaging.schema";

// Service (internal use)
export { MessagingService } from "./messaging.service";

// Controller (internal use)
export { MessagingController } from "./messaging.controller";

// Cloud Functions (exported to index.ts)
export {
    twilioInboundWebhook,
    twilioStatusWebhook,
    processWhatsAppInbound,
} from "./messaging.functions";
