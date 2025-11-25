import axios from 'axios';

// Interfaces for OSM data
interface OSMPlace {
    id: string;
    name: string;
    address: string;
    category: string;
    location: {
        lat: number;
        lng: number;
    };
    type: string;
}

export class OSMService {
    private static OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
    private static NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

    /**
     * Search for places by category using Overpass API
     * @param category - 'food', 'nightlife', 'sights', etc.
     * @param lat - Latitude
     * @param lng - Longitude
     * @param radius - Radius in meters (default 5000)
     */
    static async searchNearby(category: string, lat: number, lng: number, radius: number = 5000): Promise<OSMPlace[]> {
        try {
            // Map categories to OSM tags
            const tagMap: Record<string, string> = {
                'food': '["amenity"~"restaurant|cafe|fast_food|bar|pub"]',
                'nightlife': '["amenity"~"bar|pub|nightclub|casino"]',
                'sights': '["tourism"~"museum|viewpoint|attraction|artwork"]["historic"]',
                'shopping': '["shop"]',
                'all': '["amenity"]["tourism"]'
            };

            const tagFilter = tagMap[category] || tagMap['all'];

            // Overpass QL Query
            const query = `
                [out:json][timeout:25];
                (
                  node${tagFilter}(around:${radius},${lat},${lng});
                  way${tagFilter}(around:${radius},${lat},${lng});
                );
                out center 20;
            `;

            const response = await axios.get(this.OVERPASS_URL, {
                params: { data: query }
            });

            if (!response.data.elements) return [];

            return response.data.elements.map((el: any) => {
                const tags = el.tags || {};
                const latitude = el.lat || el.center?.lat;
                const longitude = el.lon || el.center?.lon;

                if (!latitude || !longitude) return null;

                // Determine simplified category
                let cat = 'Place';
                if (tags.amenity === 'restaurant' || tags.amenity === 'cafe') cat = 'Restaurant';
                if (tags.amenity === 'bar' || tags.amenity === 'nightclub') cat = 'Nightlife';
                if (tags.tourism) cat = 'Attraction';

                return {
                    id: `osm_${el.id}`,
                    name: tags.name || tags['name:en'] || 'Unnamed Place',
                    address: tags['addr:street'] ? `${tags['addr:street']} ${tags['addr:housenumber'] || ''}` : 'Cyprus',
                    category: cat,
                    location: { lat: latitude, lng: longitude },
                    type: category
                };
            }).filter((p: any) => p !== null && p.name !== 'Unnamed Place');

        } catch (error) {
            console.error("🔴 [OSM] Overpass Search Error:", error);
            return [];
        }
    }

    /**
     * Search for specific places by text using Nominatim
     * @param query - Search query (e.g., "Kyrenia Castle")
     */
    static async searchByText(query: string): Promise<OSMPlace[]> {
        try {
            const response = await axios.get(this.NOMINATIM_URL, {
                params: {
                    q: query,
                    format: 'json',
                    addressdetails: 1,
                    limit: 10,
                    countrycodes: 'cy' // Limit to Cyprus
                },
                headers: {
                    'User-Agent': 'EasyIslanders/1.0' // Required by Nominatim
                }
            });

            return response.data.map((item: any) => ({
                id: `osm_${item.osm_id}`,
                name: item.name || item.display_name.split(',')[0],
                address: item.display_name,
                category: item.type,
                location: {
                    lat: parseFloat(item.lat),
                    lng: parseFloat(item.lon)
                },
                type: 'search_result'
            }));

        } catch (error) {
            console.error("🔴 [OSM] Nominatim Search Error:", error);
            return [];
        }
    }
}
