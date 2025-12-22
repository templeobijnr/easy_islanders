"use strict";
/**
 * Public Chat Routes
 *
 * Endpoints for public visitors chatting with a business's AI agent.
 * Routes are thin: apply middleware → call controller.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicChatRoutes = void 0;
const express_1 = require("express");
const auth_anon_1 = require("../middleware/auth-anon");
const public_chat_controller_1 = require("../controllers/public-chat.controller");
const router = (0, express_1.Router)();
exports.publicChatRoutes = router;
// All public chat routes require some form of auth (anon or full)
router.use(auth_anon_1.requireAuth);
// Session management
router.post('/session/create', public_chat_controller_1.createSession);
router.post('/message/send', public_chat_controller_1.sendMessage);
// Lead capture
router.post('/lead/create', public_chat_controller_1.createLead);
//# sourceMappingURL=public-chat.routes.js.map