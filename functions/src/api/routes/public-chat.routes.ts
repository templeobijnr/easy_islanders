/**
 * Public Chat Routes
 * 
 * Endpoints for public visitors chatting with a business's AI agent.
 * Routes are thin: apply middleware → call controller.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth-anon';
import {
    createSession,
    sendMessage,
    createLead
} from '../controllers/public-chat.controller';

const router = Router();

// All public chat routes require some form of auth (anon or full)
router.use(requireAuth);

// Session management
router.post('/session/create', createSession);
router.post('/message/send', sendMessage);

// Lead capture
router.post('/lead/create', createLead);

export { router as publicChatRoutes };
