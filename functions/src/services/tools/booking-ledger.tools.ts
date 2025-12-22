import { getErrorMessage } from '../../utils/errors';
/**
 * Booking Ledger Tools
 * 
 * Transaction-aware booking creation that uses the execution ledger.
 * Creates draft → hold flow; NEVER confirms directly.
 * 
 * Confirmation must come from the confirmation gate in the controller.
 */

import { transactionRepository } from '../../repositories/transaction.repository';
import { listingRepository } from '../../repositories/listing.repository';
import { db } from '../../config/firebase';
import type { Channel, TransactionActor } from '../../types/transaction';
import type { PendingAction } from '../../repositories/chat.repository';

// ============================================
// TYPES
// ============================================

export interface CreateHeldBookingParams {
    // Required - must come from tool args or lookup
    businessId: string;
    offeringId: string;
    offeringName: string;

    // Channel and actor info
    channel: Channel;
    actor: TransactionActor;

    // Booking details
    date: string;        // YYYY-MM-DD
    time: string;        // HH:MM
    partySize?: number;
    notes?: string;

    // Pricing (optional for pilot)
    unitPrice?: number;
    currency?: string;

    // Idempotency
    idempotencyKey?: string;

    // Hold duration (default 10 minutes)
    holdDurationMinutes?: number;

    // Slot duration (configurable, default 15 minutes)
    slotDurationMinutes?: number;
}

export interface HeldBookingResult {
    success: boolean;
    errorCode?: 'ITEM_NOT_FOUND' | 'RESOURCE_UNAVAILABLE' | 'INVALID_PARAMS' | 'INTERNAL_ERROR' | 'BUSINESS_CONTEXT_REQUIRED';
    error?: string;

    // On success
    txId?: string;
    holdExpiresAt?: Date;
    confirmationPrompt?: string;
    pendingAction?: PendingAction;
}

export interface ResolveBusinessResult {
    success: boolean;
    businessId?: string;
    errorCode?: 'BUSINESS_CONTEXT_REQUIRED';
    error?: string;
}

// ============================================
// LOCK KEY DERIVATION (Extensible Format)
// ============================================

/**
 * Canonical lock key format (extensible for capacity tokens later):
 * {businessId}:offering:{offeringId}:{YYYY-MM-DDTHH:MM}
 * 
 * Future capacity token format:
 * {businessId}:offering:{offeringId}:{YYYY-MM-DDTHH:MM}:token:{N}
 * 
 * Semantics: Single-capacity slot locks for pilot.
 * When capacity is added, tokens 1..N can be allocated without migration.
 */
function deriveLockKey(
    businessId: string,
    offeringId: string,
    date: string,
    time: string,
    slotDurationMinutes: number = 15
): string {
    // Normalize time to slot boundaries
    const [hours, mins] = time.split(':').map(Number);
    const normalizedMins = Math.floor(mins / slotDurationMinutes) * slotDurationMinutes;
    const normalizedTime = `${hours.toString().padStart(2, '0')}:${normalizedMins.toString().padStart(2, '0')}`;

    // ISO-like format for start time
    const startTime = `${date}T${normalizedTime}`;

    return `${businessId}:offering:${offeringId}:${startTime}`;
}

// ============================================
// MAIN FUNCTION
// ============================================

/**
 * Create a held booking transaction.
 * 
 * Flow:
 * 1. Validate params
 * 2. Create draft transaction (with actor.phone for notifications)
 * 3. Create hold with lock
 * 4. Return pending action for session storage
 * 
 * DOES NOT CONFIRM - confirmation is a second step via the gate.
 */
export async function createHeldBooking(params: CreateHeldBookingParams): Promise<HeldBookingResult> {
    const {
        businessId,
        offeringId,
        offeringName,
        channel,
        actor,
        date,
        time,
        partySize = 1,
        notes,
        unitPrice = 0,
        currency = 'TRY',
        idempotencyKey,
        holdDurationMinutes = 10,
        slotDurationMinutes = 15,
    } = params;

    // Validate required fields
    if (!businessId || !offeringId || !date || !time) {
        return {
            success: false,
            errorCode: 'INVALID_PARAMS',
            error: 'Missing required fields: businessId, offeringId, date, time',
        };
    }

    try {
        // Parse time window
        const startDateTime = new Date(`${date}T${time}:00`);
        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // +1 hour

        if (isNaN(startDateTime.getTime())) {
            return {
                success: false,
                errorCode: 'INVALID_PARAMS',
                error: `Invalid date/time: ${date} ${time}`,
            };
        }

        // Enrich actor with phone if userId available
        let enrichedActor = { ...actor };
        if (actor.userId && !actor.phoneE164) {
            try {
                const userDoc = await db.collection('users').doc(actor.userId).get();
                const userData = userDoc.data();
                if (userData?.phone || userData?.phoneNumber) {
                    enrichedActor.phoneE164 = userData.phone || userData.phoneNumber;
                }
            } catch (err) {
                console.warn('[BookingLedger] Failed to enrich actor phone:', err);
            }
        }

        // 1. Create draft transaction
        const draftResult = await transactionRepository.createDraft({
            businessId,
            type: 'booking',
            channel,
            actor: enrichedActor,
            lineItems: [{
                offeringId,
                offeringName,
                quantity: partySize,
                unitPrice,
                subtotal: unitPrice * partySize,
            }],
            timeWindow: {
                start: startDateTime,
                end: endDateTime,
            },
            currency: currency as any,
        }, idempotencyKey ? `draft:${idempotencyKey}` : undefined);

        if (!draftResult.success || !draftResult.transaction) {
            return {
                success: false,
                errorCode: 'INTERNAL_ERROR',
                error: 'Failed to create draft transaction',
            };
        }

        const txId = draftResult.transaction.id;

        // 2. Derive extensible lock key
        const lockKey = deriveLockKey(businessId, offeringId, date, time, slotDurationMinutes);

        // 3. Create hold (atomic lock acquisition)
        const holdResult = await transactionRepository.createHold({
            transactionId: txId,
            businessId,
            lockKey,
            holdDurationMinutes,
        }, idempotencyKey ? `hold:${idempotencyKey}` : undefined);

        if (!holdResult.success) {
            // Map error codes
            if (holdResult.errorCode === 'RESOURCE_UNAVAILABLE') {
                return {
                    success: false,
                    errorCode: 'RESOURCE_UNAVAILABLE',
                    error: holdResult.error || 'This time slot is already reserved',
                };
            }
            return {
                success: false,
                errorCode: 'INTERNAL_ERROR',
                error: holdResult.error || 'Failed to create hold',
            };
        }

        // 4. Build confirmation prompt
        const formattedDate = new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
        });
        const summary = `${offeringName} for ${partySize} on ${formattedDate} at ${time}`;
        const confirmationPrompt =
            `I've reserved a slot for you:\n\n` +
            `📍 **${offeringName}**\n` +
            `📅 ${formattedDate} at ${time}\n` +
            `👥 Party of ${partySize}\n` +
            (notes ? `📝 ${notes}\n` : '') +
            `\n⏰ This hold expires in ${holdDurationMinutes} minutes.\n\n` +
            `**Reply YES to confirm or NO to cancel.**`;

        // 5. Build pending action for session
        const pendingAction: PendingAction = {
            kind: 'confirm_transaction',
            businessId,
            txId,
            holdExpiresAt: holdResult.holdExpiresAt!,
            summary,
            expectedUserId: actor.userId!,
            createdAt: new Date(),
        };

        return {
            success: true,
            txId,
            holdExpiresAt: holdResult.holdExpiresAt,
            confirmationPrompt,
            pendingAction,
        };

    } catch (err: unknown) {
        console.error('[BookingLedger] createHeldBooking failed:', err);
        return {
            success: false,
            errorCode: 'INTERNAL_ERROR',
            error: getErrorMessage(err) || 'Internal error',
        };
    }
}

/**
 * Look up businessId from an itemId (listing).
 * FAIL CLOSED: If businessId cannot be determined, returns error.
 * DO NOT silently use itemId as businessId - that creates orphan data.
 */
export async function resolveBusinessId(itemId: string): Promise<ResolveBusinessResult> {
    try {
        const listing = await listingRepository.getById(itemId);
        if (listing) {
            // Try common field names for business reference
            const businessId = (listing as any).businessId
                || (listing as any).ownerId
                || (listing as any).ownerUid;
            if (businessId) {
                return { success: true, businessId };
            }
        }

        // Check if the itemId itself is a business doc
        const businessDoc = await db.collection('businesses').doc(itemId).get();
        if (businessDoc.exists) {
            return { success: true, businessId: itemId };
        }

    } catch (err) {
        console.warn(`[BookingLedger] Failed to lookup businessId for ${itemId}:`, err);
    }

    // FAIL CLOSED: Do not return itemId as fallback
    return {
        success: false,
        errorCode: 'BUSINESS_CONTEXT_REQUIRED',
        error: `Cannot determine business for item ${itemId}. Please select a business first.`,
    };
}
