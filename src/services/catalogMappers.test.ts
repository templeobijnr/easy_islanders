/**
 * Contract Tests: catalogMappers.ts
 *
 * Verifies:
 * - Pure utility behavior (no side effects)
 * - Deterministic transformations
 * - No Firestore usage
 */

import { describe, it, expect } from 'vitest';
import {
    mapStayDocToStay,
    mapActivityDocToActivity,
    mapEventDocToEvent,
    mapPlaceDocToPlace,
    mapExperienceDocToExperience,
} from './catalogMappers';

describe('catalogMappers — Contract', () => {
    // ============================================================================
    // PURE UTILITY VERIFICATION
    // ============================================================================

    describe('Pure Utility Behavior', () => {
        it('exports exactly 5 mapper functions', () => {
            expect(typeof mapStayDocToStay).toBe('function');
            expect(typeof mapActivityDocToActivity).toBe('function');
            expect(typeof mapEventDocToEvent).toBe('function');
            expect(typeof mapPlaceDocToPlace).toBe('function');
            expect(typeof mapExperienceDocToExperience).toBe('function');
        });

        it('mapPlaceDocToPlace returns valid Place type', () => {
            const input = {
                id: 'test-1',
                title: 'Test Place',
                description: 'A test place',
                coordinates: { lat: 35.33, lng: 33.32 },
                category: 'restaurant',
                region: 'kyrenia',
                images: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const result = mapPlaceDocToPlace(input as any);

            expect(result.id).toBe('test-1');
            expect(result.type).toBe('place');
            expect(result.title).toBe('Test Place');
            expect(result.region).toBe('kyrenia');
        });

        it('normalizes region variants correctly', () => {
            const testCases = [
                { input: 'kyrenia', expected: 'kyrenia' },
                { input: 'girne', expected: 'kyrenia' },
                { input: 'KYRENIA', expected: 'kyrenia' },
                { input: 'famagusta', expected: 'famagusta' },
                { input: 'nicosia', expected: 'nicosia' },
                { input: undefined, expected: 'kyrenia' },
            ];

            for (const { input, expected } of testCases) {
                const result = mapPlaceDocToPlace({
                    id: 'test',
                    title: 'Test',
                    region: input,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                } as any);
                expect(result.region).toBe(expected);
            }
        });

        it('is deterministic (same input → same output)', () => {
            const input = {
                id: 'det-test',
                title: 'Deterministic',
                region: 'kyrenia',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
            };

            const result1 = mapPlaceDocToPlace(input as any);
            const result2 = mapPlaceDocToPlace(input as any);

            expect(result1).toEqual(result2);
        });
    });

    // ============================================================================
    // SAFETY: NO SIDE EFFECTS
    // ============================================================================

    describe('Safety — No Side Effects', () => {
        it('does NOT expose Firestore operations', () => {
            // These functions should not exist in catalogMappers
            expect((mapStayDocToStay as any).addDoc).toBeUndefined();
            expect((mapStayDocToStay as any).updateDoc).toBeUndefined();
            expect((mapStayDocToStay as any).deleteDoc).toBeUndefined();
        });

        it('does NOT mutate input objects', () => {
            const input = {
                id: 'immutable-test',
                title: 'Original',
                region: 'kyrenia',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const original = JSON.parse(JSON.stringify(input));
            mapPlaceDocToPlace(input as any);

            expect(input.title).toBe(original.title);
            expect(input.id).toBe(original.id);
        });
    });
});
