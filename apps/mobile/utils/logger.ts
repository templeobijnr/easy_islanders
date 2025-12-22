/**
 * Simple logger wrapper for mobile app
 */
export const logger = {
    log: (...args: any[]) => {
        if (__DEV__) {
            console.log('[EI]', ...args);
        }
    },
    warn: (...args: any[]) => {
        if (__DEV__) {
            console.warn('[EI]', ...args);
        }
    },
    error: (...args: any[]) => {
        console.error('[EI]', ...args);
    },
    debug: (...args: any[]) => {
        if (__DEV__) {
            console.debug('[EI]', ...args);
        }
    },
};
