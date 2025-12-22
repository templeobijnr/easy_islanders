import * as logger from 'firebase-functions/logger';
import { getRequestContext } from './request-context';
import { getErrorMessage } from './errors';

function mergeMeta(meta?: Record<string, unknown>): Record<string, unknown> {
    return {
        ...getRequestContext(),
        ...(meta || {})
    };
}

function formatError(err: unknown): Record<string, unknown> {
    if (err instanceof Error) {
        return {
            errorMessage: getErrorMessage(err),
            errorStack: err.stack
        };
    }
    return { error: err };
}

export const log = {
    debug(message: string, meta?: Record<string, unknown>) {
        logger.debug(message, mergeMeta(meta));
    },
    info(message: string, meta?: Record<string, unknown>) {
        logger.info(message, mergeMeta(meta));
    },
    warn(message: string, meta?: Record<string, unknown>) {
        logger.warn(message, mergeMeta(meta));
    },
    error(message: string, err?: unknown, meta?: Record<string, unknown>) {
        logger.error(message, mergeMeta({ ...formatError(err), ...(meta || {}) }));
    }
};

