"use strict";
/**
 * Circuit Breaker Middleware Tests (CASC-03B)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const circuitBreaker_middleware_1 = require("../circuitBreaker.middleware");
(0, vitest_1.describe)('circuitBreaker.middleware', () => {
    (0, vitest_1.beforeEach)(() => {
        (0, circuitBreaker_middleware_1.clearCircuitState)();
    });
    (0, vitest_1.describe)('recordRequest', () => {
        (0, vitest_1.it)('should start with CLOSED state', () => {
            const state = (0, circuitBreaker_middleware_1.getCircuitState)();
            (0, vitest_1.expect)(state.state).toBe('CLOSED');
            (0, vitest_1.expect)(state.errorRate).toBe(0);
        });
        (0, vitest_1.it)('should track successful requests', () => {
            (0, circuitBreaker_middleware_1.recordRequest)(true);
            (0, circuitBreaker_middleware_1.recordRequest)(true);
            (0, circuitBreaker_middleware_1.recordRequest)(true);
            const state = (0, circuitBreaker_middleware_1.getCircuitState)();
            (0, vitest_1.expect)(state.state).toBe('CLOSED');
            (0, vitest_1.expect)(state.errorRate).toBe(0);
        });
        (0, vitest_1.it)('should track failed requests', () => {
            (0, circuitBreaker_middleware_1.recordRequest)(false);
            (0, circuitBreaker_middleware_1.recordRequest)(false);
            (0, circuitBreaker_middleware_1.recordRequest)(false);
            const state = (0, circuitBreaker_middleware_1.getCircuitState)();
            (0, vitest_1.expect)(state.errorRate).toBe(1); // 100% error rate
        });
        (0, vitest_1.it)('should calculate mixed error rate', () => {
            // 5 success + 5 failure = 50% error rate
            for (let i = 0; i < 5; i++)
                (0, circuitBreaker_middleware_1.recordRequest)(true);
            for (let i = 0; i < 5; i++)
                (0, circuitBreaker_middleware_1.recordRequest)(false);
            const state = (0, circuitBreaker_middleware_1.getCircuitState)();
            (0, vitest_1.expect)(state.errorRate).toBe(0.5);
        });
    });
    (0, vitest_1.describe)('circuit state transitions', () => {
        (0, vitest_1.it)('should NOT open circuit below minimum requests', () => {
            // 5 failures but less than MIN_REQUESTS (10)
            for (let i = 0; i < 5; i++)
                (0, circuitBreaker_middleware_1.recordRequest)(false);
            const state = (0, circuitBreaker_middleware_1.getCircuitState)();
            (0, vitest_1.expect)(state.state).toBe('CLOSED');
        });
        (0, vitest_1.it)('should OPEN circuit when threshold exceeded', () => {
            // 10+ requests with > 50% error rate
            for (let i = 0; i < 4; i++)
                (0, circuitBreaker_middleware_1.recordRequest)(true);
            for (let i = 0; i < 8; i++)
                (0, circuitBreaker_middleware_1.recordRequest)(false);
            const state = (0, circuitBreaker_middleware_1.getCircuitState)();
            (0, vitest_1.expect)(state.state).toBe('OPEN');
            (0, vitest_1.expect)(state.openedAt).not.toBeNull();
        });
    });
    (0, vitest_1.describe)('forceCloseCircuit', () => {
        (0, vitest_1.it)('should force close an open circuit', () => {
            // Open the circuit
            for (let i = 0; i < 4; i++)
                (0, circuitBreaker_middleware_1.recordRequest)(true);
            for (let i = 0; i < 8; i++)
                (0, circuitBreaker_middleware_1.recordRequest)(false);
            (0, vitest_1.expect)((0, circuitBreaker_middleware_1.getCircuitState)().state).toBe('OPEN');
            // Force close
            (0, circuitBreaker_middleware_1.forceCloseCircuit)();
            (0, vitest_1.expect)((0, circuitBreaker_middleware_1.getCircuitState)().state).toBe('CLOSED');
            (0, vitest_1.expect)((0, circuitBreaker_middleware_1.getCircuitState)().openedAt).toBeNull();
        });
    });
    (0, vitest_1.describe)('clearCircuitState', () => {
        (0, vitest_1.it)('should reset all state', () => {
            // Add some state
            for (let i = 0; i < 10; i++)
                (0, circuitBreaker_middleware_1.recordRequest)(false);
            (0, vitest_1.expect)((0, circuitBreaker_middleware_1.getCircuitState)().state).toBe('OPEN');
            // Clear
            (0, circuitBreaker_middleware_1.clearCircuitState)();
            const state = (0, circuitBreaker_middleware_1.getCircuitState)();
            (0, vitest_1.expect)(state.state).toBe('CLOSED');
            (0, vitest_1.expect)(state.errorRate).toBe(0);
        });
    });
});
//# sourceMappingURL=circuitBreaker.middleware.test.js.map