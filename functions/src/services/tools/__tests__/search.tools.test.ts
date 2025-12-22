/**
 * Search Tools Tests
 *
 * Tests for marketplace search, local places, and event discovery.
 */

// ============================================================================
// Mock Setup
// ============================================================================

jest.mock('firebase-functions/logger', () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

const mockTypesenseResult = {
    found: 2,
    hits: [
        {
            id: 'listing-1',
            title: 'Beach Villa',
            price: 150000,
            location: 'Girne',
            domain: 'Real Estate',
            category: 'Villas',
            subCategory: 'Beach Front',
            description: 'Beautiful beach villa',
            metadata: {
                imageUrl: 'https://example.com/villa.jpg',
                amenities: ['Pool', 'Garden'],
                rating: 4.5
            }
        },
        {
            id: 'listing-2',
            title: 'City Apartment',
            price: 80000,
            location: 'Lefkosa',
            domain: 'Real Estate',
            category: 'Apartments',
            description: 'Modern city apartment',
            metadata: {
                imageUrl: 'https://example.com/apt.jpg',
                rating: 4.2
            }
        }
    ]
};

jest.mock('../../typesense.service', () => ({
    searchListings: jest.fn(() => Promise.resolve(mockTypesenseResult))
}));

const mockMapboxPlaces = [
    {
        id: 'poi.123',
        text: 'Bellapais Monastery',
        place_name: 'Bellapais Monastery, Kyrenia, Northern Cyprus',
        center: [33.35, 35.30],
        properties: {
            category: 'Historic Site',
            address: 'Bellapais Village'
        }
    },
    {
        id: 'poi.456',
        text: 'Kyrenia Harbor',
        place_name: 'Kyrenia Harbor, Kyrenia, Northern Cyprus',
        center: [33.32, 35.34],
        properties: {
            category: 'Marina',
            address: 'Harbor Road'
        }
    }
];

jest.mock('../../mapbox.service', () => ({
    searchMapboxPlaces: jest.fn(() => Promise.resolve(mockMapboxPlaces))
}));

// IMPORTANT:
// Import the module-under-test AFTER mocks are registered.
// Static `import` is hoisted and would load real implementations before mocks apply.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { searchTools } = require('../search.tools');

// ============================================================================
// Tests
// ============================================================================

describe('Search Tools', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('searchMarketplace', () => {
        it('should return formatted results from Typesense', async () => {
            const results = await searchTools.searchMarketplace({
                query: 'villa',
                domain: 'Real Estate'
            });

            expect(results).toHaveLength(2);
            expect(results[0]).toMatchObject({
                id: 'listing-1',
                title: 'Beach Villa',
                price: 150000,
                location: 'Girne',
                domain: 'Real Estate'
            });
        });

        it('should extract metadata fields into top-level properties', async () => {
            const results = await searchTools.searchMarketplace({
                query: 'villa'
            });

            expect(results[0].imageUrl).toBe('https://example.com/villa.jpg');
            expect(results[0].amenities).toEqual(['Pool', 'Garden']);
            expect(results[0].rating).toBe(4.5);
        });

        it('should pass all filter parameters to Typesense', async () => {
            const { searchListings } = require('../../typesense.service');

            await searchTools.searchMarketplace({
                query: 'apartment',
                domain: 'Real Estate',
                category: 'Apartments',
                subCategory: 'Studio',
                location: 'Girne',
                minPrice: 50000,
                maxPrice: 100000
            });

            expect(searchListings).toHaveBeenCalledWith({
                query: 'apartment',
                domain: 'Real Estate',
                category: 'Apartments',
                subCategory: 'Studio',
                location: 'Girne',
                minPrice: 50000,
                maxPrice: 100000,
                perPage: 20
            });
        });

        it('should return empty array when Typesense fails', async () => {
            const { searchListings } = require('../../typesense.service');
            searchListings.mockRejectedValueOnce(new Error('Connection failed'));

            const results = await searchTools.searchMarketplace({
                query: 'test'
            });

            expect(results).toEqual([]);
        });

        it('should use wildcard query when no query provided', async () => {
            const { searchListings } = require('../../typesense.service');

            await searchTools.searchMarketplace({});

            expect(searchListings).toHaveBeenCalledWith(
                expect.objectContaining({ query: '*' })
            );
        });
    });

    describe('searchLocalPlaces', () => {
        it('should return formatted results from Mapbox', async () => {
            const results = await searchTools.searchLocalPlaces({
                query: 'monastery',
                domain: 'Tourism'
            });

            expect(results).toHaveLength(2);
            expect(results[0]).toMatchObject({
                id: 'poi.123',
                title: 'Bellapais Monastery',
                location: 'Bellapais Monastery, Kyrenia, Northern Cyprus'
            });
        });

        it('should include coordinates from Mapbox center', async () => {
            const results = await searchTools.searchLocalPlaces({
                query: 'harbor'
            });

            expect(results[0].coordinates).toEqual({
                lat: 35.30,
                lng: 33.35
            });
        });

        it('should combine query and location for better accuracy', async () => {
            const { searchMapboxPlaces } = require('../../mapbox.service');

            await searchTools.searchLocalPlaces({
                query: 'restaurant',
                location: 'Kyrenia'
            });

            expect(searchMapboxPlaces).toHaveBeenCalledWith(
                'restaurant in Kyrenia',
                expect.objectContaining({ types: 'poi', limit: 10 })
            );
        });

        it('should return empty array when Mapbox fails', async () => {
            const { searchMapboxPlaces } = require('../../mapbox.service');
            searchMapboxPlaces.mockRejectedValueOnce(new Error('API Error'));

            const results = await searchTools.searchLocalPlaces({
                query: 'test'
            });

            expect(results).toEqual([]);
        });
    });

    describe('searchEvents', () => {
        it('should search for events in the Events domain', async () => {
            const { searchListings } = require('../../typesense.service');

            await searchTools.searchEvents({
                query: 'music festival'
            });

            expect(searchListings).toHaveBeenCalledWith(
                expect.objectContaining({
                    domain: 'Events',
                    query: 'music festival'
                })
            );
        });

        it('should include location filter when provided', async () => {
            const { searchListings } = require('../../typesense.service');

            await searchTools.searchEvents({
                query: 'concert',
                location: 'Girne'
            });

            expect(searchListings).toHaveBeenCalledWith(
                expect.objectContaining({
                    location: 'Girne'
                })
            );
        });

        it('should return empty array on failure', async () => {
            const { searchListings } = require('../../typesense.service');
            searchListings.mockRejectedValueOnce(new Error('Search failed'));

            const results = await searchTools.searchEvents({ query: 'test' });

            expect(results).toEqual([]);
        });
    });

    describe('searchHousingListings', () => {
        it('should search with housing-specific filters', async () => {
            const { searchListings } = require('../../typesense.service');

            await searchTools.searchHousingListings(
                {
                    areaName: 'Kyrenia',
                    budgetMin: 50000,
                    budgetMax: 150000,
                    bedrooms: 3
                },
                {}
            );

            expect(searchListings).toHaveBeenCalledWith(
                expect.objectContaining({
                    domain: 'Real Estate',
                    category: 'housing',
                    location: 'Kyrenia',
                    minPrice: 50000,
                    maxPrice: 150000,
                    bedrooms: 3
                })
            );
        });
    });

    describe('searchPlaces', () => {
        it('should try Typesense first for curated places', async () => {
            const { searchListings } = require('../../typesense.service');

            await searchTools.searchPlaces(
                { tag: 'beach', category: 'Recreation' },
                {}
            );

            expect(searchListings).toHaveBeenCalledWith(
                expect.objectContaining({
                    domain: 'Places',
                    query: 'beach',
                    category: 'Recreation'
                })
            );
        });

        it('should fallback to Mapbox when Typesense returns no results', async () => {
            const { searchListings } = require('../../typesense.service');
            const { searchMapboxPlaces } = require('../../mapbox.service');

            searchListings.mockResolvedValueOnce({ found: 0, hits: [] });

            await searchTools.searchPlaces(
                { tag: 'historic', category: 'Tourism' },
                {}
            );

            expect(searchMapboxPlaces).toHaveBeenCalled();
        });

        it('should fallback to Mapbox when Typesense fails', async () => {
            const { searchListings } = require('../../typesense.service');
            const { searchMapboxPlaces } = require('../../mapbox.service');

            searchListings.mockRejectedValueOnce(new Error('Typesense down'));

            await searchTools.searchPlaces({ tag: 'restaurant' }, {});

            expect(searchMapboxPlaces).toHaveBeenCalled();
        });
    });
});
