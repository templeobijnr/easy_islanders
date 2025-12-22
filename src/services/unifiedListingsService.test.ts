/**
 * Contract Tests: unifiedListingsService.ts
 *
 * Verifies:
 * - Listings CRUD operations only
 * - Does NOT cross domain boundaries
 * - Does NOT expose check-in logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase before import
vi.mock('./firebaseConfig', () => ({
    db: {},
}));

vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    doc: vi.fn(() => ({})),
    addDoc: vi.fn(() => Promise.resolve({ id: 'new-id' })),
    updateDoc: vi.fn(() => Promise.resolve()),
    deleteDoc: vi.fn(() => Promise.resolve()),
    getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
    getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    serverTimestamp: vi.fn(() => 'mock-timestamp'),
    Timestamp: { now: vi.fn() },
}));

import { UnifiedListingsService } from './unifiedListingsService';

describe('UnifiedListingsService — Contract', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ============================================================================
    // API SURFACE VERIFICATION
    // ============================================================================

    describe('API Surface', () => {
        it('exposes CRUD methods', () => {
            expect(typeof UnifiedListingsService.create).toBe('function');
            expect(typeof UnifiedListingsService.update).toBe('function');
            expect(typeof UnifiedListingsService.delete).toBe('function');
            expect(typeof UnifiedListingsService.getById).toBe('function');
            expect(typeof UnifiedListingsService.getAll).toBe('function');
        });

        it('exposes query methods', () => {
            expect(typeof UnifiedListingsService.getByType).toBe('function');
            expect(typeof UnifiedListingsService.getByCategory).toBe('function');
            expect(typeof UnifiedListingsService.getByRegion).toBe('function');
            expect(typeof UnifiedListingsService.getApproved).toBe('function');
            expect(typeof UnifiedListingsService.getForMap).toBe('function');
        });

        it('exposes utility methods', () => {
            expect(typeof UnifiedListingsService.getBookingPreset).toBe('function');
            expect(typeof UnifiedListingsService.getDefaultListing).toBe('function');
        });
    });

    // ============================================================================
    // OWNERSHIP BOUNDARY: DOES NOT CROSS INTO OTHER DOMAINS
    // ============================================================================

    describe('Ownership Boundaries', () => {
        it('does NOT expose check-in methods', () => {
            expect((UnifiedListingsService as any).checkIn).toBeUndefined();
            expect((UnifiedListingsService as any).createCheckIn).toBeUndefined();
            expect((UnifiedListingsService as any).getCheckIns).toBeUndefined();
        });

        it('does NOT expose user profile methods', () => {
            expect((UnifiedListingsService as any).getUserProfile).toBeUndefined();
            expect((UnifiedListingsService as any).updateUserProfile).toBeUndefined();
        });

        it('does NOT expose feed/social methods', () => {
            expect((UnifiedListingsService as any).getFeed).toBeUndefined();
            expect((UnifiedListingsService as any).createPost).toBeUndefined();
            expect((UnifiedListingsService as any).addComment).toBeUndefined();
        });

        it('does NOT expose event orchestration', () => {
            expect((UnifiedListingsService as any).joinEvent).toBeUndefined();
            expect((UnifiedListingsService as any).createEvent).toBeUndefined();
        });
    });

    // ============================================================================
    // FUNCTIONAL TESTS
    // ============================================================================

    describe('Functional Behavior', () => {
        it('getDefaultListing returns valid structure', () => {
            const listing = UnifiedListingsService.getDefaultListing('place', 'restaurants');

            expect(listing.type).toBe('place');
            expect(listing.category).toBe('restaurants');
            expect(listing.title).toBe('');
            expect(listing.lat).toBeDefined();
            expect(listing.lng).toBeDefined();
            expect(listing.actions).toBeDefined();
        });

        it('getBookingPreset returns options object', () => {
            const preset = UnifiedListingsService.getBookingPreset('restaurants');

            expect(typeof preset).toBe('object');
        });
    });
});
