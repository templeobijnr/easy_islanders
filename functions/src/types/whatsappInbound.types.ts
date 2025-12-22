/**
 * WhatsApp Inbound Types
 * 
 * Receipt record for reliable inbound message processing.
 * Enables fast webhook ACK + async processing with exactly-once semantics.
 */

import { Timestamp } from 'firebase-admin/firestore';

export type InboundStatus = 'queued' | 'processing' | 'processed' | 'failed';
export type InboundRoute = 'consumer' | 'business_ops' | 'driver';

/**
 * WhatsApp inbound receipt: whatsappInbound/{messageSid}
 * 
 * Backbone for retry-safety + observability.
 */
export interface WhatsAppInboundReceipt {
    messageSid: string;
    fromE164: string;
    toE164?: string;
    body: string;
    mediaUrls?: string[];
    location?: { lat: number; lng: number; address?: string; label?: string };
    receivedAt: Timestamp;

    status: InboundStatus;
    attempts: number;
    lastError?: string;

    // Populated after processing
    threadId?: string;
    route?: InboundRoute;
    processedAt?: Timestamp;
}

/**
 * Input for creating a receipt.
 */
export interface CreateReceiptInput {
    messageSid: string;
    fromE164: string;
    toE164?: string;
    body: string;
    mediaUrls?: string[];
    location?: { lat: number; lng: number; address?: string; label?: string };
}

/**
 * Result of processing for marking complete.
 */
export interface ProcessingResult {
    threadId: string;
    route: InboundRoute;
}
