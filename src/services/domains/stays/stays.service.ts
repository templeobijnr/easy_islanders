/**
 * Stays Domain Service
 *
 * Owns:
 * - Firestore collection: `stays`
 *
 * Responsibility:
 * - CRUD operations for accommodation properties (hotels, villas, apartments)
 *
 * Does NOT:
 * - Represent activities, events, or experiences
 * - Provide unified listing views (see unifiedListingsService)
 *
 * Layer: Domain Service
 *
 * Dependencies:
 * - firebaseConfig (infrastructure)
 *
 * Notes:
 * - Exports as "ListingsService" for backward compatibility
 * - Will be renamed to StaysService in future cleanup
 */

// ⚠ DUPLICATED HELPER: removeUndefined also exists in activitiesService, placesService, unifiedListingsService

import {
  collection,
  getDocs,
  query,
  where,
  limit,
  addDoc,
  Timestamp,
  doc,
  updateDoc,
  GeoPoint,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { FirestoreStay } from '../../../types/catalog';

const COLLECTION = 'stays';

// Helper: remove undefined values so Firestore doesn't receive them
const removeUndefined = <T extends Record<string, any>>(obj: T): T => {
  const cleaned: any = {};

  Object.entries(obj).forEach(([key, value]) => {
    if (value === undefined) return;

    if (Array.isArray(value)) {
      cleaned[key] = value;
    } else if (
      value &&
      typeof value === 'object' &&
      !(value instanceof Timestamp) &&
      !(value instanceof Date) &&
      !(value instanceof GeoPoint)
    ) {
      cleaned[key] = removeUndefined(value as any);
    } else {
      cleaned[key] = value;
    }
  });

  return cleaned;
};

const buildStayPayload = (
  data: Partial<FirestoreStay> & { title: string; cityId?: string; region?: string },
): Omit<FirestoreStay, 'id'> => {
  const coordinates = data.coordinates;
  const geo =
    coordinates && coordinates.lat != null && coordinates.lng != null
      ? new GeoPoint(coordinates.lat, coordinates.lng)
      : undefined;

  const baseNightlyAmount = data.price;
  const currency = (data.currency as string) || 'GBP';

  const basic = {
    title: data.title,
    subtitle: undefined,
    description: data.description || '',
    propertyType: (data.propertyType as any) || 'other',
    sizeSqm: undefined,
    maxGuests: undefined,
    bedrooms: data.bedrooms,
    beds: undefined,
    bathrooms: data.bathrooms,
    images: data.images || [],
  };

  const locationDetails = {
    geo: geo ? { lat: geo.latitude, lng: geo.longitude } : undefined,
    addressLabel: data.address || '',
    city: data.cityId || 'north-cyprus',
    region: data.region || 'Kyrenia',
    country: undefined,
    mapboxPlaceId: undefined,
  };

  const pricingDetails = baseNightlyAmount
    ? {
      baseNightly: { amount: baseNightlyAmount, currency },
      fees: {
        cleaning: data.cleaningFee,
        serviceFee: undefined,
        cityTax: undefined,
        securityDeposit: undefined,
        extraFeesNote: data.extraFeesNote,
      },
      discount: data.discountPercent
        ? {
          percentage: data.discountPercent,
          minNights: undefined,
          notes: undefined,
        }
        : undefined,
    }
    : undefined;

  const hostProfile = {
    name: data.hostName || 'Easy Islanders',
    phone: data.hostPhone,
    email: data.hostEmail,
    languages: undefined,
    bio: undefined,
  };

  const payload: Omit<FirestoreStay, 'id'> = {
    type: 'stay',
    title: data.title,
    description: data.description,
    category: data.category || (data.propertyType as string) || 'stay',
    region: data.region || 'Kyrenia',
    cityId: data.cityId || 'north-cyprus',
    coordinates: data.coordinates,
    address: data.address,
    images: data.images || [],
    actions: data.actions || { allowBooking: true, allowTaxi: true },
    price: data.price,
    currency,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    propertyType: data.propertyType,
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    billingPeriod: data.billingPeriod,
    amenities: data.amenities || [],
    discountPercent: data.discountPercent,
    cleaningFee: data.cleaningFee,
    extraFeesNote: data.extraFeesNote,
    hostName: data.hostName,
    hostPhone: data.hostPhone,
    hostEmail: data.hostEmail,
    requestOnly: data.requestOnly,

    basic,
    locationDetails,
    pricingDetails,
    hostProfile,
  };

  return removeUndefined(payload);
};

export const ListingsService = {
  getListings: async (region?: string): Promise<FirestoreStay[]> => {
    try {
      let q = query(collection(db, COLLECTION), limit(50));
      if (region && region !== 'All') {
        q = query(q, where('region', '==', region));
      }
      const snap = await getDocs(q);
      return snap.docs.map(
        d =>
        ({
          id: d.id,
          ...(d.data() as any),
        } as FirestoreStay),
      );
    } catch (err) {
      console.error('Error fetching listings', err);
      return [];
    }
  },

  createListing: async (
    data: Partial<FirestoreStay> & { title: string; cityId?: string; region?: string },
  ) => {
    const cleanedPayload = buildStayPayload(data);

    try {
      // Writes use unified db - permissions enforced by Firestore security rules
      // which check the user's custom claims (isAdmin)
      const docRef = await addDoc(collection(db, COLLECTION), cleanedPayload as any);
      return { ...(cleanedPayload as FirestoreStay), id: docRef.id };
    } catch (err) {
      console.error('Create stay failed:', err);
      throw err;
    }
  },

  updateListing: async (id: string, data: Partial<FirestoreStay>) => {
    const ref = doc(db, COLLECTION, id);
    const payload = removeUndefined({
      ...data,
      updatedAt: Timestamp.now(),
    } as any);

    try {
      await updateDoc(ref, payload);
    } catch (err) {
      console.error('Update stay failed:', err);
      throw err;
    }
  },
};
