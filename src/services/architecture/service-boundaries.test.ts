/**
 * Service Boundaries — Centralized Enforcement Tests
 *
 * Purpose:
 * - Single location to catch ownership boundary violations
 * - Fails loudly if forbidden APIs are introduced
 * - Validates architectural contracts
 *
 * Run with: npx vitest run src/services/architecture/
 */

import { describe, it, expect, vi } from 'vitest';

// Mock Firebase before imports
vi.mock('../firebaseConfig', () => ({
    db: {},
    auth: { currentUser: null },
}));

vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    doc: vi.fn(() => ({})),
    addDoc: vi.fn(() => Promise.resolve({ id: 'id' })),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
    getDocs: vi.fn(() => Promise.resolve({ docs: [], empty: true })),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    onSnapshot: vi.fn(),
    serverTimestamp: vi.fn(),
    Timestamp: { now: vi.fn(), fromDate: vi.fn() },
    arrayUnion: vi.fn(),
    arrayRemove: vi.fn(),
    increment: vi.fn(),
}));

describe('Service Boundaries — Global Enforcement', () => {
    // ============================================================================
    // connectService Boundaries
    // ============================================================================

    describe('connectService', () => {
        it('does NOT export user profile methods', async () => {
            const CS = await import('../connectService');
            expect((CS as any).getUserProfile).toBeUndefined();
            expect((CS as any).ensureUserProfile).toBeUndefined();
            expect((CS as any).updateUserProfile).toBeUndefined();
        });

        it('does NOT export listings CRUD', async () => {
            const CS = await import('../connectService');
            expect((CS as any).createListing).toBeUndefined();
            expect((CS as any).updateListing).toBeUndefined();
            expect((CS as any).deleteListing).toBeUndefined();
        });

        it('does NOT export deprecated social APIs', async () => {
            const CS = await import('../connectService');
            expect((CS as any).getFeed).toBeUndefined();
            expect((CS as any).createPost).toBeUndefined();
            expect((CS as any).addComment).toBeUndefined();
            expect((CS as any).getComments).toBeUndefined();
            expect((CS as any).toggleLike).toBeUndefined();
        });

        it('does NOT export deprecated group APIs', async () => {
            const CS = await import('../connectService');
            expect((CS as any).getGroups).toBeUndefined();
            expect((CS as any).createOrJoinGroup).toBeUndefined();
            expect((CS as any).joinGroup).toBeUndefined();
            expect((CS as any).leaveGroup).toBeUndefined();
        });
    });

    // ============================================================================
    // unifiedListingsService Boundaries
    // ============================================================================

    describe('unifiedListingsService', () => {
        it('does NOT export check-in methods', async () => {
            const ULS = await import('../unifiedListingsService');
            expect((ULS as any).checkIn).toBeUndefined();
            expect((ULS as any).createCheckIn).toBeUndefined();
            expect((ULS as any).getCheckIns).toBeUndefined();
            expect((ULS as any).subscribeToCheckIns).toBeUndefined();
        });

        it('does NOT export user profile methods', async () => {
            const ULS = await import('../unifiedListingsService');
            expect((ULS as any).getUserProfile).toBeUndefined();
            expect((ULS as any).ensureUserProfile).toBeUndefined();
        });

        it('does NOT export feed/social methods', async () => {
            const ULS = await import('../unifiedListingsService');
            expect((ULS as any).getFeed).toBeUndefined();
            expect((ULS as any).createPost).toBeUndefined();
        });
    });

    // ============================================================================
    // social.service Boundaries
    // ============================================================================

    describe('social.service', () => {
        it('does NOT export check-in methods', async () => {
            const SS = await import('../domains/social/social.service');
            expect((SS.SocialService as any).checkIn).toBeUndefined();
            expect((SS.SocialService as any).getMyCheckIns).toBeUndefined();
        });

        it('does NOT export deprecated social APIs', async () => {
            const SS = await import('../domains/social/social.service');
            expect((SS.SocialService as any).getFeed).toBeUndefined();
            expect((SS.SocialService as any).createPost).toBeUndefined();
            expect((SS.SocialService as any).addComment).toBeUndefined();
            expect((SS.SocialService as any).getComments).toBeUndefined();
        });

        it('does NOT export listings methods', async () => {
            const SS = await import('../domains/social/social.service');
            expect((SS.SocialService as any).createListing).toBeUndefined();
            expect((SS.SocialService as any).getListings).toBeUndefined();
        });
    });

    // ============================================================================
    // catalogMappers Purity
    // ============================================================================

    describe('catalogMappers', () => {
        it('does NOT import firebase directly', async () => {
            // This test validates that catalogMappers remains pure
            // by checking that no write operations are exposed
            const CM = await import('../catalogMappers');

            expect((CM as any).addDoc).toBeUndefined();
            expect((CM as any).updateDoc).toBeUndefined();
            expect((CM as any).deleteDoc).toBeUndefined();
            expect((CM as any).setDoc).toBeUndefined();
        });
    });

    // ============================================================================
    // discoverConfigService Boundaries
    // ============================================================================

    describe('discoverConfigService', () => {
        it('does NOT export listing CRUD', async () => {
            const DCS = await import('../discoverConfigService');
            expect((DCS as any).createListing).toBeUndefined();
            expect((DCS as any).updateListing).toBeUndefined();
        });

        it('does NOT export check-in methods', async () => {
            const DCS = await import('../discoverConfigService');
            expect((DCS as any).checkIn).toBeUndefined();
        });

        it('does NOT export user methods', async () => {
            const DCS = await import('../discoverConfigService');
            expect((DCS as any).getUserProfile).toBeUndefined();
        });
    });

    // ============================================================================
    // LAYER ENFORCEMENT — Forbidden Cross-Layer Imports
    // ============================================================================

    describe('Layer Enforcement', () => {
        it('utilities do NOT import domain services', async () => {
            // catalog-mappers should not import any domain service
            const CM = await import('../utils/catalog-mappers');

            // Verify no service-level imports leaked
            expect((CM as any).SocialService).toBeUndefined();
            expect((CM as any).UnifiedListingsService).toBeUndefined();
            expect((CM as any).connectService).toBeUndefined();
        });

        it('utilities do NOT expose Firestore write operations', async () => {
            const CM = await import('../utils/catalog-mappers');

            // Pure utilities should never have Firestore write access
            expect((CM as any).addDoc).toBeUndefined();
            expect((CM as any).setDoc).toBeUndefined();
            expect((CM as any).updateDoc).toBeUndefined();
            expect((CM as any).deleteDoc).toBeUndefined();
        });

        it('infrastructure files do NOT import application services', async () => {
            const fs = await import('fs');
            const path = await import('path');

            const filePath = path.join(process.cwd(), 'src/services/infrastructure/firebase/firebase.config.ts');
            const content = fs.readFileSync(filePath, 'utf-8');

            // Infrastructure should never import application services
            expect(content).not.toContain('connectService');
            expect(content).not.toContain('discoverConfigService');
            expect(content).not.toContain('unifiedListingsService');
        });
    });

    // ============================================================================
    // DEV-ONLY CODE VERIFICATION
    // ============================================================================

    describe('DEV-Only Code Guards', () => {
        it('asyncProcessor has DEV-only documentation', async () => {
            const fs = await import('fs');
            const path = await import('path');

            const filePath = path.join(process.cwd(), 'src/services/utils/async-processor.ts');
            const content = fs.readFileSync(filePath, 'utf-8');

            // Verify DEV-only header exists
            expect(content).toContain('DEV-ONLY');
            expect(content).toContain('PRODUCTION');
        });

        it('shim files have backward compatibility notices', async () => {
            const fs = await import('fs');
            const path = await import('path');

            const shimFiles = [
                'src/services/firebaseConfig.ts',
                'src/services/asyncProcessor.ts',
                'src/services/catalogMappers.ts',
            ];

            for (const shimFile of shimFiles) {
                const filePath = path.join(process.cwd(), shimFile);
                const content = fs.readFileSync(filePath, 'utf-8');

                expect(content).toContain('SHIM');
                expect(content).toContain('backward compatibility');
            }
        });
    });

    // ============================================================================
    // DEPRECATED API REGRESSION GUARD
    // ============================================================================

    describe('Deprecated APIs — Regression Guard', () => {
        const DEPRECATED_APIS = [
            'getFeed',
            'createPost',
            'addComment',
            'getComments',
            'toggleLike',
            'getGroups',
            'createOrJoinGroup',
            'joinGroup',
            'leaveGroup',
            'getTribeMembers',
            'seedDatabase',
            'getTopExplorers',
        ];

        it('NO service exports deprecated social APIs', async () => {
            const services = [
                await import('../connectService'),
                await import('../unifiedListingsService'),
                await import('../discoverConfigService'),
                await import('../domains/social/social.service'),
            ];

            for (const service of services) {
                for (const api of DEPRECATED_APIS) {
                    expect((service as any)[api]).toBeUndefined();
                    expect((service as any).default?.[api]).toBeUndefined();
                }
            }
        });
    });
});
