/**
 * Requests Repository
 * Manages user service requests (catch-all for all demands)
 */
import { db } from '../config/firebase';
import { Request, RequestCategory, RequestStatus } from '../types/v1';

const COLLECTION = 'requests';

export const requestsRepository = {
  /**
   * Create a new request
   */
  async create(request: Omit<Request, 'id' | 'createdAt' | 'updatedAt'>): Promise<Request> {
    const now = new Date().toISOString();
    const docRef = await db.collection(COLLECTION).add({
      ...request,
      status: request.status || 'new',
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: docRef.id,
      ...request,
      status: request.status || 'new',
      createdAt: now,
      updatedAt: now,
    };
  },

  /**
   * Get request by ID
   */
  async getById(requestId: string): Promise<Request | null> {
    const doc = await db.collection(COLLECTION).doc(requestId).get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    } as Request;
  },

  /**
   * Get requests by user ID
   */
  async getByUserId(userId: string): Promise<Request[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Request));
  },

  /**
   * Get requests by category
   */
  async getByCategory(
    cityId: string,
    category: RequestCategory,
    status?: RequestStatus
  ): Promise<Request[]> {
    let query = db
      .collection(COLLECTION)
      .where('cityId', '==', cityId)
      .where('category', '==', category);

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Request));
  },

  /**
   * Get requests by status
   */
  async getByStatus(cityId: string, status: RequestStatus): Promise<Request[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('cityId', '==', cityId)
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Request));
  },

  /**
   * Get new requests (for admin)
   */
  async getNew(cityId?: string): Promise<Request[]> {
    let query = db.collection(COLLECTION).where('status', '==', 'new');

    if (cityId) {
      query = query.where('cityId', '==', cityId);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Request));
  },

  /**
   * Get requests assigned to a partner
   */
  async getByPartner(partnerId: string): Promise<Request[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('assignedPartnerId', '==', partnerId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Request));
  },

  /**
   * Get all requests for a city
   */
  async getByCityId(cityId: string): Promise<Request[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('cityId', '==', cityId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Request));
  },

  /**
   * Update request status
   */
  async updateStatus(requestId: string, status: RequestStatus): Promise<void> {
    await db.collection(COLLECTION).doc(requestId).set(
      {
        status,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  },

  /**
   * Assign request to partner
   */
  async assignToPartner(requestId: string, partnerId: string): Promise<void> {
    await db.collection(COLLECTION).doc(requestId).set(
      {
        assignedPartnerId: partnerId,
        status: 'in_progress',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  },

  /**
   * Add internal notes
   */
  async addInternalNotes(requestId: string, notes: string): Promise<void> {
    await db.collection(COLLECTION).doc(requestId).set(
      {
        internalNotes: notes,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  },

  /**
   * Update request
   */
  async update(requestId: string, updates: Partial<Request>): Promise<void> {
    await db.collection(COLLECTION).doc(requestId).set(
      {
        ...updates,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  },

  /**
   * Delete request
   */
  async delete(requestId: string): Promise<void> {
    await db.collection(COLLECTION).doc(requestId).delete();
  },
};
