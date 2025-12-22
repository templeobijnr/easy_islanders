"use strict";
/**
 * Twilio Webhook Signature Validation Middleware (SEC-03)
 *
 * Validates X-Twilio-Signature to authenticate webhook requests.
 *
 * INVARIANTS:
 * - Missing/invalid signature = 401 Unauthorized (fail closed).
 * - Replay protection: messageSid stored in processed_messages/{sid} with 24h TTL.
 * - All requests logged with traceId, messageSid, from.
 *
 * @see Living Document Section 17.2.4 for invariants.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.twilioSignatureMiddleware = twilioSignatureMiddleware;
const logger = __importStar(require("firebase-functions/logger"));
const twilio_1 = __importDefault(require("twilio"));
const firebase_1 = require("../config/firebase");
const traceId_middleware_1 = require("./traceId.middleware");
/**
 * Collection for replay protection.
 */
const PROCESSED_MESSAGES_COLLECTION = 'processed_messages';
/**
 * TTL for processed messages (24 hours in ms).
 */
const MESSAGE_TTL_MS = 24 * 60 * 60 * 1000;
/**
 * Gets the Twilio Auth Token from environment.
 */
function getAuthToken() {
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!token) {
        throw new Error('TWILIO_AUTH_TOKEN not configured');
    }
    return token;
}
/**
 * Extracts message SID from request body.
 */
function getMessageSid(body) {
    return body.MessageSid || body.SmsSid || null;
}
/**
 * Checks if a message has already been processed (replay protection).
 */
async function isReplay(messageSid) {
    var _a, _b;
    try {
        const doc = await firebase_1.db
            .collection(PROCESSED_MESSAGES_COLLECTION)
            .doc(messageSid)
            .get();
        if (doc.exists) {
            const data = doc.data();
            const processedAt = ((_b = (_a = data === null || data === void 0 ? void 0 : data.processedAt) === null || _a === void 0 ? void 0 : _a.toMillis) === null || _b === void 0 ? void 0 : _b.call(_a)) || 0;
            const now = Date.now();
            // Check if within TTL
            if (now - processedAt < MESSAGE_TTL_MS) {
                return true;
            }
        }
        return false;
    }
    catch (error) {
        // Fail open for Firestore errors (log + allow)
        logger.warn('Twilio: Replay check failed, allowing request', {
            component: 'twilioSignature',
            event: 'replay_check_failed',
            messageSid,
            error: String(error),
        });
        return false;
    }
}
/**
 * Records a processed message for replay protection.
 */
async function recordProcessed(messageSid, traceId) {
    try {
        await firebase_1.db.collection(PROCESSED_MESSAGES_COLLECTION).doc(messageSid).set({
            messageSid,
            traceId,
            processedAt: new Date(),
            expiresAt: new Date(Date.now() + MESSAGE_TTL_MS),
        });
    }
    catch (error) {
        // Log but don't fail the request
        logger.warn('Twilio: Failed to record processed message', {
            component: 'twilioSignature',
            event: 'record_failed',
            messageSid,
            error: String(error),
        });
    }
}
/**
 * Express middleware that validates Twilio webhook signatures.
 * Use on all Twilio webhook endpoints.
 */
function twilioSignatureMiddleware(req, res, next) {
    var _a;
    const traceId = (0, traceId_middleware_1.getTraceId)(req);
    const signature = req.get('X-Twilio-Signature');
    const messageSid = getMessageSid(req.body) || 'unknown';
    const from = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.From) || 'unknown';
    // Log incoming webhook
    logger.info('Twilio: Webhook received', {
        component: 'twilioSignature',
        event: 'webhook_received',
        traceId,
        messageSid,
        from,
        hasSignature: !!signature,
    });
    // Check for missing signature
    if (!signature) {
        logger.error('Twilio: Missing signature - REJECTED', {
            component: 'twilioSignature',
            event: 'signature_missing',
            traceId,
            messageSid,
            from,
        });
        res.status(401).json({
            success: false,
            error: 'Missing Twilio signature',
            code: 'MISSING_SIGNATURE',
            traceId,
        });
        return;
    }
    // Construct URL for validation
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host');
    const url = `${protocol}://${host}${req.originalUrl}`;
    // Validate signature
    let isValid;
    try {
        const authToken = getAuthToken();
        isValid = twilio_1.default.validateRequest(authToken, signature, url, req.body);
    }
    catch (error) {
        logger.error('Twilio: Signature validation error', {
            component: 'twilioSignature',
            event: 'validation_error',
            traceId,
            messageSid,
            error: String(error),
        });
        res.status(500).json({
            success: false,
            error: 'Signature validation failed',
            code: 'VALIDATION_ERROR',
            traceId,
        });
        return;
    }
    if (!isValid) {
        logger.error('Twilio: Invalid signature - REJECTED', {
            component: 'twilioSignature',
            event: 'signature_invalid',
            traceId,
            messageSid,
            from,
        });
        res.status(401).json({
            success: false,
            error: 'Invalid Twilio signature',
            code: 'INVALID_SIGNATURE',
            traceId,
        });
        return;
    }
    // Check for replay
    isReplay(messageSid)
        .then((isReplayMessage) => {
        if (isReplayMessage) {
            logger.warn('Twilio: Replay detected - REJECTED', {
                component: 'twilioSignature',
                event: 'replay_detected',
                traceId,
                messageSid,
                from,
            });
            res.status(200).json({
                success: true,
                message: 'Already processed',
                code: 'REPLAY',
                traceId,
            });
            return;
        }
        // Record as processed
        recordProcessed(messageSid, traceId);
        logger.info('Twilio: Webhook authenticated', {
            component: 'twilioSignature',
            event: 'authenticated',
            traceId,
            messageSid,
            from,
        });
        next();
    })
        .catch((error) => {
        logger.error('Twilio: Async validation error', {
            component: 'twilioSignature',
            event: 'async_error',
            traceId,
            error: String(error),
        });
        // Fail closed
        res.status(500).json({
            success: false,
            error: 'Internal error',
            code: 'INTERNAL_ERROR',
            traceId,
        });
    });
}
//# sourceMappingURL=twilio.signature.middleware.js.map