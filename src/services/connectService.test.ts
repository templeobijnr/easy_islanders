import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import * as firestore from 'firebase/firestore';

// Mock Firebase module
vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    getDocs: vi.fn(() => Promise.resolve({ empty: true, docs: [] })),
    getDoc: vi.fn(),
    doc: vi.fn(),
    addDoc: vi.fn(() => Promise.resolve({ id: 'test-id' })),
    updateDoc: vi.fn(),
    serverTimestamp: vi.fn(() => ({ toDate: () => new Date() })),
    Timestamp: {
        now: vi.fn(() => ({ toDate: () => new Date() })),
        fromDate: vi.fn((date: Date) => ({ toDate: () => date })),
    },
    limit: vi.fn(),
    onSnapshot: vi.fn(),
    arrayUnion: vi.fn(),
    arrayRemove: vi.fn(),
    increment: vi.fn(),
}));

vi.mock('../services/firebaseConfig', () => ({
    db: {},
}));

// Import after mocks are set up
import { checkIn, joinEvent, wave } from '../services/connectService';

describe('connectService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('checkIn', () => {
        it('should call addDoc when checking in', async () => {
            await checkIn(
                'user-123',
                'venue-456',
                'place',
                'John Doe',
                'https://example.com/avatar.jpg'
            );

            expect(firestore.addDoc).toHaveBeenCalledTimes(1);
        });

        it('should include userId and pinId in the check-in data', async () => {
            await checkIn('user-123', 'venue-456', 'event');

            const addDocCall = (firestore.addDoc as Mock).mock.calls[0];
            const checkInData = addDocCall[1];

            expect(checkInData.userId).toBe('user-123');
            expect(checkInData.pinId).toBe('venue-456');
            expect(checkInData.pinType).toBe('event');
        });

        it('should include user display name when provided', async () => {
            await checkIn('user-123', 'venue-456', 'place', 'Test User');

            const addDocCall = (firestore.addDoc as Mock).mock.calls[0];
            const checkInData = addDocCall[1];

            expect(checkInData.userDisplayName).toBe('Test User');
        });
    });

    describe('joinEvent', () => {
        it('should not create duplicate joins', async () => {
            // Mock that user has already joined
            (firestore.getDocs as Mock).mockResolvedValueOnce({
                empty: false,
                docs: [{ id: 'existing-join' }],
            });

            await joinEvent('user-123', 'event-456', 'event');

            // addDoc should NOT be called since user already joined
            expect(firestore.addDoc).not.toHaveBeenCalled();
        });

        it('should create a join when user has not already joined', async () => {
            // Mock that user has not joined
            (firestore.getDocs as Mock).mockResolvedValueOnce({
                empty: true,
                docs: [],
            });

            await joinEvent('user-123', 'event-456', 'event');

            expect(firestore.addDoc).toHaveBeenCalledTimes(1);
        });
    });

    describe('wave', () => {
        it('should complete without error (logging removed for PII compliance)', async () => {
            // wave function was refactored to remove console.log for PII compliance
            // Now just verify it completes without throwing
            await expect(wave('user-123', 'target-456', 'John Doe')).resolves.toBeUndefined();
        });
    });

    // ============================================================================
    // OWNERSHIP BOUNDARY TESTS (Contract Enforcement)
    // ============================================================================

    describe('Ownership Boundaries', () => {
        it('OWNS check-in functionality', () => {
            expect(typeof checkIn).toBe('function');
            expect(typeof joinEvent).toBe('function');
            expect(typeof wave).toBe('function');
        });

        it('does NOT expose user profile logic (owned by social.service)', async () => {
            const ConnectService = await import('./connectService');
            expect((ConnectService as any).getUserProfile).toBeUndefined();
            expect((ConnectService as any).ensureUserProfile).toBeUndefined();
            expect((ConnectService as any).updateUserProfile).toBeUndefined();
        });

        it('does NOT expose social feed logic (deprecated)', async () => {
            const ConnectService = await import('./connectService');
            expect((ConnectService as any).getFeed).toBeUndefined();
            expect((ConnectService as any).createPost).toBeUndefined();
            expect((ConnectService as any).addComment).toBeUndefined();
            expect((ConnectService as any).getComments).toBeUndefined();
            expect((ConnectService as any).toggleLike).toBeUndefined();
        });

        it('does NOT expose group/tribe logic (deprecated)', async () => {
            const ConnectService = await import('./connectService');
            expect((ConnectService as any).getGroups).toBeUndefined();
            expect((ConnectService as any).createOrJoinGroup).toBeUndefined();
            expect((ConnectService as any).joinGroup).toBeUndefined();
            expect((ConnectService as any).leaveGroup).toBeUndefined();
        });

        it('does NOT expose listings CRUD (owned by unifiedListingsService)', async () => {
            const ConnectService = await import('./connectService');
            expect((ConnectService as any).createListing).toBeUndefined();
            expect((ConnectService as any).updateListing).toBeUndefined();
            expect((ConnectService as any).deleteListing).toBeUndefined();
        });
    });
});
