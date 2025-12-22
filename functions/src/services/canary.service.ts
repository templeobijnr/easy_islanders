/**
 * Canary Deploy Service (CICD-02)
 *
 * Post-deploy validation to catch runtime failures before full traffic.
 *
 * INVARIANTS:
 * - Canary runs immediately after deploy.
 * - Tests critical path: createJob flow against test merchant.
 * - Failure triggers alert (rollback is manual but documented).
 * - Success logged with deploy version.
 *
 * FAILURE MODE:
 * - Canary failure = P1 alert, immediate rollback recommended.
 * - Never blocks deploy, but alerts loudly.
 *
 * @see Living Document Section 17.2.1 for invariants.
 */

import * as logger from 'firebase-functions/logger';

/**
 * Canary test configuration.
 */
export const CANARY_CONFIG = {
    /** Test merchant ID for canary */
    TEST_MERCHANT_ID: 'canary-test-merchant',
    /** Test user ID for canary */
    TEST_USER_ID: 'canary-test-user',
    /** Timeout for canary operations (ms) */
    TIMEOUT_MS: 30_000,
    /** Deploy version header */
    VERSION_HEADER: 'X-Deploy-Version',
} as const;

/**
 * Result of a canary test.
 */
export interface CanaryResult {
    success: boolean;
    testName: string;
    durationMs: number;
    error?: string;
    deployVersion?: string;
    traceId?: string;
}

/**
 * Canary test definition.
 */
interface CanaryTest {
    name: string;
    run: (traceId: string) => Promise<void>;
}

/**
 * Registry of canary tests.
 */
const canaryTests: CanaryTest[] = [];

/**
 * Registers a canary test.
 * Call this during initialization to add tests.
 */
export function registerCanaryTest(test: CanaryTest): void {
    canaryTests.push(test);
    logger.info('Canary: Test registered', { testName: test.name });
}

/**
 * Runs all registered canary tests.
 *
 * @param deployVersion - The version being deployed.
 * @param traceId - Optional trace ID for correlation.
 * @returns Array of test results.
 */
export async function runCanaryTests(
    deployVersion: string,
    traceId?: string
): Promise<CanaryResult[]> {
    const results: CanaryResult[] = [];
    const testTraceId = traceId || `canary-${Date.now()}`;

    logger.info('Canary: Starting test suite', {
        deployVersion,
        traceId: testTraceId,
        testCount: canaryTests.length,
    });

    for (const test of canaryTests) {
        const startTime = Date.now();
        let result: CanaryResult;

        try {
            await Promise.race([
                test.run(testTraceId),
                new Promise((_, reject) =>
                    setTimeout(
                        () => reject(new Error('Canary test timeout')),
                        CANARY_CONFIG.TIMEOUT_MS
                    )
                ),
            ]);

            result = {
                success: true,
                testName: test.name,
                durationMs: Date.now() - startTime,
                deployVersion,
                traceId: testTraceId,
            };

            logger.info('Canary: Test passed', {
                testName: test.name,
                durationMs: result.durationMs,
                traceId: testTraceId,
            });
        } catch (error) {
            result = {
                success: false,
                testName: test.name,
                durationMs: Date.now() - startTime,
                error: String(error),
                deployVersion,
                traceId: testTraceId,
            };

            logger.error('Canary: Test FAILED', {
                testName: test.name,
                error: String(error),
                durationMs: result.durationMs,
                traceId: testTraceId,
            });
        }

        results.push(result);
    }

    const passCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    if (failCount > 0) {
        logger.error('Canary: SUITE FAILED - ROLLBACK RECOMMENDED', {
            deployVersion,
            traceId: testTraceId,
            passed: passCount,
            failed: failCount,
        });
    } else {
        logger.info('Canary: Suite passed', {
            deployVersion,
            traceId: testTraceId,
            passed: passCount,
        });
    }

    return results;
}

/**
 * Checks if all canary tests passed.
 */
export function allCanariesPassed(results: CanaryResult[]): boolean {
    return results.length > 0 && results.every((r) => r.success);
}

/**
 * Gets a summary of canary results for alerting.
 */
export function getCanarySummary(
    results: CanaryResult[]
): { status: 'PASS' | 'FAIL'; message: string } {
    if (allCanariesPassed(results)) {
        return {
            status: 'PASS',
            message: `All ${results.length} canary tests passed.`,
        };
    }

    const failed = results.filter((r) => !r.success);
    return {
        status: 'FAIL',
        message: `${failed.length}/${results.length} canary tests failed: ${failed.map((r) => r.testName).join(', ')}`,
    };
}

// ============================================
// Default Canary Tests (Register on import)
// ============================================

/**
 * Basic health check canary.
 */
registerCanaryTest({
    name: 'health-check',
    run: async (traceId: string) => {
        logger.info('Canary: Running health check', { traceId });
        // This test always passes - it's a sanity check that the function deployed
    },
});

/**
 * Database connectivity canary.
 */
registerCanaryTest({
    name: 'db-connectivity',
    run: async (traceId: string) => {
        // Import dynamically to avoid circular deps
        const { db } = await import('../config/firebase');

        logger.info('Canary: Testing database connectivity', { traceId });

        // Try to read system config
        const configDoc = await db.collection('system').doc('config').get();

        if (!configDoc.exists) {
            // Create it if missing (first deploy)
            await db.collection('system').doc('config').set({
                maintenance: false,
                createdAt: new Date(),
            });
        }

        logger.info('Canary: Database connectivity verified', { traceId });
    },
});
