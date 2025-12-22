"use strict";
/**
 * Structured Transaction Logger
 *
 * Provides consistent, searchable logs for transaction lifecycle events.
 * All logs include correlation IDs for tracing.
 *
 * Usage:
 *   logTx(txId, businessId, 'HOLD_CREATED', { lockKey, holdExpiresAt });
 *   logTx(txId, businessId, 'CONFIRM_SUCCESS', { confirmationCode });
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.logTx = logTx;
exports.logSystem = logSystem;
exports.logRequest = logRequest;
const logger = __importStar(require("firebase-functions/logger"));
// ============================================
// TRANSACTION LOGGER
// ============================================
/**
 * Log a transaction lifecycle event with full context.
 * Structured for Cloud Logging queries.
 */
function logTx(txId, businessId, event, data) {
    const logEntry = Object.assign(Object.assign({ severity: getLogSeverity(event), message: `[TX] ${event}`, txId,
        businessId,
        event }, data), { timestamp: new Date().toISOString() });
    if (isErrorEvent(event)) {
        logger.error(logEntry);
    }
    else if (isWarningEvent(event)) {
        logger.warn(logEntry);
    }
    else {
        logger.info(logEntry);
    }
}
/**
 * Log a system-level event (invariant checks, metrics, etc.)
 */
function logSystem(event, data) {
    const logEntry = Object.assign(Object.assign({ severity: event === 'INVARIANT_VIOLATION' ? 'CRITICAL' : 'INFO', message: `[SYSTEM] ${event}`, event }, data), { timestamp: new Date().toISOString() });
    if (event === 'INVARIANT_VIOLATION') {
        logger.error(logEntry);
    }
    else {
        logger.info(logEntry);
    }
}
/**
 * Log a request with correlation ID for tracing.
 */
function logRequest(requestId, channel, event, data) {
    logger.info(Object.assign(Object.assign({ severity: 'INFO', message: `[REQUEST] ${event}`, requestId,
        channel,
        event }, data), { timestamp: new Date().toISOString() }));
}
// ============================================
// HELPERS
// ============================================
function getLogSeverity(event) {
    if (isErrorEvent(event))
        return 'ERROR';
    if (isWarningEvent(event))
        return 'WARNING';
    return 'INFO';
}
function isErrorEvent(event) {
    return [
        'HOLD_FAILED',
        'CONFIRM_FAILED',
        'RELEASE_FAILED',
        'NOTIFICATION_FAILED',
    ].includes(event);
}
function isWarningEvent(event) {
    return [
        'EXPIRED',
        'GATE_EXPIRED',
        'NOTIFICATION_SKIPPED',
    ].includes(event);
}
//# sourceMappingURL=txLogger.js.map