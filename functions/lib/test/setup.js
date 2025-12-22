"use strict";
// Jest setup for Firebase Functions tests
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockFirestore = void 0;
// Simple mock for now - full Firebase test setup requires service account
// For unit tests, we'll mock Firestore directly
// Mock Firestore for tests
exports.mockFirestore = {
    collection: jest.fn(() => ({
        doc: jest.fn(() => ({
            get: jest.fn(),
            set: jest.fn(),
            update: jest.fn(),
            delete: jest.fn()
        })),
        add: jest.fn(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn()
    }))
};
//# sourceMappingURL=setup.js.map