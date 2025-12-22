/**
 * Transaction Types - Execution Ledger Core Schema
 * 
 * The transaction is the canonical record of all bookings/orders/rentals.
 * Lives at: businesses/{businessId}/transactions/{transactionId}
 * Events at: businesses/{businessId}/transactions/{transactionId}/events/{eventId}
 */

import { Timestamp } from 'firebase-admin/firestore';

// ============================================
// STATUS & TYPE ENUMS
// ============================================

export type TransactionStatus =
    | 'draft'      // Being built, not yet held
    | 'hold'       // Temporarily reserved, awaiting confirmation
    | 'confirmed'  // Committed to ledger
    | 'cancelled'  // Cancelled by user/business/system
    | 'expired'    // Hold expired without confirmation
    | 'failed';    // System failure

export type TransactionType = 'booking' | 'order' | 'rental';

export type Channel =
    | 'app_chat'       // General agent in app
    | 'discover_chat'  // Business agent in Discover
    | 'whatsapp'       // WhatsApp channel
    | 'dashboard'      // Business dashboard
    | 'api';           // Direct API call

export type Currency = 'TRY' | 'EUR' | 'GBP' | 'USD';

// ============================================
// TRANSACTION DOCUMENT
// ============================================

export interface TransactionActor {
    userId?: string;
    phoneE164?: string;
    name?: string;
    email?: string;
}

export interface TransactionLineItem {
    offeringId: string;
    offeringName: string;      // Snapshot at time of transaction
    quantity: number;
    unitPrice: number;         // Snapshot at time of transaction
    subtotal: number;
    options?: Array<{
        name: string;
        value: string;
        priceModifier: number;
    }>;
}

export interface TransactionTimeWindow {
    start: Timestamp;
    end: Timestamp;
    timezone?: string;         // e.g., 'Europe/Istanbul'
}

export interface Transaction {
    id: string;
    businessId: string;

    // Classification
    type: TransactionType;
    status: TransactionStatus;
    channel: Channel;

    // Actor (customer)
    actor: TransactionActor;

    // Content
    lineItems: TransactionLineItem[];

    // Temporal (for bookings/rentals)
    timeWindow?: TransactionTimeWindow;

    // Financial
    currency: Currency;
    subtotal: number;
    fees: number;
    total: number;

    // Hold management
    holdExpiresAt?: Timestamp;
    holdDurationMinutes?: number;

    // Confirmation
    confirmationCode?: string;

    // Session link
    sessionId?: string;

    // Timestamps
    createdAt: Timestamp;
    updatedAt: Timestamp;
    confirmedAt?: Timestamp;
    cancelledAt?: Timestamp;
    expiredAt?: Timestamp;
}

// ============================================
// TRANSACTION EVENTS (Append-Only Audit Trail)
// ============================================

export type TxEventType =
    | 'draft_created'
    | 'hold_created'
    | 'confirmed'
    | 'cancelled'
    | 'expired'
    | 'hold_released'
    | 'failed';

export type TxEventActorType = 'user' | 'business' | 'system' | 'agent';

export interface TxEvent {
    id?: string;
    type: TxEventType;
    actorType: TxEventActorType;
    actorId?: string;
    idempotencyKey?: string;
    createdAt: Timestamp;
    data?: Record<string, any>;
}

// ============================================
// RESOURCE LOCKS
// Lives at: businesses/{businessId}/resourceLocks/{lockKey}
// ============================================

export type LockStatus = 'held' | 'confirmed' | 'released';

export interface ResourceLock {
    lockKey: string;           // e.g., 'table:2025-12-20:19:00'
    transactionId: string;
    status: LockStatus;
    expiresAt?: Timestamp;     // Only when status = 'held'
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// ============================================
// CREATE TRANSACTION PARAMS (Input DTOs)
// ============================================

export interface CreateDraftParams {
    businessId: string;
    type: TransactionType;
    channel: Channel;
    actor: TransactionActor;
    lineItems: TransactionLineItem[];
    timeWindow?: {
        start: Date;
        end: Date;
        timezone?: string;
    };
    currency?: Currency;
    sessionId?: string;
}

export interface CreateHoldParams {
    transactionId: string;
    businessId: string;
    holdDurationMinutes?: number;  // Default: 10
    lockKey: string;               // e.g., 'table:2025-12-20:19:00'
}

export interface ConfirmTransactionParams {
    transactionId: string;
    businessId: string;
    actorType: TxEventActorType;
    actorId?: string;
}

export interface CancelTransactionParams {
    transactionId: string;
    businessId: string;
    reason: string;
    actorType: TxEventActorType;
    actorId?: string;
}

// ============================================
// RESULT TYPES
// ============================================

export interface CreateDraftResult {
    success: boolean;
    transaction?: Transaction;
    error?: string;
}

export interface CreateHoldResult {
    success: boolean;
    alreadyProcessed?: boolean;
    transaction?: Transaction;
    holdExpiresAt?: Date;
    error?: string;
    errorCode?: 'INVALID_STATE' | 'RESOURCE_UNAVAILABLE' | 'TRANSACTION_NOT_FOUND';
}

export interface ConfirmResult {
    success: boolean;
    alreadyProcessed?: boolean;
    confirmationCode?: string;
    transaction?: Transaction;
    error?: string;
    errorCode?: 'INVALID_STATE' | 'HOLD_EXPIRED' | 'TRANSACTION_NOT_FOUND';
}

export interface CancelResult {
    success: boolean;
    alreadyProcessed?: boolean;
    error?: string;
    errorCode?: 'INVALID_STATE' | 'TRANSACTION_NOT_FOUND';
}

// ============================================
// LOCK KEY HELPERS
// ============================================

/**
 * Generate a lock key for restaurant table booking.
 * Format: table:{YYYY-MM-DD}:{HH:MM}
 */
export function generateTableLockKey(date: Date, slotTime: string): string {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    return `table:${dateStr}:${slotTime}`;
}

/**
 * Generate a lock key for a specific offering at a time.
 * Format: {offeringId}:{YYYY-MM-DD}:{HH:MM}
 */
export function generateOfferingLockKey(offeringId: string, date: Date, slotTime: string): string {
    const dateStr = date.toISOString().split('T')[0];
    return `${offeringId}:${dateStr}:${slotTime}`;
}
