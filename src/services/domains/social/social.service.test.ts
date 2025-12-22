/**
 * Social Domain Service — Tests
 *
 * TDD-first tests defining the identity-only contract.
 * Tests written BEFORE implementation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase before importing service
vi.mock('../../firebaseConfig', () => ({
    db: {},
    auth: { currentUser: { uid: 'test-user-123' } },
}));

// Mock Firestore operations
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDoc = vi.fn(() => ({}));
const mockServerTimestamp = vi.fn(() => 'mock-timestamp');

vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    doc: vi.fn(() => ({})),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    serverTimestamp: vi.fn(() => 'mock-timestamp'),
}));

// Import service after mocks
import { SocialService } from './social.service';

describe('Social Domain Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ============================================================================
    // USER PROFILE TESTS
    // ============================================================================

    describe('User Profile', () => {
        it('should export getUserProfile function', () => {
            expect(typeof SocialService.getUserProfile).toBe('function');
        });

        it('should export ensureUserProfile function', () => {
            expect(typeof SocialService.ensureUserProfile).toBe('function');
        });

        it('should export updateUserProfile function', () => {
            expect(typeof SocialService.updateUserProfile).toBe('function');
        });
    });

    // ============================================================================
    // SAFETY & BOUNDARY TESTS (Critical)
    // ============================================================================

    describe('Safety & Boundaries — Deprecated APIs', () => {
        it('does NOT expose getFeed', () => {
            expect((SocialService as any).getFeed).toBeUndefined();
        });

        it('does NOT expose createPost', () => {
            expect((SocialService as any).createPost).toBeUndefined();
        });

        it('does NOT expose toggleLike', () => {
            expect((SocialService as any).toggleLike).toBeUndefined();
        });

        it('does NOT expose addComment', () => {
            expect((SocialService as any).addComment).toBeUndefined();
        });

        it('does NOT expose getComments', () => {
            expect((SocialService as any).getComments).toBeUndefined();
        });

        it('does NOT expose getGroups', () => {
            expect((SocialService as any).getGroups).toBeUndefined();
        });

        it('does NOT expose createOrJoinGroup', () => {
            expect((SocialService as any).createOrJoinGroup).toBeUndefined();
        });

        it('does NOT expose joinGroup', () => {
            expect((SocialService as any).joinGroup).toBeUndefined();
        });

        it('does NOT expose leaveGroup', () => {
            expect((SocialService as any).leaveGroup).toBeUndefined();
        });

        it('does NOT expose wave', () => {
            expect((SocialService as any).wave).toBeUndefined();
        });

        it('does NOT expose getConnectionStatus', () => {
            expect((SocialService as any).getConnectionStatus).toBeUndefined();
        });

        it('does NOT expose seedDatabase', () => {
            expect((SocialService as any).seedDatabase).toBeUndefined();
        });

        it('does NOT expose checkIn (owned by connectService)', () => {
            expect((SocialService as any).checkIn).toBeUndefined();
        });

        it('does NOT expose getHotZones', () => {
            expect((SocialService as any).getHotZones).toBeUndefined();
        });

        it('does NOT expose awardStamp', () => {
            expect((SocialService as any).awardStamp).toBeUndefined();
        });

        it('does NOT expose uploadImage', () => {
            expect((SocialService as any).uploadImage).toBeUndefined();
        });
    });

    // ============================================================================
    // API SURFACE AREA TEST
    // ============================================================================

    describe('API Surface Area', () => {
        it('should have exactly 3 public methods', () => {
            const publicMethods = Object.keys(SocialService).filter(
                (key) => typeof (SocialService as any)[key] === 'function'
            );

            expect(publicMethods).toHaveLength(3);
            expect(publicMethods).toContain('getUserProfile');
            expect(publicMethods).toContain('ensureUserProfile');
            expect(publicMethods).toContain('updateUserProfile');
        });
    });
});
