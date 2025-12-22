"use strict";
/**
 * ThreadId Service Unit Tests
 *
 * Tests that computeThreadId() is deterministic and produces unique IDs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const threadId_service_1 = require("./threadId.service");
describe('ThreadId Service', () => {
    describe('computeThreadId', () => {
        it('should produce identical IDs for same inputs (deterministic)', () => {
            const id1 = (0, threadId_service_1.computeThreadId)({ threadType: 'general', actorId: 'user-123' });
            const id2 = (0, threadId_service_1.computeThreadId)({ threadType: 'general', actorId: 'user-123' });
            expect(id1).toBe(id2);
        });
        it('should produce different IDs for different actorIds', () => {
            const id1 = (0, threadId_service_1.computeThreadId)({ threadType: 'general', actorId: 'user-123' });
            const id2 = (0, threadId_service_1.computeThreadId)({ threadType: 'general', actorId: 'user-456' });
            expect(id1).not.toBe(id2);
        });
        it('should produce different IDs for different thread types', () => {
            const id1 = (0, threadId_service_1.computeThreadId)({ threadType: 'general', actorId: 'user-123' });
            const id2 = (0, threadId_service_1.computeThreadId)({ threadType: 'dispatch', actorId: 'user-123' });
            expect(id1).not.toBe(id2);
        });
        it('should include correct prefix for each thread type', () => {
            expect((0, threadId_service_1.computeThreadId)({ threadType: 'general', actorId: 'x' })).toMatch(/^gen_/);
            expect((0, threadId_service_1.computeThreadId)({ threadType: 'business_public', actorId: 'x', businessId: 'biz' })).toMatch(/^bpub_/);
            expect((0, threadId_service_1.computeThreadId)({ threadType: 'business_ops', actorId: 'x', businessId: 'biz' })).toMatch(/^bops_/);
            expect((0, threadId_service_1.computeThreadId)({ threadType: 'dispatch', actorId: 'x' })).toMatch(/^disp_/);
        });
        it('should require businessId for business_public thread type', () => {
            expect(() => (0, threadId_service_1.computeThreadId)({ threadType: 'business_public', actorId: 'x' }))
                .toThrow("businessId is required for threadType 'business_public'");
        });
        it('should require businessId for business_ops thread type', () => {
            expect(() => (0, threadId_service_1.computeThreadId)({ threadType: 'business_ops', actorId: 'x' }))
                .toThrow("businessId is required for threadType 'business_ops'");
        });
        it('should NOT require businessId for dispatch (defaults to global)', () => {
            const id = (0, threadId_service_1.computeThreadId)({ threadType: 'dispatch', actorId: 'driver-1' });
            expect(id).toMatch(/^disp_/);
        });
        it('should produce different IDs for dispatch with different businessIds', () => {
            const id1 = (0, threadId_service_1.computeThreadId)({ threadType: 'dispatch', actorId: 'driver-1', businessId: 'fleet-a' });
            const id2 = (0, threadId_service_1.computeThreadId)({ threadType: 'dispatch', actorId: 'driver-1', businessId: 'fleet-b' });
            expect(id1).not.toBe(id2);
        });
        it('should produce same businessId + actorId → same thread for ops', () => {
            const id1 = (0, threadId_service_1.computeThreadId)({ threadType: 'business_ops', actorId: 'staff-1', businessId: 'biz-x' });
            const id2 = (0, threadId_service_1.computeThreadId)({ threadType: 'business_ops', actorId: 'staff-1', businessId: 'biz-x' });
            expect(id1).toBe(id2);
        });
    });
    describe('generateMessageId', () => {
        it('should produce unique IDs on each call', () => {
            const ids = new Set();
            for (let i = 0; i < 100; i++) {
                ids.add((0, threadId_service_1.generateMessageId)());
            }
            expect(ids.size).toBe(100);
        });
        it('should have msg_ prefix', () => {
            expect((0, threadId_service_1.generateMessageId)()).toMatch(/^msg_/);
        });
    });
});
//# sourceMappingURL=threadId.service.test.js.map