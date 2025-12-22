/**
 * Contract Tests: discoverConfigService.ts
 *
 * Verifies:
 * - Config CRUD surface only
 * - No cross-domain imports
 * - Caching behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase
vi.mock('./firebaseConfig', () => ({
    db: {},
}));

vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    doc: vi.fn(() => ({})),
    getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
    setDoc: vi.fn(() => Promise.resolve()),
    updateDoc: vi.fn(() => Promise.resolve()),
    serverTimestamp: vi.fn(() => 'mock-timestamp'),
}));

import * as DiscoverConfigService from './discoverConfigService';

describe('DiscoverConfigService — Contract', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ============================================================================
    // API SURFACE VERIFICATION
    // ============================================================================

    describe('API Surface', () => {
        it('exposes discover config methods', () => {
            expect(typeof DiscoverConfigService.getDiscoverConfig).toBe('function');
            expect(typeof DiscoverConfigService.updateDiscoverConfig).toBe('function');
            expect(typeof DiscoverConfigService.resetDiscoverConfig).toBe('function');
        });

        it('exposes region operations', () => {
            expect(typeof DiscoverConfigService.updateRegionVisibility).toBe('function');
            expect(typeof DiscoverConfigService.updateSubRegionVisibility).toBe('function');
            expect(typeof DiscoverConfigService.getAllRegions).toBe('function');
            expect(typeof DiscoverConfigService.getVisibleRegions).toBe('function');
        });

        it('exposes tab/category operations', () => {
            expect(typeof DiscoverConfigService.updateTabVisibility).toBe('function');
            expect(typeof DiscoverConfigService.updateCategoryVisibility).toBe('function');
            expect(typeof DiscoverConfigService.getVisibleTabs).toBe('function');
        });

        it('exposes homepage config methods', () => {
            expect(typeof DiscoverConfigService.getHomepageConfig).toBe('function');
            expect(typeof DiscoverConfigService.updateHomepageConfig).toBe('function');
        });

        it('exposes cache control', () => {
            expect(typeof DiscoverConfigService.clearLocationsCache).toBe('function');
        });
    });

    // ============================================================================
    // OWNERSHIP BOUNDARIES
    // ============================================================================

    describe('Ownership Boundaries', () => {
        it('does NOT expose listing methods', () => {
            expect((DiscoverConfigService as any).createListing).toBeUndefined();
            expect((DiscoverConfigService as any).updateListing).toBeUndefined();
            expect((DiscoverConfigService as any).deleteListing).toBeUndefined();
        });

        it('does NOT expose check-in methods', () => {
            expect((DiscoverConfigService as any).checkIn).toBeUndefined();
            expect((DiscoverConfigService as any).getCheckIns).toBeUndefined();
        });

        it('does NOT expose user methods', () => {
            expect((DiscoverConfigService as any).getUserProfile).toBeUndefined();
            expect((DiscoverConfigService as any).updateUserProfile).toBeUndefined();
        });

        it('does NOT expose feed methods', () => {
            expect((DiscoverConfigService as any).getFeed).toBeUndefined();
            expect((DiscoverConfigService as any).getLiveVenues).toBeUndefined();
        });
    });
});
