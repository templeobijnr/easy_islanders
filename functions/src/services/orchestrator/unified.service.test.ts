// Mocks
jest.mock('firebase-admin/firestore', () => ({
    getFirestore: jest.fn(() => ({})),
    Timestamp: { now: () => ({ toMillis: () => Date.now() }) },
    FieldValue: { serverTimestamp: () => 'MOCK_TIMESTAMP' }
}));
jest.mock('firebase-admin/app', () => ({
    initializeApp: jest.fn(),
    getApps: jest.fn(() => []),
    limitToLast: jest.fn(),
    orderBy: jest.fn(),
    where: jest.fn(),
}));

jest.mock('../../services/domains/conversations');
jest.mock('../../repositories/transaction.repository');
jest.mock('../../services/agent/orchestrator.service');
jest.mock('../domains/events/emitUserEvent', () => ({
    emitUserEvent: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('firebase-functions/logger');

// IMPORTANT:
// Import the module-under-test AFTER mocks are registered.
// Static `import` is hoisted and would load real implementations before mocks apply.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { processInbound } = require('./unified.service');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const conversations = require('../../services/domains/conversations');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { transactionRepository } = require('../../repositories/transaction.repository');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const orchestration = require('../../services/agent/orchestrator.service');

describe('Unified Orchestrator', () => {
    const mockThreadId = 'th_123';
    const mockMessageId = 'msg_abc';
    const mockActorId = 'user_123';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('processInbound', () => {
        it('should handle confirmation YES correctly', async () => {
            // Setup thread in awaiting_confirmation state
            (conversations.getThread as jest.Mock).mockResolvedValue({
                id: mockThreadId,
                actorId: mockActorId,
                threadType: 'general',
                businessId: 'biz_1',
                state: 'awaiting_confirmation',
                pendingAction: {
                    kind: 'confirm_transaction',
                    refId: 'tx_123',
                    summary: 'Hold for table',
                    expiresAt: { toMillis: () => Date.now() + 60000 } // Not expired
                }
            });

            // Setup inbound message
            (conversations.getThreadMessages as jest.Mock).mockResolvedValue([
                { id: mockMessageId, text: 'Yes please', channel: 'whatsapp', role: 'user' }
            ]);

            // Ensure thread writes don't throw
            (conversations.appendMessage as jest.Mock).mockResolvedValue({ id: 'out_1' });
            (conversations.updateThreadState as jest.Mock).mockResolvedValue(undefined);

            // Mock transaction confirm success
            (transactionRepository.confirmTransaction as jest.Mock).mockResolvedValue({
                success: true,
                confirmationCode: 'ABC-123'
            });

            const result = await processInbound({ threadId: mockThreadId, inboundMessageId: mockMessageId });

            expect(result.success).toBe(true);
            expect(result.outboundMessages[0].text).toContain('Confirmed');
            expect(conversations.updateThreadState).toHaveBeenCalledWith(mockThreadId, expect.objectContaining({ state: 'idle' }));
        });

        it('should handle confirmation NO correctly', async () => {
            // Setup thread
            (conversations.getThread as jest.Mock).mockResolvedValue({
                id: mockThreadId,
                actorId: mockActorId,
                threadType: 'general',
                businessId: 'biz_1',
                state: 'awaiting_confirmation',
                pendingAction: {
                    kind: 'confirm_transaction',
                    refId: 'tx_123',
                    summary: 'Hold for table',
                    expiresAt: { toMillis: () => Date.now() + 60000 }
                }
            });

            (conversations.getThreadMessages as jest.Mock).mockResolvedValue([
                { id: mockMessageId, text: 'No cancel', channel: 'whatsapp', role: 'user' }
            ]);

            (conversations.appendMessage as jest.Mock).mockResolvedValue({ id: 'out_2' });
            (conversations.updateThreadState as jest.Mock).mockResolvedValue(undefined);

            const result = await processInbound({ threadId: mockThreadId, inboundMessageId: mockMessageId });

            expect(result.success).toBe(true);
            expect(result.outboundMessages[0].text).toContain('cancelled');
            expect(transactionRepository.releaseHold).toHaveBeenCalled();
            expect(conversations.updateThreadState).toHaveBeenCalledWith(mockThreadId, expect.objectContaining({ state: 'idle' }));
        });

        it('should route general thread to Merve agent', async () => {
            // Setup thread
            (conversations.getThread as jest.Mock).mockResolvedValue({
                id: mockThreadId,
                actorId: mockActorId,
                threadType: 'general',
                state: 'idle'
            });

            (conversations.getThreadMessages as jest.Mock).mockResolvedValue([
                { id: mockMessageId, text: 'Hello', channel: 'whatsapp', role: 'user' }
            ]);

            (conversations.appendMessage as jest.Mock).mockResolvedValue({ id: 'out_3' });
            (conversations.updateThreadState as jest.Mock).mockResolvedValue(undefined);

            // Mock Merve response
            (orchestration.processMessage as jest.Mock).mockResolvedValue({
                text: 'Hello there!',
                sessionId: mockThreadId
            });

            const result = await processInbound({ threadId: mockThreadId, inboundMessageId: mockMessageId });

            expect(result.success).toBe(true);
            expect(result.outboundMessages[0].text).toBe('Hello there!');

            // Check appendMessage used correct actorId
            expect(conversations.appendMessage).toHaveBeenCalledWith(expect.objectContaining({
                actorId: 'merve',
                direction: 'outbound'
            }));
        });
    });
});
