/**
 * Atomic Dispatch Guard (CASC-01B)
 *
 * Ensures job status update + dispatch send is transactionally safe.
 *
 * INVARIANTS:
 * - Dispatch SID (evidence) persisted BEFORE status = 'confirmed'.
 * - Failed dispatch = status remains 'dispatched' (not confirmed).
 * - Idempotent: re-dispatch with same SID is a no-op.
 * - All dispatch attempts logged with traceId, jobId, twilioSid.
 *
 * @see Living Document Section 17.2.4 for invariants.
 */

import * as logger from 'firebase-functions/logger';
import { db } from '../config/firebase';
import { casUpdateStatus, CASError } from './casConfirmation';

/**
 * Dispatch evidence structure.
 */
export interface DispatchEvidence {
    twilioSid: string;
    dispatchedAt: Date;
    merchantPhone: string;
    messageBody: string;
    traceId: string;
}

/**
 * Dispatch result.
 */
export interface DispatchResult {
    success: boolean;
    jobId: string;
    twilioSid?: string;
    error?: string;
}

/**
 * Records dispatch evidence for a job.
 * Call this AFTER successful Twilio send, BEFORE confirming.
 */
export async function recordDispatchEvidence(
    jobId: string,
    evidence: DispatchEvidence
): Promise<void> {
    const { traceId, twilioSid } = evidence;

    logger.info('AtomicDispatch: Recording evidence', {
        component: 'atomicDispatch',
        event: 'evidence_recording',
        traceId,
        jobId,
        twilioSid,
    });

    const jobRef = db.collection('jobs').doc(jobId);

    await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(jobRef);

        if (!doc.exists) {
            throw new Error(`Job ${jobId} not found`);
        }

        const data = doc.data()!;

        // Idempotent check: already has this SID
        if (data.dispatchEvidence?.twilioSid === twilioSid) {
            logger.info('AtomicDispatch: Evidence already recorded (idempotent)', {
                component: 'atomicDispatch',
                event: 'evidence_idempotent',
                traceId,
                jobId,
                twilioSid,
            });
            return;
        }

        transaction.update(jobRef, {
            dispatchEvidence: evidence,
            dispatchSid: twilioSid,
            dispatchedAt: evidence.dispatchedAt,
            updatedAt: new Date(),
        });

        logger.info('AtomicDispatch: Evidence recorded', {
            component: 'atomicDispatch',
            event: 'evidence_recorded',
            traceId,
            jobId,
            twilioSid,
        });
    });
}

/**
 * Confirms a job ONLY if dispatch evidence is present.
 * This is the safe path: evidence → confirm.
 */
export async function confirmWithEvidence(
    jobId: string,
    ctx: { traceId: string }
): Promise<DispatchResult> {
    const { traceId } = ctx;

    logger.info('AtomicDispatch: Confirming with evidence check', {
        component: 'atomicDispatch',
        event: 'confirm_with_evidence',
        traceId,
        jobId,
    });

    const jobRef = db.collection('jobs').doc(jobId);
    const doc = await jobRef.get();

    if (!doc.exists) {
        return {
            success: false,
            jobId,
            error: 'Job not found',
        };
    }

    const data = doc.data()!;

    // Check for dispatch evidence
    if (!data.dispatchEvidence?.twilioSid) {
        logger.error('AtomicDispatch: No dispatch evidence - BLOCKED', {
            component: 'atomicDispatch',
            event: 'no_evidence',
            traceId,
            jobId,
        });

        return {
            success: false,
            jobId,
            error: 'Cannot confirm without dispatch evidence',
        };
    }

    // Use CAS to atomically update status
    try {
        await casUpdateStatus(jobId, 'dispatched', 'confirmed', { traceId });

        logger.info('AtomicDispatch: Job confirmed', {
            component: 'atomicDispatch',
            event: 'confirmed',
            traceId,
            jobId,
            twilioSid: data.dispatchEvidence.twilioSid,
        });

        return {
            success: true,
            jobId,
            twilioSid: data.dispatchEvidence.twilioSid,
        };
    } catch (error) {
        if (error instanceof CASError) {
            logger.warn('AtomicDispatch: CAS failed during confirm', {
                component: 'atomicDispatch',
                event: 'cas_failed',
                traceId,
                jobId,
                error: error.message,
            });

            return {
                success: false,
                jobId,
                error: error.message,
            };
        }

        throw error;
    }
}

/**
 * Atomic dispatch + confirm operation.
 * Combines sending, evidence recording, and confirmation.
 *
 * @param jobId - Job ID.
 * @param sendFn - Function that sends the dispatch and returns Twilio SID.
 * @param ctx - Context.
 */
export async function atomicDispatchAndConfirm(
    jobId: string,
    sendFn: () => Promise<{ twilioSid: string; merchantPhone: string; messageBody: string }>,
    ctx: { traceId: string }
): Promise<DispatchResult> {
    const { traceId } = ctx;

    try {
        // 1. Send dispatch
        logger.info('AtomicDispatch: Sending', {
            component: 'atomicDispatch',
            event: 'sending',
            traceId,
            jobId,
        });

        const { twilioSid, merchantPhone, messageBody } = await sendFn();

        // 2. Record evidence (BEFORE confirm)
        await recordDispatchEvidence(jobId, {
            twilioSid,
            dispatchedAt: new Date(),
            merchantPhone,
            messageBody,
            traceId,
        });

        // 3. Confirm with evidence
        return confirmWithEvidence(jobId, { traceId });
    } catch (error) {
        logger.error('AtomicDispatch: Failed', {
            component: 'atomicDispatch',
            event: 'dispatch_failed',
            traceId,
            jobId,
            error: String(error),
        });

        return {
            success: false,
            jobId,
            error: String(error),
        };
    }
}
