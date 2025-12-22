/**
 * Places Repository
 * Manages venues (restaurants, bars, cafes, sights, etc.)
 */
import { db } from '../config/firebase';
import { Place, PlaceCategory } from '../types/v1';

const COLLECTION = 'places';

export const placesRepository = {
  /**
   * Create a new place
   */
  async create(place: Omit<Place, 'id' | 'createdAt' | 'updatedAt'>): Promise<Place> {
    const now = new Date().toISOString();
    const docRef = await db.collection(COLLECTION).add({
      ...place,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: docRef.id,
      ...place,
      createdAt: now,
      updatedAt: now,
    };
  },

  /**
   * Get place by ID
   */
  async getById(placeId: string): Promise<Place | null> {
    const doc = await db.collection(COLLECTION).doc(placeId).get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    } as Place;
  },

  /**
   * Search places by category
   */
  async getByCategory(cityId: string, category: PlaceCategory): Promise<Place[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('cityId', '==', cityId)
      .where('category', '==', category)
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Place));
  },

  /**
   * Get all places in a city
   */
  async getByCityId(cityId: string, activeOnly: boolean = true): Promise<Place[]> {
    let query = db.collection(COLLECTION).where('cityId', '==', cityId);

    if (activeOnly) {
      query = query.where('isActive', '==', true);
    }

    const snapshot = await query.get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Place));
  },

  /**
   * Get places by area
   */
  async getByArea(cityId: string, areaId: string): Promise<Place[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('cityId', '==', cityId)
      .where('areaId', '==', areaId)
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Place));
  },

  /**
   * Get featured places
   */
  async getFeatured(cityId: string): Promise<Place[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('cityId', '==', cityId)
      .where('isFeatured', '==', true)
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Place));
  },

  /**
   * Search places by tags
   */
  async getByTags(cityId: string, tags: string[]): Promise<Place[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('cityId', '==', cityId)
      .where('tags', 'array-contains-any', tags)
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Place));
  },

  /**
   * Get places with taxi enabled
   */
  async getWithTaxiEnabled(cityId: string): Promise<Place[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('cityId', '==', cityId)
      .where('actions.taxiEnabled', '==', true)
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Place));
  },

  /**
   * Update place
   */
  async update(placeId: string, updates: Partial<Place>): Promise<void> {
    await db.collection(COLLECTION).doc(placeId).set(
      {
        ...updates,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  },

  /**
   * Delete place (soft delete)
   */
  async delete(placeId: string): Promise<void> {
    await db.collection(COLLECTION).doc(placeId).set(
      {
        isActive: false,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  },
};
