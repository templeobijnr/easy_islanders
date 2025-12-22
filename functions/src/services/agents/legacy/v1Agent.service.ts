/**
 * V1 Agent Service
 * Implements V1 chat agent tool functions.
 *
 * All functions require ToolContext with marketId for multi-market support.
 * See architecture doc section 14 for MarketContext invariants.
 */

import {
  placesRepository,
  activitiesRepository,
  listingsRepository,
  requestsRepository
} from '../../../repositories';
import { type ToolContext, requireToolMarketId } from '../../tools/toolContext';

// ============================================================================
// PLACES & DISCOVERY
// ============================================================================

export async function searchPlaces(
  ctx: ToolContext,
  params: {
    category?: string;
    areaName?: string;
    tags?: string[];
    featured?: boolean;
  }
) {
  const cityId = requireToolMarketId(ctx, 'searchPlaces');

  try {
    let places;

    if (params.featured) {
      places = await placesRepository.getFeatured(cityId);
    } else if (params.category) {
      places = await placesRepository.getByCategory(cityId, params.category as any);
    } else if (params.tags && params.tags.length > 0) {
      places = await placesRepository.getByTags(cityId, params.tags);
    } else if (params.areaName) {
      // For area search, we need to get all places and filter client-side
      // since we don't have areaId, only areaName
      const allPlaces = await placesRepository.getByCityId(cityId);
      places = allPlaces.filter(p =>
        p.areaName?.toLowerCase().includes(params.areaName!.toLowerCase())
      );
    } else {
      places = await placesRepository.getByCityId(cityId);
    }

    // Additional filtering
    if (params.areaName && !params.areaName) {
      places = places.filter(p =>
        p.areaName?.toLowerCase().includes(params.areaName!.toLowerCase())
      );
    }

    return {
      success: true,
      places: places.map(p => ({
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
        priceLevel: p.averagePriceLevel,
        rating: p.ratingAverage,
        actions: p.actions,
        coordinates: p.coordinates
      })),
      count: places.length
    };
  } catch (error) {
    console.error('Error searching places:', error);
    return {
      success: false,
      error: 'Failed to search places',
      places: [],
      count: 0
    };
  }
}

export async function searchActivities(
  ctx: ToolContext,
  params: {
    category?: string;
    when?: string;
    placeId?: string;
  }
) {
  const cityId = requireToolMarketId(ctx, 'searchActivities');

  try {
    let activities;

    if (params.placeId) {
      activities = await activitiesRepository.getByPlace(params.placeId);
    } else if (params.category) {
      activities = await activitiesRepository.getByCategory(cityId, params.category as any);
    } else if (params.when === 'upcoming' || params.when === 'this_week') {
      activities = await activitiesRepository.getUpcoming(cityId);
    } else if (params.when === 'this_weekend') {
      // Get Friday to Sunday
      const friday = new Date();
      friday.setDate(friday.getDate() + (5 - friday.getDay()));
      const sunday = new Date(friday);
      sunday.setDate(sunday.getDate() + 2);

      activities = await activitiesRepository.getByDateRange(
        cityId,
        friday.toISOString(),
        sunday.toISOString()
      );
    } else if (params.when === 'today') {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      activities = await activitiesRepository.getByDateRange(
        cityId,
        today.toISOString(),
        tomorrow.toISOString()
      );
    } else {
      activities = await activitiesRepository.getUpcoming(cityId);
    }

    return {
      success: true,
      activities: activities.map(a => ({
        id: a.id,
        title: a.title,
        description: a.description,
        category: a.category,
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        price: a.price,
        isFree: a.isFree,
        placeId: a.placeId,
        coordinates: a.coordinates,
        hostName: a.hostName,
        hostContact: a.hostContactWhatsApp,
        bookingType: a.bookingType,
        bookingTarget: a.bookingTarget,
        images: a.images
      })),
      count: activities.length
    };
  } catch (error) {
    console.error('Error searching activities:', error);
    return {
      success: false,
      error: 'Failed to search activities',
      activities: [],
      count: 0
    };
  }
}

// ============================================================================
// HOUSING
// ============================================================================

export async function searchHousingListings(
  ctx: ToolContext,
  params: {
    housingType?: string;
    bedrooms?: number;
    minPrice?: number;
    maxPrice?: number;
    areaName?: string;
    furnished?: boolean;
  }
) {
  const cityId = requireToolMarketId(ctx, 'searchHousingListings');

  try {
    const listings = await listingsRepository.searchHousing(cityId, {
      housingType: params.housingType as any,
      bedrooms: params.bedrooms,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      areaName: params.areaName,
      furnished: params.furnished
    });

    return {
      success: true,
      listings: listings.map(l => ({
        id: l.id,
        title: l.title,
        description: l.description,
        price: l.price,
        priceUnit: l.priceUnit,
        type: l.housing?.type,
        bedrooms: l.housing?.bedrooms,
        bathrooms: l.housing?.bathrooms,
        furnished: l.housing?.furnished,
        areaName: l.housing?.areaName,
        sizeSqm: l.housing?.sizeSqm,
        floor: l.housing?.floor,
        minStayMonths: l.housing?.minStayMonths,
        images: l.images,
        tags: l.tags,
        bookingType: l.bookingType,
        bookingTarget: l.bookingTarget,
        coordinates: l.coordinates
      })),
      count: listings.length
    };
  } catch (error) {
    console.error('Error searching housing:', error);
    return {
      success: false,
      error: 'Failed to search housing listings',
      listings: [],
      count: 0
    };
  }
}

export async function createHousingRequest(
  ctx: ToolContext,
  params: {
    description: string;
    bedrooms?: number;
    budgetMin?: number;
    budgetMax?: number;
    areaName?: string;
    moveInDate?: string;
    contactPhone?: string;
    notes?: string;
  }
) {
  const cityId = requireToolMarketId(ctx, 'createHousingRequest');
  const userId = ctx.userId;
  if (!userId) {
    return { success: false, error: 'User authentication required' };
  }

  try {
    const request = await requestsRepository.create({
      userId,
      cityId,
      category: 'HOUSING',
      title: `Housing Request: ${params.bedrooms || ''} bedroom ${params.areaName || ''}`.trim(),
      description: params.description,
      meta: {
        beds: params.bedrooms,
        budgetMin: params.budgetMin,
        budgetMax: params.budgetMax,
        areaName: params.areaName,
        fromDate: params.moveInDate,
        intent: 'rent',
        notes: params.notes
      },
      status: 'new',
      contactPhone: params.contactPhone,
      preferredContact: params.contactPhone ? 'phone' : 'in_app'
    });

    return {
      success: true,
      requestId: request.id,
      message: 'Housing request created! Our agents will contact you within 24 hours with suitable options.',
      request: {
        id: request.id,
        title: request.title,
        description: request.description,
        status: request.status
      }
    };
  } catch (error) {
    console.error('Error creating housing request:', error);
    return {
      success: false,
      error: 'Failed to create housing request'
    };
  }
}

// ============================================================================
// CAR RENTAL
// ============================================================================

export async function searchCarRentalListings(
  ctx: ToolContext,
  params: {
    carType?: string;
    transmission?: string;
    minSeats?: number;
    minPrice?: number;
    maxPrice?: number;
  }
) {
  const cityId = requireToolMarketId(ctx, 'searchCarRentalListings');

  try {
    const listings = await listingsRepository.searchCarRentals(cityId, {
      carType: params.carType as any,
      transmission: params.transmission as any,
      minSeats: params.minSeats,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice
    });

    return {
      success: true,
      listings: listings.map(l => ({
        id: l.id,
        title: l.title,
        description: l.description,
        price: l.price,
        priceUnit: l.priceUnit,
        carType: l.carRental?.carType,
        transmission: l.carRental?.transmission,
        seats: l.carRental?.seats,
        mileageLimit: l.carRental?.mileageLimitPerDay,
        images: l.images,
        tags: l.tags,
        bookingType: l.bookingType,
        bookingTarget: l.bookingTarget
      })),
      count: listings.length
    };
  } catch (error) {
    console.error('Error searching car rentals:', error);
    return {
      success: false,
      error: 'Failed to search car rental listings',
      listings: [],
      count: 0
    };
  }
}

export async function createCarRentalRequest(
  ctx: ToolContext,
  params: {
    description: string;
    carType?: string;
    rentalDays?: number;
    fromDate?: string;
    toDate?: string;
    contactPhone?: string;
    notes?: string;
  }
) {
  const cityId = requireToolMarketId(ctx, 'createCarRentalRequest');
  const userId = ctx.userId;
  if (!userId) {
    return { success: false, error: 'User authentication required' };
  }

  try {
    const request = await requestsRepository.create({
      userId,
      cityId,
      category: 'CAR_RENTAL',
      title: `Car Rental: ${params.carType || 'Any'} for ${params.rentalDays || ''} days`.trim(),
      description: params.description,
      meta: {
        carType: params.carType,
        rentalDays: params.rentalDays,
        fromDate: params.fromDate,
        toDate: params.toDate,
        notes: params.notes
      },
      status: 'new',
      contactPhone: params.contactPhone,
      preferredContact: params.contactPhone ? 'phone' : 'in_app'
    });

    return {
      success: true,
      requestId: request.id,
      message: 'Car rental request created! We\'ll send you available options shortly.',
      request: {
        id: request.id,
        title: request.title,
        description: request.description,
        status: request.status
      }
    };
  } catch (error) {
    console.error('Error creating car rental request:', error);
    return {
      success: false,
      error: 'Failed to create car rental request'
    };
  }
}

// ============================================================================
// SERVICES & SUPPLIES
// ============================================================================

export async function createServiceRequest(
  ctx: ToolContext,
  params: {
    category: 'WATER_GAS' | 'GROCERIES' | 'OTHER';
    title: string;
    description: string;
    when?: string;
    location?: string;
    quantity?: number;
    contactPhone?: string;
    notes?: string;
  }
) {
  const cityId = requireToolMarketId(ctx, 'createServiceRequest');
  const userId = ctx.userId;
  if (!userId) {
    return { success: false, error: 'User authentication required' };
  }

  try {
    const request = await requestsRepository.create({
      userId,
      cityId,
      category: params.category,
      title: params.title,
      description: params.description,
      meta: {
        when: params.when as any,
        areaName: params.location,
        quantity: params.quantity,
        notes: params.notes
      },
      status: 'new',
      contactPhone: params.contactPhone,
      preferredContact: params.contactPhone ? 'phone' : 'in_app'
    });

    return {
      success: true,
      requestId: request.id,
      message: 'Service request created! We\'ll arrange this for you and get back to you soon.',
      request: {
        id: request.id,
        title: request.title,
        description: request.description,
        status: request.status,
        category: request.category
      }
    };
  } catch (error) {
    console.error('Error creating service request:', error);
    return {
      success: false,
      error: 'Failed to create service request'
    };
  }
}
