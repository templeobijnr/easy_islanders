/**
 * Notification Service Tests
 *
 * Tests the channel abstraction and fallback logic.
 */
import type { Job, MerchantTarget } from '@askmerve/shared';

// Mock Twilio service
jest.mock('../../twilio.service', () => ({
    sendWhatsApp: jest.fn().mockResolvedValue({ sid: 'mock-twilio-sid' }),
}));

// IMPORTANT:
// Import the module-under-test AFTER mocks are registered.
// Static `import` is hoisted and would load real implementations before mocks apply.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { NotificationService } = require('../index');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { WhatsAppNotificationChannel } = require('../channels/whatsapp.channel');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PushNotificationChannel } = require('../channels/push.channel');

describe('NotificationService', () => {
    // Partial mock - cast to Job for testing
    const mockJob = {
        id: 'job-123',
        ownerUserId: 'user-123',
        actionType: 'taxi',
        actionData: {
            actionType: 'taxi',
            pickupLocation: { address: '123 Main St' },
            dropoffLocation: { address: '456 Oak Ave' },
            passengerCount: 2,
        },
        status: 'dispatched',
        jobCode: 'ABC123',
        language: 'en',
        dispatchAttempts: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    } as Job;

    const mockUnlistedMerchant: MerchantTarget = {
        type: 'unlisted',
        phone: '+1234567890',
        name: 'Test Merchant',
    };

    describe('PushNotificationChannel', () => {
        it('should return not available (stub)', async () => {
            const channel = new PushNotificationChannel();
            const isAvailable = await channel.isAvailable(mockUnlistedMerchant);
            expect(isAvailable).toBe(false);
        });

        it('should return failure when send attempted', async () => {
            const channel = new PushNotificationChannel();
            const result = await channel.send(mockJob, mockUnlistedMerchant);
            expect(result.success).toBe(false);
            expect(result.failureReason).toContain('not yet implemented');
        });
    });

    describe('WhatsAppNotificationChannel', () => {
        it('should be available for unlisted merchants with phone', async () => {
            const channel = new WhatsAppNotificationChannel();
            const isAvailable = await channel.isAvailable(mockUnlistedMerchant);
            expect(isAvailable).toBe(true);
        });

        it('should not be available for unlisted merchants without phone', async () => {
            const channel = new WhatsAppNotificationChannel();
            const noPhoneMerchant: MerchantTarget = {
                type: 'unlisted',
                phone: '',
                name: 'No Phone',
            };
            const isAvailable = await channel.isAvailable(noPhoneMerchant);
            expect(isAvailable).toBe(false);
        });
    });

    describe('NotificationService orchestration', () => {
        it('should try all channels in order', async () => {
            const service = new NotificationService();
            // Since push is unavailable, it should fall back to WhatsApp
            const result = await service.sendJobNotification(mockJob, mockUnlistedMerchant);
            expect(result.success).toBe(true);
            expect(result.channel).toBe('whatsapp');
        });
    });
});
