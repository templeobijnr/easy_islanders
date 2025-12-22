// Mock Firestore
const mockDoc = {
    exists: false,
    data: jest.fn(),
};
const mockRef = {
    get: jest.fn().mockResolvedValue(mockDoc),
    set: jest.fn(),
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
};
const mockTx = {
    get: jest.fn().mockResolvedValue(mockDoc),
    set: jest.fn(),
    update: jest.fn(),
};

jest.mock('../../../config/firebase', () => ({
    db: {
        collection: jest.fn(() => mockRef),
        runTransaction: jest.fn(callback => callback(mockTx)),
    },
}));

jest.mock('firebase-admin/firestore', () => ({
    Timestamp: { now: () => 'MOCK_TIMESTAMP' },
    FieldValue: { arrayUnion: jest.fn() },
}));

// IMPORTANT:
// Import the module-under-test AFTER mocks are registered.
// Static `import` is hoisted and would load real implementations before mocks apply.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ensureOutboundSend } = require('./thread.repository');

describe('Thread Repository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('ensureOutboundSend', () => {
        it('should return created: true if not exists', async () => {
            mockDoc.exists = false;

            const result = await ensureOutboundSend('thread_123', 'msg_abc:0', 'Hello');

            expect(result.created).toBe(true);
            expect(mockTx.set).toHaveBeenCalled();
        });

        it('should return created: false if exists', async () => {
            mockDoc.exists = true;

            const result = await ensureOutboundSend('thread_123', 'msg_abc:0', 'Hello');

            expect(result.created).toBe(false);
            expect(mockTx.set).not.toHaveBeenCalled();
        });
    });
});
