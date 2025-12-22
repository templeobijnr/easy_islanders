/**
 * Unit tests for location utilities
 */

import { describe, it, expect } from 'vitest';
import {
    createGoogleMapsLink,
    createGoogleMapsLinkFromLocation,
    createGoogleMapsDirectionsLink,
    CoordinatesSchema,
    LocationSchema,
} from '../schemas/location.schema';

describe('Location Schema', () => {
    describe('CoordinatesSchema', () => {
        it('accepts valid coordinates', () => {
            const result = CoordinatesSchema.safeParse({ lat: 35.33, lng: 33.32 });
            expect(result.success).toBe(true);
        });

        it('rejects latitude out of range', () => {
            const result = CoordinatesSchema.safeParse({ lat: 91, lng: 33.32 });
            expect(result.success).toBe(false);
        });

        it('rejects longitude out of range', () => {
            const result = CoordinatesSchema.safeParse({ lat: 35.33, lng: 181 });
            expect(result.success).toBe(false);
        });
    });

    describe('LocationSchema', () => {
        it('accepts location with address only', () => {
            const result = LocationSchema.safeParse({ address: 'Kyrenia Harbour' });
            expect(result.success).toBe(true);
        });

        it('accepts location with all fields', () => {
            const result = LocationSchema.safeParse({
                address: 'Kyrenia Harbour',
                coordinates: { lat: 35.33, lng: 33.32 },
                placeId: 'ChIJ123...',
                placeName: 'Harbour',
                notes: 'Near the castle',
            });
            expect(result.success).toBe(true);
        });

        it('rejects location without address', () => {
            const result = LocationSchema.safeParse({});
            expect(result.success).toBe(false);
        });
    });
});

describe('createGoogleMapsLink', () => {
    it('generates correct URL for Kyrenia coordinates', () => {
        const link = createGoogleMapsLink(35.33, 33.32);
        expect(link).toBe('https://maps.google.com/?q=35.33,33.32');
    });

    it('generates correct URL for southern hemisphere', () => {
        const link = createGoogleMapsLink(-33.87, 151.21);
        expect(link).toBe('https://maps.google.com/?q=-33.87,151.21');
    });

    it('throws for invalid latitude', () => {
        expect(() => createGoogleMapsLink(91, 33.32)).toThrow('Invalid latitude');
        expect(() => createGoogleMapsLink(-91, 33.32)).toThrow('Invalid latitude');
    });

    it('throws for invalid longitude', () => {
        expect(() => createGoogleMapsLink(35.33, 181)).toThrow('Invalid longitude');
        expect(() => createGoogleMapsLink(35.33, -181)).toThrow('Invalid longitude');
    });
});

describe('createGoogleMapsLinkFromLocation', () => {
    it('returns link when coordinates present', () => {
        const location = {
            address: 'Kyrenia Harbour',
            coordinates: { lat: 35.33, lng: 33.32 },
        };
        const link = createGoogleMapsLinkFromLocation(location);
        expect(link).toBe('https://maps.google.com/?q=35.33,33.32');
    });

    it('returns undefined when no coordinates', () => {
        const location = { address: 'Kyrenia Harbour' };
        const link = createGoogleMapsLinkFromLocation(location);
        expect(link).toBeUndefined();
    });
});

describe('createGoogleMapsDirectionsLink', () => {
    it('generates directions URL between two points', () => {
        const origin = { lat: 35.33, lng: 33.32 };
        const destination = { lat: 35.18, lng: 33.36 };
        const link = createGoogleMapsDirectionsLink(origin, destination);
        expect(link).toBe(
            'https://www.google.com/maps/dir/?api=1&origin=35.33,33.32&destination=35.18,33.36'
        );
    });
});
