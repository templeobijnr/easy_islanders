"use strict";
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
exports.CANARY_CONFIG = void 0;
exports.registerCanaryTest = registerCanaryTest;
exports.runCanaryTests = runCanaryTests;
exports.allCanariesPassed = allCanariesPassed;
exports.getCanarySummary = getCanarySummary;
const logger = __importStar(require("firebase-functions/logger"));
/**
 * Canary test configuration.
 */
exports.CANARY_CONFIG = {
    /** Test merchant ID for canary */
    TEST_MERCHANT_ID: 'canary-test-merchant',
    /** Test user ID for canary */
    TEST_USER_ID: 'canary-test-user',
    /** Timeout for canary operations (ms) */
    TIMEOUT_MS: 30000,
    /** Deploy version header */
    VERSION_HEADER: 'X-Deploy-Version',
};
/**
 * Registry of canary tests.
 */
const canaryTests = [];
/**
 * Registers a canary test.
 * Call this during initialization to add tests.
 */
function registerCanaryTest(test) {
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
async function runCanaryTests(deployVersion, traceId) {
    const results = [];
    const testTraceId = traceId || `canary-${Date.now()}`;
    logger.info('Canary: Starting test suite', {
        deployVersion,
        traceId: testTraceId,
        testCount: canaryTests.length,
    });
    for (const test of canaryTests) {
        const startTime = Date.now();
        let result;
        try {
            await Promise.race([
                test.run(testTraceId),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Canary test timeout')), exports.CANARY_CONFIG.TIMEOUT_MS)),
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
        }
        catch (error) {
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
    }
    else {
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
function allCanariesPassed(results) {
    return results.length > 0 && results.every((r) => r.success);
}
/**
 * Gets a summary of canary results for alerting.
 */
function getCanarySummary(results) {
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
    run: async (traceId) => {
        logger.info('Canary: Running health check', { traceId });
        // This test always passes - it's a sanity check that the function deployed
    },
});
/**
 * Database connectivity canary.
 */
registerCanaryTest({
    name: 'db-connectivity',
    run: async (traceId) => {
        // Import dynamically to avoid circular deps
        const { db } = await Promise.resolve().then(() => __importStar(require('../config/firebase')));
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
//# sourceMappingURL=canary.service.js.map