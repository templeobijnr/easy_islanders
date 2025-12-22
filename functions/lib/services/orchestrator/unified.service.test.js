"use strict";
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
const unified_service_1 = require("./unified.service");
const conversations = __importStar(require("../../services/domains/conversations"));
const transaction_repository_1 = require("../../repositories/transaction.repository");
const orchestration = __importStar(require("../../services/agent/orchestrator.service"));
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
jest.mock('firebase-functions/logger');
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
            conversations.getThread.mockResolvedValue({
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
            conversations.getThreadMessages.mockResolvedValue([
                { id: mockMessageId, text: 'Yes please', channel: 'whatsapp', role: 'user' }
            ]);
            // Mock transaction confirm success
            transaction_repository_1.transactionRepository.confirmTransaction.mockResolvedValue({
                success: true,
                confirmationCode: 'ABC-123'
            });
            const result = await (0, unified_service_1.processInbound)({ threadId: mockThreadId, inboundMessageId: mockMessageId });
            expect(result.success).toBe(true);
            expect(result.outboundMessages[0].text).toContain('Confirmed');
            expect(conversations.updateThreadState).toHaveBeenCalledWith(mockThreadId, expect.objectContaining({ state: 'idle' }));
        });
        it('should handle confirmation NO correctly', async () => {
            // Setup thread
            conversations.getThread.mockResolvedValue({
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
            conversations.getThreadMessages.mockResolvedValue([
                { id: mockMessageId, text: 'No cancel', channel: 'whatsapp', role: 'user' }
            ]);
            const result = await (0, unified_service_1.processInbound)({ threadId: mockThreadId, inboundMessageId: mockMessageId });
            expect(result.success).toBe(true);
            expect(result.outboundMessages[0].text).toContain('cancelled');
            expect(transaction_repository_1.transactionRepository.releaseHold).toHaveBeenCalled();
            expect(conversations.updateThreadState).toHaveBeenCalledWith(mockThreadId, expect.objectContaining({ state: 'idle' }));
        });
        it('should route general thread to Merve agent', async () => {
            // Setup thread
            conversations.getThread.mockResolvedValue({
                id: mockThreadId,
                actorId: mockActorId,
                threadType: 'general',
                state: 'idle'
            });
            conversations.getThreadMessages.mockResolvedValue([
                { id: mockMessageId, text: 'Hello', channel: 'whatsapp', role: 'user' }
            ]);
            // Mock Merve response
            orchestration.processMessage.mockResolvedValue({
                text: 'Hello there!',
                sessionId: mockThreadId
            });
            const result = await (0, unified_service_1.processInbound)({ threadId: mockThreadId, inboundMessageId: mockMessageId });
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
//# sourceMappingURL=unified.service.test.js.map