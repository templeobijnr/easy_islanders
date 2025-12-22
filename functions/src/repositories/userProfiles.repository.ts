/**
 * User Profiles Repository
 * Manages user profile data with segmentation (student/expat/traveller/local)
 */
import { db } from '../config/firebase';
import { UserProfile, UserType } from '../types/v1';

const COLLECTION = 'userProfiles';

export const userProfilesRepository = {
  /**
   * Create a new user profile
   */
  async create(profile: Omit<UserProfile, 'createdAt' | 'updatedAt'>): Promise<UserProfile> {
    const now = new Date().toISOString();
    const newProfile: UserProfile = {
      ...profile,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection(COLLECTION).doc(profile.userId).set(newProfile);
    return newProfile;
  },

  /**
   * Get user profile by user ID
   */
  async getByUserId(userId: string): Promise<UserProfile | null> {
    const doc = await db.collection(COLLECTION).doc(userId).get();

    if (!doc.exists) {
      return null;
    }

    return doc.data() as UserProfile;
  },

  /**
   * Get users by type (student, expat, traveller, local)
   */
  async getByUserType(cityId: string, userType: UserType): Promise<UserProfile[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('currentCityId', '==', cityId)
      .where('userType', '==', userType)
      .get();

    return snapshot.docs.map(doc => doc.data() as UserProfile);
  },

  /**
   * Get users by university
   */
  async getByUniversity(universityId: string): Promise<UserProfile[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('universityId', '==', universityId)
      .get();

    return snapshot.docs.map(doc => doc.data() as UserProfile);
  },

  /**
   * Get users in a city
   */
  async getByCityId(cityId: string): Promise<UserProfile[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('currentCityId', '==', cityId)
      .get();

    return snapshot.docs.map(doc => doc.data() as UserProfile);
  },

  /**
   * Get users with current location (for Connect map)
   */
  async getWithLocation(cityId: string): Promise<UserProfile[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('currentCityId', '==', cityId)
      .get();

    // Filter for users with location data
    return snapshot.docs
      .map(doc => doc.data() as UserProfile)
      .filter(profile => profile.currentLocation?.lat && profile.currentLocation?.lng);
  },

  /**
   * Update user profile
   */
  async update(userId: string, updates: Partial<UserProfile>): Promise<void> {
    await db.collection(COLLECTION).doc(userId).set(
      {
        ...updates,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  },

  /**
   * Update user location
   */
  async updateLocation(
    userId: string,
    location: { placeId?: string; lat?: number; lng?: number }
  ): Promise<void> {
    await db.collection(COLLECTION).doc(userId).set(
      {
        currentLocation: {
          ...location,
          updatedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  },

  /**
   * Mark onboarding as completed
   */
  async completeOnboarding(userId: string): Promise<void> {
    await db.collection(COLLECTION).doc(userId).set(
      {
        completedOnboarding: true,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  },
};
