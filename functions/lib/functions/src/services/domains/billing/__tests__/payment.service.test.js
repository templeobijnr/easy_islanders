"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_1 = require("../../../../config/firebase");
// Mock Firebase config
jest.mock('../../../../config/firebase', () => ({
    db: {
        collection: jest.fn(),
    },
}));
// Mock Stripe with factory function to avoid hoisting issues
const mockPaymentIntentsCreate = jest.fn();
const mockWebhooksConstructEvent = jest.fn();
jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        paymentIntents: {
            create: mockPaymentIntentsCreate,
        },
        webhooks: {
            constructEvent: mockWebhooksConstructEvent,
        },
    }));
});
// Mock Firestore FieldValue
jest.mock('firebase-admin/firestore', () => ({
    FieldValue: {
        serverTimestamp: jest.fn(() => 'server-timestamp'),
    },
}));
// Import after mocks are set up
const payment_service_1 = require("../payment.service");
describe('Payment Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('createPaymentIntent', () => {
        const mockBookingId = 'booking-123';
        const mockUserId = 'user-123';
        const mockBookingData = {
            userId: mockUserId,
            status: 'pending',
            totalPrice: 50,
            currency: 'gbp',
        };
        it('should create payment intent for valid booking', async () => {
            // Mock Firestore get
            const mockGet = jest.fn().mockResolvedValue({
                exists: true,
                data: () => mockBookingData,
            });
            const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
            firebase_1.db.collection.mockReturnValue({ doc: mockDoc });
            // Mock Stripe create
            mockPaymentIntentsCreate.mockResolvedValue({
                id: 'pi_123',
                client_secret: 'secret_123',
            });
            const result = await payment_service_1.paymentService.createPaymentIntent(mockBookingId, mockUserId);
            expect(result).toEqual({
                clientSecret: 'secret_123',
                amount: 50,
                currency: 'gbp',
            });
            expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(expect.objectContaining({
                amount: 5000, // 50 * 100
                currency: 'gbp',
                metadata: {
                    bookingId: mockBookingId,
                    userId: mockUserId,
                },
            }));
        });
        it('should throw error if booking does not exist', async () => {
            const mockGet = jest.fn().mockResolvedValue({
                exists: false,
            });
            const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
            firebase_1.db.collection.mockReturnValue({ doc: mockDoc });
            await expect(payment_service_1.paymentService.createPaymentIntent(mockBookingId, mockUserId))
                .rejects.toThrow('Booking not found');
        });
        it('should throw error if user is not owner', async () => {
            const mockGet = jest.fn().mockResolvedValue({
                exists: true,
                data: () => (Object.assign(Object.assign({}, mockBookingData), { userId: 'other-user' })),
            });
            const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
            firebase_1.db.collection.mockReturnValue({ doc: mockDoc });
            await expect(payment_service_1.paymentService.createPaymentIntent(mockBookingId, mockUserId))
                .rejects.toThrow('Unauthorized');
        });
        it('should throw error if booking is already paid', async () => {
            const mockGet = jest.fn().mockResolvedValue({
                exists: true,
                data: () => (Object.assign(Object.assign({}, mockBookingData), { status: 'confirmed' })),
            });
            const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
            firebase_1.db.collection.mockReturnValue({ doc: mockDoc });
            await expect(payment_service_1.paymentService.createPaymentIntent(mockBookingId, mockUserId))
                .rejects.toThrow('Booking already paid');
        });
    });
    describe('handleWebhook', () => {
        const mockSignature = 'sig_123';
        const mockBody = Buffer.from('payload');
        it('should process payment_intent.succeeded event', async () => {
            // Mock Stripe event construction
            mockWebhooksConstructEvent.mockReturnValue({
                type: 'payment_intent.succeeded',
                data: {
                    object: {
                        id: 'pi_123',
                        metadata: { bookingId: 'booking-123' },
                    },
                },
            });
            // Mock Firestore update
            const mockUpdate = jest.fn().mockResolvedValue({});
            const mockDoc = jest.fn().mockReturnValue({ update: mockUpdate });
            firebase_1.db.collection.mockReturnValue({ doc: mockDoc });
            const result = await payment_service_1.paymentService.handleWebhook(mockSignature, mockBody);
            expect(result).toEqual({ received: true });
            expect(firebase_1.db.collection).toHaveBeenCalledWith('bookings');
            expect(mockDoc).toHaveBeenCalledWith('booking-123');
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                status: 'confirmed',
                paymentId: 'pi_123',
                paymentStatus: 'paid',
            }));
        });
        it('should throw error on invalid signature', async () => {
            mockWebhooksConstructEvent.mockImplementation(() => {
                throw new Error('Signature verification failed');
            });
            await expect(payment_service_1.paymentService.handleWebhook(mockSignature, mockBody))
                .rejects.toThrow('Webhook Error');
        });
        it('should ignore other event types', async () => {
            mockWebhooksConstructEvent.mockReturnValue({
                type: 'payment_intent.created',
                data: { object: {} },
            });
            const mockUpdate = jest.fn();
            const mockDoc = jest.fn().mockReturnValue({ update: mockUpdate });
            firebase_1.db.collection.mockReturnValue({ doc: mockDoc });
            const result = await payment_service_1.paymentService.handleWebhook(mockSignature, mockBody);
            expect(result).toEqual({ received: true });
            expect(mockUpdate).not.toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=payment.service.test.js.map