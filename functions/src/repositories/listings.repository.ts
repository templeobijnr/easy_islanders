/**
 * Listings Repository
 * Manages housing and car rental listings
 */
import { db } from '../config/firebase';
import { Listing, ListingKind } from '../types/v1';

const COLLECTION = 'listings';

export const listingsRepository = {
  /**
   * Create a new listing
   */
  async create(listing: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>): Promise<Listing> {
    const now = new Date().toISOString();
    const docRef = await db.collection(COLLECTION).add({
      ...listing,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: docRef.id,
      ...listing,
      createdAt: now,
      updatedAt: now,
    };
  },

  /**
   * Get listing by ID
   */
  async getById(listingId: string): Promise<Listing | null> {
    const doc = await db.collection(COLLECTION).doc(listingId).get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    } as Listing;
  },

  /**
   * Get listings by kind (housing or car_rental)
   */
  async getByKind(cityId: string, kind: ListingKind): Promise<Listing[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('cityId', '==', cityId)
      .where('kind', '==', kind)
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Listing));
  },

  /**
   * Search housing listings
   */
  async searchHousing(
    cityId: string,
    filters?: {
      minPrice?: number;
      maxPrice?: number;
      bedrooms?: number;
      housingType?: 'apartment' | 'villa' | 'room' | 'studio';
      areaName?: string;
      furnished?: boolean;
    }
  ): Promise<Listing[]> {
    let query = db
      .collection(COLLECTION)
      .where('cityId', '==', cityId)
      .where('kind', '==', 'housing')
      .where('isActive', '==', true);

    if (filters?.bedrooms) {
      query = query.where('housing.bedrooms', '==', filters.bedrooms);
    }

    if (filters?.housingType) {
      query = query.where('housing.type', '==', filters.housingType);
    }

    if (filters?.areaName) {
      query = query.where('housing.areaName', '==', filters.areaName);
    }

    if (filters?.furnished !== undefined) {
      query = query.where('housing.furnished', '==', filters.furnished);
    }

    const snapshot = await query.get();

    let results = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Listing));

    // Client-side filtering for price range
    if (filters?.minPrice) {
      results = results.filter(listing => listing.price >= filters.minPrice!);
    }

    if (filters?.maxPrice) {
      results = results.filter(listing => listing.price <= filters.maxPrice!);
    }

    return results;
  },

  /**
   * Search car rental listings
   */
  async searchCarRentals(
    cityId: string,
    filters?: {
      minPrice?: number;
      maxPrice?: number;
      carType?: 'small' | 'sedan' | 'SUV' | 'van' | 'other';
      transmission?: 'manual' | 'automatic';
      minSeats?: number;
    }
  ): Promise<Listing[]> {
    let query = db
      .collection(COLLECTION)
      .where('cityId', '==', cityId)
      .where('kind', '==', 'car_rental')
      .where('isActive', '==', true);

    if (filters?.carType) {
      query = query.where('carRental.carType', '==', filters.carType);
    }

    if (filters?.transmission) {
      query = query.where('carRental.transmission', '==', filters.transmission);
    }

    const snapshot = await query.get();

    let results = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Listing));

    // Client-side filtering
    if (filters?.minPrice) {
      results = results.filter(listing => listing.price >= filters.minPrice!);
    }

    if (filters?.maxPrice) {
      results = results.filter(listing => listing.price <= filters.maxPrice!);
    }

    if (filters?.minSeats) {
      results = results.filter(
        listing => (listing.carRental?.seats || 0) >= filters.minSeats!
      );
    }

    return results;
  },

  /**
   * Get featured listings
   */
  async getFeatured(cityId: string, kind?: ListingKind): Promise<Listing[]> {
    let query = db
      .collection(COLLECTION)
      .where('cityId', '==', cityId)
      .where('isFeatured', '==', true)
      .where('isActive', '==', true);

    if (kind) {
      query = query.where('kind', '==', kind);
    }

    const snapshot = await query.get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Listing));
  },

  /**
   * Get all active listings in a city
   */
  async getByCityId(cityId: string): Promise<Listing[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('cityId', '==', cityId)
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Listing));
  },

  /**
   * Update listing
   */
  async update(listingId: string, updates: Partial<Listing>): Promise<void> {
    await db.collection(COLLECTION).doc(listingId).set(
      {
        ...updates,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  },

  /**
   * Delete listing (soft delete)
   */
  async delete(listingId: string): Promise<void> {
    await db.collection(COLLECTION).doc(listingId).set(
      {
        isActive: false,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  },
};
