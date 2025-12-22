"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Tests for Twilio Webhook Controller
 * Critical security tests for webhook signature validation
 */
const twilio_1 = __importDefault(require("twilio"));
// Mock dependencies before imports
jest.mock('twilio', () => ({
    __esModule: true,
    default: {
        validateRequest: jest.fn(),
    },
}));
jest.mock('../../config/firebase', () => ({
    db: {
        collection: jest.fn(() => ({
            add: jest.fn().mockResolvedValue({ id: 'log-123' }),
        })),
    },
}));
jest.mock('../../services/channels/whatsapp', () => ({
    normalizeTwilioWhatsAppPayload: jest.fn(),
}));
jest.mock('../../services/domains/channels/whatsappInbound.repository', () => ({
    createIfAbsent: jest.fn(),
}));
jest.mock('firebase-admin/functions', () => ({
    getFunctions: jest.fn(() => ({
        taskQueue: jest.fn(() => ({
            enqueue: jest.fn().mockResolvedValue({}),
        })),
    })),
}));
const twilio_controller_1 = require("../twilio.controller");
const whatsapp_1 = require("../../services/channels/whatsapp");
const whatsappInbound_repository_1 = require("../../services/domains/channels/whatsappInbound.repository");
const firebase_1 = require("../../config/firebase");
describe('Twilio Webhook Controller', () => {
    let mockReq;
    let mockRes;
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.TWILIO_AUTH_TOKEN = 'test-auth-token';
        mockRes = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
    });
    afterEach(() => {
        delete process.env.TWILIO_AUTH_TOKEN;
    });
    describe('Signature Verification (Security Critical)', () => {
        it('should reject requests with missing signature', async () => {
            mockReq = {
                get: jest.fn().mockImplementation((header) => {
                    if (header === 'x-twilio-signature')
                        return undefined;
                    return 'localhost';
                }),
                body: { Body: 'test' },
                originalUrl: '/webhook',
            };
            await (0, twilio_controller_1.handleIncomingWhatsApp)(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.send).toHaveBeenCalledWith('Missing Twilio signature');
        });
        it('should reject requests with invalid signature', async () => {
            twilio_1.default.validateRequest.mockReturnValue(false);
            mockReq = {
                get: jest.fn().mockImplementation((header) => {
                    if (header === 'x-twilio-signature')
                        return 'invalid-sig';
                    if (header === 'x-forwarded-proto')
                        return 'https';
                    if (header === 'host')
                        return 'api.example.com';
                    return undefined;
                }),
                body: { Body: 'test' },
                originalUrl: '/webhook',
            };
            await (0, twilio_controller_1.handleIncomingWhatsApp)(mockReq, mockRes);
            expect(twilio_1.default.validateRequest).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.send).toHaveBeenCalledWith('Invalid Twilio signature');
        });
        it('should return 500 if TWILIO_AUTH_TOKEN is not configured', async () => {
            delete process.env.TWILIO_AUTH_TOKEN;
            mockReq = {
                get: jest.fn().mockImplementation((header) => {
                    if (header === 'x-twilio-signature')
                        return 'some-sig';
                    return 'localhost';
                }),
                body: { Body: 'test' },
                originalUrl: '/webhook',
            };
            await (0, twilio_controller_1.handleIncomingWhatsApp)(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.send).toHaveBeenCalledWith('Server misconfigured');
        });
        it('should process valid request with correct signature', async () => {
            twilio_1.default.validateRequest.mockReturnValue(true);
            whatsapp_1.normalizeTwilioWhatsAppPayload.mockReturnValue({
                messageId: 'SM123',
                fromE164: '+1234567890',
                toE164: '+0987654321',
                text: 'Hello',
                mediaUrls: [],
            });
            whatsappInbound_repository_1.createIfAbsent.mockResolvedValue({
                created: true,
                receipt: { messageSid: 'SM123', status: 'queued' },
            });
            mockReq = {
                get: jest.fn().mockImplementation((header) => {
                    if (header === 'x-twilio-signature')
                        return 'valid-sig';
                    if (header === 'x-forwarded-proto')
                        return 'https';
                    if (header === 'host')
                        return 'api.example.com';
                    return undefined;
                }),
                body: { Body: 'Hello', From: '+1234567890' },
                originalUrl: '/webhook',
            };
            await (0, twilio_controller_1.handleIncomingWhatsApp)(mockReq, mockRes);
            expect(twilio_1.default.validateRequest).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.send).toHaveBeenCalledWith('OK');
        });
    });
    describe('handleIncomingWhatsApp', () => {
        beforeEach(() => {
            twilio_1.default.validateRequest.mockReturnValue(true);
            mockReq = {
                get: jest.fn().mockImplementation((header) => {
                    if (header === 'x-twilio-signature')
                        return 'valid-sig';
                    if (header === 'x-forwarded-proto')
                        return 'https';
                    if (header === 'host')
                        return 'api.example.com';
                    return undefined;
                }),
                body: { Body: 'Hello' },
                originalUrl: '/webhook',
            };
        });
        it('should reject messages without MessageSid', async () => {
            whatsapp_1.normalizeTwilioWhatsAppPayload.mockReturnValue({
                messageId: null,
                text: 'Hello',
                mediaUrls: [],
            });
            await (0, twilio_controller_1.handleIncomingWhatsApp)(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.send).toHaveBeenCalledWith('Missing MessageSid');
        });
        it('should return 200 for duplicate messages', async () => {
            whatsapp_1.normalizeTwilioWhatsAppPayload.mockReturnValue({
                messageId: 'SM123',
                fromE164: '+1234567890',
                text: 'Hello',
                mediaUrls: [],
            });
            whatsappInbound_repository_1.createIfAbsent.mockResolvedValue({
                created: false,
                receipt: { messageSid: 'SM123', status: 'processed' },
            });
            await (0, twilio_controller_1.handleIncomingWhatsApp)(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.send).toHaveBeenCalledWith('OK');
        });
    });
    describe('handleMessageStatus', () => {
        beforeEach(() => {
            twilio_1.default.validateRequest.mockReturnValue(true);
            mockReq = {
                get: jest.fn().mockImplementation((header) => {
                    if (header === 'x-twilio-signature')
                        return 'valid-sig';
                    if (header === 'x-forwarded-proto')
                        return 'https';
                    if (header === 'host')
                        return 'api.example.com';
                    return undefined;
                }),
                body: {
                    MessageSid: 'SM123',
                    MessageStatus: 'delivered',
                    To: '+1234567890',
                },
                originalUrl: '/status',
            };
        });
        it('should log status update to Firestore', async () => {
            await (0, twilio_controller_1.handleMessageStatus)(mockReq, mockRes);
            expect(firebase_1.db.collection).toHaveBeenCalledWith('whatsapp_logs');
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.send).toHaveBeenCalledWith('OK');
        });
        it('should reject invalid signature', async () => {
            twilio_1.default.validateRequest.mockReturnValue(false);
            await (0, twilio_controller_1.handleMessageStatus)(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });
    });
});
//# sourceMappingURL=twilio.controller.test.js.map