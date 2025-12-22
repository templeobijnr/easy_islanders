/**
 * Service Providers Repository
 * Manages partners (taxi companies, vendors, agents, etc.)
 */
import { db } from '../config/firebase';
import { ServiceProvider, PartnerType } from '../types/v1';

const COLLECTION = 'serviceProviders';

export const serviceProvidersRepository = {
  /**
   * Create a new service provider
   */
  async create(provider: Omit<ServiceProvider, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceProvider> {
    const now = new Date().toISOString();
    const docRef = await db.collection(COLLECTION).add({
      ...provider,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: docRef.id,
      ...provider,
      createdAt: now,
      updatedAt: now,
    };
  },

  /**
   * Get service provider by ID
   */
  async getById(providerId: string): Promise<ServiceProvider | null> {
    const doc = await db.collection(COLLECTION).doc(providerId).get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    } as ServiceProvider;
  },

  /**
   * Get providers by type
   */
  async getByType(cityId: string, type: PartnerType): Promise<ServiceProvider[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('cityId', '==', cityId)
      .where('type', '==', type)
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as ServiceProvider));
  },

  /**
   * Get all active providers in a city
   */
  async getByCityId(cityId: string): Promise<ServiceProvider[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('cityId', '==', cityId)
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as ServiceProvider));
  },

  /**
   * Get providers by service category
   */
  async getByServiceCategory(cityId: string, category: string): Promise<ServiceProvider[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('cityId', '==', cityId)
      .where('serviceCategories', 'array-contains', category)
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as ServiceProvider));
  },

  /**
   * Get providers by area
   */
  async getByArea(cityId: string, areaName: string): Promise<ServiceProvider[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('cityId', '==', cityId)
      .where('areaNames', 'array-contains', areaName)
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as ServiceProvider));
  },

  /**
   * Get taxi drivers/companies
   */
  async getTaxiProviders(cityId: string): Promise<ServiceProvider[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('cityId', '==', cityId)
      .where('type', 'in', ['taxi_company', 'driver'])
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as ServiceProvider));
  },

  /**
   * Get housing providers (agents, landlords)
   */
  async getHousingProviders(cityId: string): Promise<ServiceProvider[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('cityId', '==', cityId)
      .where('type', 'in', ['real_estate_agent', 'landlord'])
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as ServiceProvider));
  },

  /**
   * Search providers by phone/whatsapp
   */
  async getByPhone(phone: string): Promise<ServiceProvider | null> {
    // Try phone field
    let snapshot = await db
      .collection(COLLECTION)
      .where('contact.phone', '==', phone)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as ServiceProvider;
    }

    // Try whatsapp field
    snapshot = await db
      .collection(COLLECTION)
      .where('contact.whatsapp', '==', phone)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as ServiceProvider;
    }

    return null;
  },

  /**
   * Update service provider
   */
  async update(providerId: string, updates: Partial<ServiceProvider>): Promise<void> {
    await db.collection(COLLECTION).doc(providerId).set(
      {
        ...updates,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  },

  /**
   * Delete service provider (soft delete)
   */
  async delete(providerId: string): Promise<void> {
    await db.collection(COLLECTION).doc(providerId).set(
      {
        isActive: false,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  },
};
