/**
 * Places Controller
 * Handles API endpoints for places/venues data
 */

import { Request, Response } from 'express';
import { placesRepository } from '../repositories';
import { DEFAULT_MARKET_ID, type MarketId, parseMarketId } from '@askmerve/shared';

/**
 * GET /v1/places
 * Get all places with optional filtering
 */
export async function getPlaces(req: Request, res: Response) {
  try {
    // Resolve marketId from query, defaulting to DEFAULT_MARKET_ID
    const cityIdParam = req.query.cityId as string | undefined;
    const cityId: MarketId = parseMarketId(cityIdParam || '') || DEFAULT_MARKET_ID;
    const { category, areaName, featured } = req.query;

    let places;

    if (featured === 'true') {
      places = await placesRepository.getFeatured(cityId as string);
    } else if (category) {
      places = await placesRepository.getByCategory(cityId as string, category as any);
    } else {
      places = await placesRepository.getByCityId(cityId as string);
    }

    // Additional filtering
    if (areaName) {
      places = places.filter(p =>
        p.areaName?.toLowerCase().includes((areaName as string).toLowerCase())
      );
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
  } catch (error) {
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
export async function getPlaceById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const place = await placesRepository.getById(id);

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
  } catch (error) {
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
export async function getNearbyPlaces(req: Request, res: Response) {
  try {
    const { lat, lng, radiusKm = 5, category, limit = 50 } = req.query;

    if (!lat || !lng) {
      res.status(400).json({
        success: false,
        error: 'Missing lat/lng parameters'
      });
      return;
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const radius = parseFloat(radiusKm as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      res.status(400).json({
        success: false,
        error: 'Invalid lat/lng values'
      });
      return;
    }

    // Resolve marketId from query, defaulting to DEFAULT_MARKET_ID
    const cityIdParam = req.query.cityId as string | undefined;
    const cityId: MarketId = parseMarketId(cityIdParam || '') || DEFAULT_MARKET_ID;

    // Get all places from city (we'll filter by distance)
    let places = await placesRepository.getByCityId(cityId);

    // Filter by category if specified
    if (category) {
      places = places.filter(p => p.category === category);
    }

    // Calculate distances and filter
    const placesWithDistance = places
      .map(place => {
        if (!place.coordinates) return null;

        const distance = calculateDistance(
          latitude,
          longitude,
          place.coordinates.lat,
          place.coordinates.lng
        );

        return {
          ...place,
          distance
        };
      })
      .filter(p => p !== null && p.distance <= radius)
      .sort((a, b) => a!.distance - b!.distance)
      .slice(0, parseInt(limit as string));

    res.json({
      success: true,
      places: placesWithDistance,
      count: placesWithDistance.length
    });
  } catch (error) {
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
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
