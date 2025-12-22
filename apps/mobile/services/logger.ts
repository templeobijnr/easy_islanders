/**
 * Mobile Logger Service
 *
 * Structured logging for mobile app with traceId correlation.
 * All logs are JSON-formatted for observability.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Log levels.
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Structured log context.
 */
interface LogContext {
    component: string;
    event: string;
    traceId?: string;
    jobId?: string;
    actionId?: string;
    requestId?: string;
    userId?: string;
    [key: string]: unknown;
}

/**
 * Current trace ID for the session.
 */
let sessionTraceId: string = generateTraceId();

/**
 * Generates a new trace ID.
 */
function generateTraceId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 11);
    return `mob-${timestamp}-${random}`;
}

/**
 * Gets the current session trace ID.
 */
export function getSessionTraceId(): string {
    return sessionTraceId;
}

/**
 * Sets a new session trace ID.
 */
export function setSessionTraceId(traceId: string): void {
    sessionTraceId = traceId;
}

/**
 * Formats a log entry as structured JSON.
 */
function formatLog(level: LogLevel, context: LogContext): string {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        platform: Platform.OS,
        sessionTraceId,
        ...context,
    };

    return JSON.stringify(entry);
}

/**
 * Writes a log entry.
 */
function writeLog(level: LogLevel, context: LogContext): void {
    const formatted = formatLog(level, context);

    switch (level) {
        case 'debug':
            if (__DEV__) console.log(formatted);
            break;
        case 'info':
            console.log(formatted);
            break;
        case 'warn':
            console.warn(formatted);
            break;
        case 'error':
            console.error(formatted);
            break;
    }

    // In production, also queue for upload (not implemented here)
}

/**
 * Structured logger instance.
 */
export const logger = {
    debug: (message: string, context: LogContext) =>
        writeLog('debug', { message, ...context }),

    info: (message: string, context: LogContext) =>
        writeLog('info', { message, ...context }),

    warn: (message: string, context: LogContext) =>
        writeLog('warn', { message, ...context }),

    error: (message: string, context: LogContext) =>
        writeLog('error', { message, ...context }),
};
