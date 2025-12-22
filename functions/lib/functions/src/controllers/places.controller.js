"use strict";
/**
 * Places Controller
 * Handles API endpoints for places/venues data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlaces = getPlaces;
exports.getPlaceById = getPlaceById;
exports.getNearbyPlaces = getNearbyPlaces;
const repositories_1 = require("../repositories");
const shared_1 = require("@askmerve/shared");
/**
 * GET /v1/places
 * Get all places with optional filtering
 */
async function getPlaces(req, res) {
    try {
        // Resolve marketId from query, defaulting to DEFAULT_MARKET_ID
        const cityIdParam = req.query.cityId;
        const cityId = (0, shared_1.parseMarketId)(cityIdParam || '') || shared_1.DEFAULT_MARKET_ID;
        const { category, areaName, featured } = req.query;
        let places;
        if (featured === 'true') {
            places = await repositories_1.placesRepository.getFeatured(cityId);
        }
        else if (category) {
            places = await repositories_1.placesRepository.getByCategory(cityId, category);
        }
        else {
            places = await repositories_1.placesRepository.getByCityId(cityId);
        }
        // Additional filtering
        if (areaName) {
            places = places.filter(p => { var _a; return (_a = p.areaName) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(areaName.toLowerCase()); });
        }
        // Transform to frontend-friendly format
        const mapped = places.map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            subcategory: p.subcategory,
            areaName: p.areaName,
            address: p.address,
            description: p.descriptionShort || p.descriptionLong,
            tags: p.tags,
            phone: p.phone,
            whatsapp: p.whatsapp,
            instagram: p.instagram,
            website: p.website,
            priceLevel: p.averagePriceLevel,
            rating: p.ratingAverage,
            actions: p.actions,
            coordinates: p.coordinates,
            images: p.images,
            featured: p.isFeatured,
            active: p.isActive
        }));
        res.json({
            success: true,
            places: mapped,
            count: mapped.length
        });
    }
    catch (error) {
        console.error('Error fetching places:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch places'
        });
    }
}
/**
 * GET /v1/places/:id
 * Get a single place by ID
 */
async function getPlaceById(req, res) {
    try {
        const { id } = req.params;
        const place = await repositories_1.placesRepository.getById(id);
        if (!place) {
            res.status(404).json({
                success: false,
                error: 'Place not found'
            });
            return;
        }
        res.json({
            success: true,
            place
        });
    }
    catch (error) {
        console.error('Error fetching place:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch place'
        });
    }
}
/**
 * GET /v1/places/nearby
 * Get places near a location
 */
async function getNearbyPlaces(req, res) {
    try {
        const { lat, lng, radiusKm = 5, category, limit = 50 } = req.query;
        if (!lat || !lng) {
            res.status(400).json({
                success: false,
                error: 'Missing lat/lng parameters'
            });
            return;
        }
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        const radius = parseFloat(radiusKm);
        if (isNaN(latitude) || isNaN(longitude)) {
            res.status(400).json({
                success: false,
                error: 'Invalid lat/lng values'
            });
            return;
        }
        // Resolve marketId from query, defaulting to DEFAULT_MARKET_ID
        const cityIdParam = req.query.cityId;
        const cityId = (0, shared_1.parseMarketId)(cityIdParam || '') || shared_1.DEFAULT_MARKET_ID;
        // Get all places from city (we'll filter by distance)
        let places = await repositories_1.placesRepository.getByCityId(cityId);
        // Filter by category if specified
        if (category) {
            places = places.filter(p => p.category === category);
        }
        // Calculate distances and filter
        const placesWithDistance = places
            .map(place => {
            if (!place.coordinates)
                return null;
            const distance = calculateDistance(latitude, longitude, place.coordinates.lat, place.coordinates.lng);
            return Object.assign(Object.assign({}, place), { distance });
        })
            .filter(p => p !== null && p.distance <= radius)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, parseInt(limit));
        res.json({
            success: true,
            places: placesWithDistance,
            count: placesWithDistance.length
        });
    }
    catch (error) {
        console.error('Error fetching nearby places:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch nearby places'
        });
    }
}
/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
function toRad(degrees) {
    return degrees * (Math.PI / 180);
}
//# sourceMappingURL=places.controller.js.map