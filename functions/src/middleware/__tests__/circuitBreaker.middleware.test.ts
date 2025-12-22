/**
 * Circuit Breaker Middleware Tests (CASC-03B)
 */

import {
    recordRequest,
    getCircuitState,
    forceCloseCircuit,
    clearCircuitState,
} from '../circuitBreaker.middleware';

describe('circuitBreaker.middleware', () => {
    beforeEach(() => {
        clearCircuitState();
    });

    describe('recordRequest', () => {
        it('should start with CLOSED state', () => {
            const state = getCircuitState();

            expect(state.state).toBe('CLOSED');
            expect(state.errorRate).toBe(0);
        });

        it('should track successful requests', () => {
            recordRequest(true);
            recordRequest(true);
            recordRequest(true);

            const state = getCircuitState();

            expect(state.state).toBe('CLOSED');
            expect(state.errorRate).toBe(0);
        });

        it('should track failed requests', () => {
            recordRequest(false);
            recordRequest(false);
            recordRequest(false);

            const state = getCircuitState();

            expect(state.errorRate).toBe(1); // 100% error rate
        });

        it('should calculate mixed error rate', () => {
            // 5 success + 5 failure = 50% error rate
            for (let i = 0; i < 5; i++) recordRequest(true);
            for (let i = 0; i < 5; i++) recordRequest(false);

            const state = getCircuitState();

            expect(state.errorRate).toBe(0.5);
        });
    });

    describe('circuit state transitions', () => {
        it('should NOT open circuit below minimum requests', () => {
            // 5 failures but less than MIN_REQUESTS (10)
            for (let i = 0; i < 5; i++) recordRequest(false);

            const state = getCircuitState();

            expect(state.state).toBe('CLOSED');
        });

        it('should OPEN circuit when threshold exceeded', () => {
            // 10+ requests with > 50% error rate
            for (let i = 0; i < 4; i++) recordRequest(true);
            for (let i = 0; i < 8; i++) recordRequest(false);

            const state = getCircuitState();

            expect(state.state).toBe('OPEN');
            expect(state.openedAt).not.toBeNull();
        });
    });

    describe('forceCloseCircuit', () => {
        it('should force close an open circuit', () => {
            // Open the circuit
            for (let i = 0; i < 4; i++) recordRequest(true);
            for (let i = 0; i < 8; i++) recordRequest(false);

            expect(getCircuitState().state).toBe('OPEN');

            // Force close
            forceCloseCircuit();

            expect(getCircuitState().state).toBe('CLOSED');
            expect(getCircuitState().openedAt).toBeNull();
        });
    });

    describe('clearCircuitState', () => {
        it('should reset all state', () => {
            // Add some state
            for (let i = 0; i < 10; i++) recordRequest(false);

            expect(getCircuitState().state).toBe('OPEN');

            // Clear
            clearCircuitState();

            const state = getCircuitState();
            expect(state.state).toBe('CLOSED');
            expect(state.errorRate).toBe(0);
        });
    });
});
