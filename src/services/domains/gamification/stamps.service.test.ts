import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import * as firestore from 'firebase/firestore';

// Mock Firebase module
vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    getDocs: vi.fn(() => Promise.resolve({ empty: true, docs: [], size: 0 })),
    getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => null })),
    doc: vi.fn(),
    addDoc: vi.fn(() => Promise.resolve({ id: 'stamp-123' })),
    updateDoc: vi.fn(),
    setDoc: vi.fn(),
    serverTimestamp: vi.fn(() => ({ toDate: () => new Date() })),
    Timestamp: {
        now: vi.fn(() => ({ toDate: () => new Date() })),
        fromDate: vi.fn((date: Date) => ({ toDate: () => date })),
    },
    limit: vi.fn(),
    increment: vi.fn((val) => ({ _increment: val })),
}));

vi.mock('../../firebaseConfig', () => ({
    db: {},
}));

// Import after mocks
import {
    calculateRank,
    awardStamp,
    getUserStamps,
    hasStamp,
    getStampsCount,
} from './stamps.service';

describe('stampsService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('calculateRank', () => {
        it('should return Explorer for score 0', () => {
            expect(calculateRank(0)).toBe('Explorer');
        });

        it('should return Explorer for score 9', () => {
            expect(calculateRank(9)).toBe('Explorer');
        });

        it('should return Local for score 10', () => {
            expect(calculateRank(10)).toBe('Local');
        });

        it('should return Insider for score 25', () => {
            expect(calculateRank(25)).toBe('Insider');
        });

        it('should return Ambassador for score 50', () => {
            expect(calculateRank(50)).toBe('Ambassador');
        });

        it('should return Legend for score 100+', () => {
            expect(calculateRank(100)).toBe('Legend');
            expect(calculateRank(150)).toBe('Legend');
        });
    });

    describe('awardStamp', () => {
        it('should return null if user already has the stamp', async () => {
            // Mock existing stamp found
            (firestore.getDocs as Mock).mockResolvedValueOnce({
                empty: false,
                docs: [{ id: 'existing-stamp' }],
            });

            const result = await awardStamp(
                'user-123',
                'venue-456',
                'place',
                'Test Venue'
            );

            expect(result).toBeNull();
            expect(firestore.addDoc).not.toHaveBeenCalled();
        });

        it('should create a new stamp if user does not have it', async () => {
            // Mock no existing stamp
            (firestore.getDocs as Mock).mockResolvedValueOnce({
                empty: true,
                docs: [],
            });
            // Mock getDoc for updateUserCredibility
            (firestore.getDoc as Mock).mockResolvedValueOnce({
                exists: () => false,
                data: () => null,
            });

            const result = await awardStamp(
                'user-123',
                'venue-456',
                'place',
                'Test Venue'
            );

            expect(result).toBe('stamp-123');
            expect(firestore.addDoc).toHaveBeenCalledTimes(1);
        });

        it('should include location details in stamp data', async () => {
            (firestore.getDocs as Mock).mockResolvedValueOnce({
                empty: true,
                docs: [],
            });
            (firestore.getDoc as Mock).mockResolvedValueOnce({
                exists: () => false,
                data: () => null,
            });

            await awardStamp(
                'user-123',
                'venue-456',
                'event',
                'Beach Party',
                {
                    locationAddress: '123 Beach Rd',
                    category: 'Entertainment',
                    region: 'kyrenia',
                }
            );

            const addDocCall = (firestore.addDoc as Mock).mock.calls[0];
            const stampData = addDocCall[1];

            expect(stampData.locationName).toBe('Beach Party');
            expect(stampData.locationAddress).toBe('123 Beach Rd');
            expect(stampData.category).toBe('Entertainment');
            expect(stampData.region).toBe('kyrenia');
            expect(stampData.pinType).toBe('event');
        });

        it('should use default icon based on pin type', async () => {
            (firestore.getDocs as Mock).mockResolvedValueOnce({
                empty: true,
                docs: [],
            });
            (firestore.getDoc as Mock).mockResolvedValueOnce({
                exists: () => false,
                data: () => null,
            });

            await awardStamp('user-123', 'venue-456', 'event', 'Party');

            const addDocCall = (firestore.addDoc as Mock).mock.calls[0];
            const stampData = addDocCall[1];

            expect(stampData.icon).toBe('🎉'); // Event icon
        });
    });

    describe('getUserStamps', () => {
        it('should return empty array if user has no stamps', async () => {
            (firestore.getDocs as Mock).mockResolvedValueOnce({
                empty: true,
                docs: [],
            });

            const stamps = await getUserStamps('user-123');

            expect(stamps).toEqual([]);
        });

        it('should return stamps with correct structure', async () => {
            const mockStamps = [
                {
                    id: 'stamp-1',
                    data: () => ({
                        userId: 'user-123',
                        pinId: 'venue-1',
                        pinType: 'place',
                        locationName: 'Cafe One',
                        earnedAt: { toDate: () => new Date() },
                    }),
                },
                {
                    id: 'stamp-2',
                    data: () => ({
                        userId: 'user-123',
                        pinId: 'venue-2',
                        pinType: 'event',
                        locationName: 'Beach Party',
                        earnedAt: { toDate: () => new Date() },
                    }),
                },
            ];

            (firestore.getDocs as Mock).mockResolvedValueOnce({
                empty: false,
                docs: mockStamps,
            });

            const stamps = await getUserStamps('user-123');

            expect(stamps).toHaveLength(2);
            expect(stamps[0].id).toBe('stamp-1');
            expect(stamps[0].locationName).toBe('Cafe One');
            expect(stamps[1].pinType).toBe('event');
        });
    });

    describe('hasStamp', () => {
        it('should return false if user does not have the stamp', async () => {
            (firestore.getDocs as Mock).mockResolvedValueOnce({
                empty: true,
                docs: [],
            });

            const result = await hasStamp('user-123', 'venue-456');

            expect(result).toBe(false);
        });

        it('should return true if user has the stamp', async () => {
            (firestore.getDocs as Mock).mockResolvedValueOnce({
                empty: false,
                docs: [{ id: 'stamp-1' }],
            });

            const result = await hasStamp('user-123', 'venue-456');

            expect(result).toBe(true);
        });
    });

    describe('getStampsCount', () => {
        it('should return 0 for user with no stamps', async () => {
            (firestore.getDocs as Mock).mockResolvedValueOnce({
                empty: true,
                docs: [],
                size: 0,
            });

            const count = await getStampsCount('user-123');

            expect(count).toBe(0);
        });

        it('should return correct count for user with stamps', async () => {
            (firestore.getDocs as Mock).mockResolvedValueOnce({
                empty: false,
                docs: [{}, {}, {}],
                size: 3,
            });

            const count = await getStampsCount('user-123');

            expect(count).toBe(3);
        });
    });
});
