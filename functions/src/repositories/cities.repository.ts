/**
 * Cities Repository
 * Manages city data in Firestore
 */
import { db } from '../config/firebase';
import { City } from '../types/v1';

const COLLECTION = 'cities';

export const citiesRepository = {
  /**
   * Create a new city
   */
  async create(city: Omit<City, 'id'>): Promise<City> {
    const docRef = await db.collection(COLLECTION).add({
      ...city,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return {
      id: docRef.id,
      ...city,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  /**
   * Get city by ID
   */
  async getById(cityId: string): Promise<City | null> {
    const doc = await db.collection(COLLECTION).doc(cityId).get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    } as City;
  },

  /**
   * Get all active cities
   */
  async getActive(): Promise<City[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as City));
  },

  /**
   * Get all cities
   */
  async getAll(): Promise<City[]> {
    const snapshot = await db.collection(COLLECTION).get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as City));
  },

  /**
   * Update city
   */
  async update(cityId: string, updates: Partial<City>): Promise<void> {
    await db.collection(COLLECTION).doc(cityId).set(
      {
        ...updates,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  },

  /**
   * Delete city (soft delete by marking inactive)
   */
  async delete(cityId: string): Promise<void> {
    await db.collection(COLLECTION).doc(cityId).set(
      {
        isActive: false,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  },
};
