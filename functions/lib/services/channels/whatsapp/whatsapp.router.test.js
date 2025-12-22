"use strict";
/**
 * WhatsApp Router Unit Tests
 *
 * Tests routing decisions without Firestore emulator.
 * Uses mocked db queries.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const whatsapp_router_1 = require("./whatsapp.router");
const firebase_1 = require("../../../config/firebase");
// Mock Firestore
jest.mock('../../../config/firebase', () => ({
    db: {
        collection: jest.fn(),
    },
}));
const mockDb = firebase_1.db;
// Helper to mock collection queries
function mockCollectionQuery(results) {
    return {
        doc: jest.fn((docId) => ({
            get: jest.fn().mockResolvedValue({
                exists: results.some(r => r.id === docId),
                id: docId,
                data: () => { var _a; return (_a = results.find(r => r.id === docId)) === null || _a === void 0 ? void 0 : _a.data; },
            }),
        })),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
                empty: results.length === 0,
                docs: results.map(r => ({
                    id: r.id,
                    data: () => r.data,
                })),
            }),
        }),
    };
}
describe('WhatsApp Router', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('resolveActorByPhone', () => {
        it('should return null for unknown phone (no collections match)', async () => {
            mockDb.collection.mockImplementation((name) => {
                return mockCollectionQuery([]);
            });
            const actor = await (0, whatsapp_router_1.resolveActorByPhone)('+905551234567');
            expect(actor).toBeNull();
        });
        it('should resolve actor from actors collection (authoritative)', async () => {
            mockDb.collection.mockImplementation((name) => {
                if (name === 'actors') {
                    return mockCollectionQuery([{
                            id: '905551234567',
                            data: {
                                phoneE164: '+905551234567',
                                type: 'consumer',
                                name: 'Test User',
                            },
                        }]);
                }
                return mockCollectionQuery([]);
            });
            const actor = await (0, whatsapp_router_1.resolveActorByPhone)('+905551234567');
            expect(actor).not.toBeNull();
            expect(actor === null || actor === void 0 ? void 0 : actor.type).toBe('consumer');
            expect(actor === null || actor === void 0 ? void 0 : actor.name).toBe('Test User');
        });
        it('should resolve driver from taxi_drivers collection (fallback)', async () => {
            mockDb.collection.mockImplementation((name) => {
                if (name === 'taxi_drivers') {
                    return mockCollectionQuery([{
                            id: 'driver-123',
                            data: {
                                phone: '+905551234567',
                                name: 'Ali Driver',
                                businessId: 'dispatch-fleet-1',
                            },
                        }]);
                }
                return mockCollectionQuery([]);
            });
            const actor = await (0, whatsapp_router_1.resolveActorByPhone)('+905551234567');
            expect(actor).not.toBeNull();
            expect(actor === null || actor === void 0 ? void 0 : actor.type).toBe('driver');
            expect(actor === null || actor === void 0 ? void 0 : actor.businessId).toBe('dispatch-fleet-1');
        });
        it('should resolve business_owner from businesses collection (fallback)', async () => {
            mockDb.collection.mockImplementation((name) => {
                if (name === 'businesses') {
                    return mockCollectionQuery([{
                            id: 'biz-456',
                            data: {
                                phone: '+905551234567',
                                name: 'Sunset Restaurant',
                            },
                        }]);
                }
                return mockCollectionQuery([]);
            });
            const actor = await (0, whatsapp_router_1.resolveActorByPhone)('+905551234567');
            expect(actor).not.toBeNull();
            expect(actor === null || actor === void 0 ? void 0 : actor.type).toBe('business_owner');
            expect(actor === null || actor === void 0 ? void 0 : actor.businessId).toBe('biz-456');
        });
    });
    describe('routeInbound', () => {
        it('should route unknown phone to consumer', async () => {
            mockDb.collection.mockImplementation(() => mockCollectionQuery([]));
            const decision = await (0, whatsapp_router_1.routeInbound)({
                fromE164: '+905559999999',
                text: 'Hello',
            });
            expect(decision.route).toBe('consumer');
            expect(decision.threadType).toBe('general');
        });
        it('should route actor.type=consumer to consumer', async () => {
            mockDb.collection.mockImplementation((name) => {
                if (name === 'actors') {
                    return mockCollectionQuery([{
                            id: '905551234567',
                            data: {
                                phoneE164: '+905551234567',
                                type: 'consumer',
                            },
                        }]);
                }
                return mockCollectionQuery([]);
            });
            const decision = await (0, whatsapp_router_1.routeInbound)({
                fromE164: '+905551234567',
                text: 'Book a restaurant',
            });
            expect(decision.route).toBe('consumer');
            expect(decision.threadType).toBe('general');
        });
        it('should route actor.type=driver to driver/dispatch', async () => {
            mockDb.collection.mockImplementation((name) => {
                if (name === 'taxi_drivers') {
                    return mockCollectionQuery([{
                            id: 'driver-123',
                            data: {
                                phone: '+905551234567',
                                name: 'Ali Driver',
                            },
                        }]);
                }
                return mockCollectionQuery([]);
            });
            const decision = await (0, whatsapp_router_1.routeInbound)({
                fromE164: '+905551234567',
                text: 'I am at pickup',
            });
            expect(decision.route).toBe('driver');
            expect(decision.threadType).toBe('dispatch');
        });
        it('should route actor.type=business_owner with businessId to business_ops', async () => {
            mockDb.collection.mockImplementation((name) => {
                if (name === 'businesses') {
                    return mockCollectionQuery([{
                            id: 'biz-456',
                            data: {
                                phone: '+905551234567',
                                name: 'Sunset Restaurant',
                            },
                        }]);
                }
                return mockCollectionQuery([]);
            });
            const decision = await (0, whatsapp_router_1.routeInbound)({
                fromE164: '+905551234567',
                text: 'YES A1B2',
            });
            expect(decision.route).toBe('business_ops');
            expect(decision.threadType).toBe('business_ops');
            expect(decision.businessId).toBe('biz-456');
        });
        it('should route business_staff with businessId to business_ops', async () => {
            mockDb.collection.mockImplementation((name) => {
                if (name === 'actors') {
                    return mockCollectionQuery([{
                            id: '905551234567',
                            data: {
                                phoneE164: '+905551234567',
                                type: 'business_staff',
                                businessId: 'biz-789',
                                name: 'Staff Member',
                            },
                        }]);
                }
                return mockCollectionQuery([]);
            });
            const decision = await (0, whatsapp_router_1.routeInbound)({
                fromE164: '+905551234567',
                text: 'Update menu',
            });
            expect(decision.route).toBe('business_ops');
            expect(decision.businessId).toBe('biz-789');
        });
        it('should fallback to consumer if business_owner has no businessId', async () => {
            // Edge case: actors collection has business_owner but missing businessId
            mockDb.collection.mockImplementation((name) => {
                if (name === 'actors') {
                    return mockCollectionQuery([{
                            id: '905551234567',
                            data: {
                                phoneE164: '+905551234567',
                                type: 'business_owner',
                                // Missing businessId!
                            },
                        }]);
                }
                return mockCollectionQuery([]);
            });
            const decision = await (0, whatsapp_router_1.routeInbound)({
                fromE164: '+905551234567',
                text: 'Hello',
            });
            // Must NOT return business_ops without businessId
            expect(decision.route).toBe('consumer');
            expect(decision.threadType).toBe('general');
        });
        it('business_ops route must always include businessId', async () => {
            mockDb.collection.mockImplementation((name) => {
                if (name === 'businesses') {
                    return mockCollectionQuery([{
                            id: 'biz-123',
                            data: {
                                phone: '+905551234567',
                                name: 'Test Biz',
                            },
                        }]);
                }
                return mockCollectionQuery([]);
            });
            const decision = await (0, whatsapp_router_1.routeInbound)({
                fromE164: '+905551234567',
                text: 'Any message',
            });
            if (decision.route === 'business_ops') {
                expect(decision.businessId).toBeDefined();
                expect(typeof decision.businessId).toBe('string');
                expect(decision.businessId.length).toBeGreaterThan(0);
            }
        });
    });
});
//# sourceMappingURL=whatsapp.router.test.js.map