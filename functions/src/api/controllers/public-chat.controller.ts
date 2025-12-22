/**
 * Public Chat Controller
 * 
 * Handles public visitor chat with business AI agents.
 * Controllers are thin: validate → call service → respond.
 */

import { Request, Response } from 'express';
import { publicChatService } from '../services/public-chat.service';
import { setRequestContext } from '../../utils/request-context';
import { log } from '../../utils/log';

/**
 * POST /v1/public-chat/session/create
 * Create a new chat session for a business.
 */
export async function createSession(req: Request, res: Response): Promise<void> {
    const { businessId } = req.body;
    const user = (req as any).user;
    const isAnonymous = (req as any).isAnonymous ?? true;

    if (!businessId) {
        res.status(400).json({ success: false, error: 'businessId required' });
        return;
    }

    try {
        setRequestContext({ businessId });
        const result = await publicChatService.createChatSession(
            businessId,
            user.uid,
            isAnonymous
        );

        if (!result.success) {
            const statusCode = result.error === 'Business not found' ? 404 : 500;
            res.status(statusCode).json({ success: false, error: result.error });
            return;
        }

        res.json({
            success: true,
            sessionId: result.sessionId,
            greeting: result.greeting
        });

    } catch (error: unknown) {
        log.error('[PublicChatController] createSession error', error);
        res.status(500).json({ success: false, error: 'Failed to create session' });
    }
}

/**
 * POST /v1/public-chat/message/send
 * Send a message in an existing session.
 */
export async function sendMessage(req: Request, res: Response): Promise<void> {
    const { businessId, sessionId, text } = req.body;
    const user = (req as any).user;

    if (!businessId || !sessionId || !text) {
        res.status(400).json({
            success: false,
            error: 'businessId, sessionId, and text required'
        });
        return;
    }

    // Basic input validation
    if (text.length > 2000) {
        res.status(400).json({
            success: false,
            error: 'Message too long (max 2000 characters)'
        });
        return;
    }

    try {
        setRequestContext({ businessId, sessionId });
        const result = await publicChatService.processMessage(
            businessId,
            sessionId,
            user.uid,
            text
        );

        if (!result.success) {
            const statusCode =
                result.error === 'Session not found' ? 404 :
                    result.error === 'Session access denied' ? 403 : 500;
            res.status(statusCode).json({ success: false, error: result.error });
            return;
        }

        res.json({
            success: true,
            text: result.text,
            sources: result.sources.map(s => ({
                sourceName: s.sourceName,
                score: s.score
            })),
            messageCount: result.messageCount,
            limitReached: result.limitReached,
            latencyMs: result.latencyMs
        });

    } catch (error: unknown) {
        log.error('[PublicChatController] sendMessage error', error);
        res.status(500).json({ success: false, error: 'Failed to send message' });
    }
}

/**
 * POST /v1/public-chat/lead/create
 * Capture lead contact information.
 */
export async function createLead(req: Request, res: Response): Promise<void> {
    const { businessId, sessionId, name, phoneE164, email, message } = req.body;
    const user = (req as any).user;

    if (!businessId || !sessionId || !name || !phoneE164) {
        res.status(400).json({
            success: false,
            error: 'businessId, sessionId, name, and phoneE164 required'
        });
        return;
    }

    // Basic phone validation (E.164 format)
    if (!phoneE164.match(/^\+[1-9]\d{6,14}$/)) {
        res.status(400).json({
            success: false,
            error: 'Invalid phone number format (use E.164: +123456789)'
        });
        return;
    }

    try {
        setRequestContext({ businessId, sessionId });
        const result = await publicChatService.captureLead(
            businessId,
            sessionId,
            user.uid,
            { name, phoneE164, email, message }
        );

        if (!result.success) {
            const statusCode =
                result.error === 'Session not found' ? 404 :
                    result.error === 'Session access denied' ? 403 : 500;
            res.status(statusCode).json({ success: false, error: result.error });
            return;
        }

        res.json({
            success: true,
            leadId: result.leadId,
            message: 'Thank you! We will contact you soon.'
        });

    } catch (error: unknown) {
        log.error('[PublicChatController] createLead error', error);
        res.status(500).json({ success: false, error: 'Failed to create lead' });
    }
}
