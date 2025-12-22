/**
 * Tests for Twilio Webhook Controller
 * Critical security tests for webhook signature validation
 */
// Mock dependencies before imports
const mockValidateRequest = jest.fn();
jest.mock('twilio', () => {
    // Twilio package default export is a callable function with static helpers (e.g., validateRequest).
    const twilioFn: any = Object.assign(() => ({}), {
        validateRequest: mockValidateRequest,
    });
    return { __esModule: true, default: twilioFn };
});

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

// IMPORTANT:
// Import the mocked module AFTER mocks are registered (static imports are hoisted).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const twilio = require('twilio').default;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { handleIncomingWhatsApp, handleMessageStatus } = require('../twilio.controller');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { normalizeTwilioWhatsAppPayload } = require('../../services/channels/whatsapp');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createIfAbsent } = require('../../services/domains/channels/whatsappInbound.repository');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { db } = require('../../config/firebase');

describe('Twilio Webhook Controller', () => {
    let mockReq: any;
    let mockRes: any;

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
                get: jest.fn().mockImplementation((header: string) => {
                    if (header === 'x-twilio-signature') return undefined;
                    return 'localhost';
                }),
                body: { Body: 'test' },
                originalUrl: '/webhook',
            };

            await handleIncomingWhatsApp(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.send).toHaveBeenCalledWith('Missing Twilio signature');
        });

        it('should reject requests with invalid signature', async () => {
            (twilio.validateRequest as jest.Mock).mockReturnValue(false);

            mockReq = {
                get: jest.fn().mockImplementation((header: string) => {
                    if (header === 'x-twilio-signature') return 'invalid-sig';
                    if (header === 'x-forwarded-proto') return 'https';
                    if (header === 'host') return 'api.example.com';
                    return undefined;
                }),
                body: { Body: 'test' },
                originalUrl: '/webhook',
            };

            await handleIncomingWhatsApp(mockReq, mockRes);

            expect(twilio.validateRequest).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.send).toHaveBeenCalledWith('Invalid Twilio signature');
        });

        it('should return 500 if TWILIO_AUTH_TOKEN is not configured', async () => {
            delete process.env.TWILIO_AUTH_TOKEN;

            mockReq = {
                get: jest.fn().mockImplementation((header: string) => {
                    if (header === 'x-twilio-signature') return 'some-sig';
                    return 'localhost';
                }),
                body: { Body: 'test' },
                originalUrl: '/webhook',
            };

            await handleIncomingWhatsApp(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.send).toHaveBeenCalledWith('Server misconfigured');
        });

        it('should process valid request with correct signature', async () => {
            (twilio.validateRequest as jest.Mock).mockReturnValue(true);
            (normalizeTwilioWhatsAppPayload as jest.Mock).mockReturnValue({
                messageId: 'SM123',
                fromE164: '+1234567890',
                toE164: '+0987654321',
                text: 'Hello',
                mediaUrls: [],
            });
            (createIfAbsent as jest.Mock).mockResolvedValue({
                created: true,
                receipt: { messageSid: 'SM123', status: 'queued' },
            });

            mockReq = {
                get: jest.fn().mockImplementation((header: string) => {
                    if (header === 'x-twilio-signature') return 'valid-sig';
                    if (header === 'x-forwarded-proto') return 'https';
                    if (header === 'host') return 'api.example.com';
                    return undefined;
                }),
                body: { Body: 'Hello', From: '+1234567890' },
                originalUrl: '/webhook',
            };

            await handleIncomingWhatsApp(mockReq, mockRes);

            expect(twilio.validateRequest).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.send).toHaveBeenCalledWith('OK');
        });
    });

    describe('handleIncomingWhatsApp', () => {
        beforeEach(() => {
            (twilio.validateRequest as jest.Mock).mockReturnValue(true);
            mockReq = {
                get: jest.fn().mockImplementation((header: string) => {
                    if (header === 'x-twilio-signature') return 'valid-sig';
                    if (header === 'x-forwarded-proto') return 'https';
                    if (header === 'host') return 'api.example.com';
                    return undefined;
                }),
                body: { Body: 'Hello' },
                originalUrl: '/webhook',
            };
        });

        it('should reject messages without MessageSid', async () => {
            (normalizeTwilioWhatsAppPayload as jest.Mock).mockReturnValue({
                messageId: null,
                text: 'Hello',
                mediaUrls: [],
            });

            await handleIncomingWhatsApp(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.send).toHaveBeenCalledWith('Missing MessageSid');
        });

        it('should return 200 for duplicate messages', async () => {
            (normalizeTwilioWhatsAppPayload as jest.Mock).mockReturnValue({
                messageId: 'SM123',
                fromE164: '+1234567890',
                text: 'Hello',
                mediaUrls: [],
            });
            (createIfAbsent as jest.Mock).mockResolvedValue({
                created: false,
                receipt: { messageSid: 'SM123', status: 'processed' },
            });

            await handleIncomingWhatsApp(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.send).toHaveBeenCalledWith('OK');
        });
    });

    describe('handleMessageStatus', () => {
        beforeEach(() => {
            (twilio.validateRequest as jest.Mock).mockReturnValue(true);
            mockReq = {
                get: jest.fn().mockImplementation((header: string) => {
                    if (header === 'x-twilio-signature') return 'valid-sig';
                    if (header === 'x-forwarded-proto') return 'https';
                    if (header === 'host') return 'api.example.com';
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
            await handleMessageStatus(mockReq, mockRes);

            expect(db.collection).toHaveBeenCalledWith('whatsapp_logs');
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.send).toHaveBeenCalledWith('OK');
        });

        it('should reject invalid signature', async () => {
            (twilio.validateRequest as jest.Mock).mockReturnValue(false);

            await handleMessageStatus(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
        });
    });
});
