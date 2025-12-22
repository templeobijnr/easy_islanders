/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UTILITY — catalog-mappers.ts
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Layer: Utility (Pure Functions)
 * Status: Stable
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PURPOSE:
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure type transformations from Firestore documents to domain types.
 * No side effects. No Firestore operations. Deterministic.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DOES NOT:
 * ─────────────────────────────────────────────────────────────────────────────
 * - Make Firestore calls
 * - Mutate input data
 * - Have side effects
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Timestamp } from 'firebase/firestore';
import {
  Activity,
  Event,
  Experience,
  Place,
  Region,
  Stay,
  PinActionConfig,
} from '../../types/connect';
import {
  FirestoreActivity,
  FirestoreEvent,
  FirestoreExperience,
  FirestorePlace,
  FirestoreStay,
} from '../../types/catalog';

const DEFAULT_CITY_ID = 'north-cyprus';

const normalizeRegion = (region?: string): Region => {
  const value = (region || 'kyrenia').toString().toLowerCase();
  switch (value) {
    case 'kyrenia':
    case 'girne':
      return 'kyrenia';
    case 'famagusta':
      return 'famagusta';
    case 'nicosia':
    case 'lefkoşa':
    case 'lefkosia':
      return 'nicosia';
    case 'iskele':
      return 'iskele';
    case 'lefke':
      return 'lefke';
    case 'guzelyurt':
    case 'güzelyurt':
      return 'guzelyurt';
    default:
      return 'kyrenia';
  }
};

const normalizeActions = (actions?: PinActionConfig): PinActionConfig => ({
  allowCheckIn: !!actions?.allowCheckIn,
  allowJoin: !!actions?.allowJoin,
  allowWave: !!actions?.allowWave,
  allowBooking: !!actions?.allowBooking,
  allowTaxi: !!actions?.allowTaxi,
});

const ensureDate = (value?: Timestamp | Date): Date => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof (value as any).toDate === 'function') return (value as any).toDate();
  return new Date(value as any);
};

const ensureCoords = (
  coords?: { lat: number; lng: number },
): { lat: number; lng: number } => {
  if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
    return coords;
  }
  return { lat: 35.33, lng: 33.32 };
};

export const mapStayDocToStay = (doc: FirestoreStay): Stay => {
  const region = normalizeRegion(doc.region as string | undefined);
  const actions = normalizeActions(doc.actions);

  return {
    id: doc.id,
    type: 'stay',
    title: doc.title,
    description: doc.description || '',
    coordinates: ensureCoords(doc.coordinates),
    category: doc.category || doc.propertyType || 'stay',
    region,
    images: doc.images || [],
    actions,
    createdAt: ensureDate(doc.createdAt),
    updatedAt: ensureDate(doc.updatedAt),
    price: doc.price,
    currency: doc.currency || 'GBP',
    address: doc.address,
    cityId: doc.cityId || DEFAULT_CITY_ID,
    propertyType: doc.propertyType || 'Stay',
    bedrooms: doc.bedrooms,
    bathrooms: doc.bathrooms,
    billingPeriod: doc.billingPeriod,
    amenities: doc.amenities || [],
  };
};

export const mapActivityDocToActivity = (doc: FirestoreActivity): Activity => {
  const region = normalizeRegion(doc.region as string | undefined);
  const actions = normalizeActions(
    doc.actions || { allowBooking: true, allowJoin: true, allowTaxi: true },
  );

  return {
    id: doc.id,
    type: 'activity',
    title: doc.title,
    description: doc.description || '',
    coordinates: ensureCoords(doc.coordinates),
    category: doc.category || 'activity',
    region,
    images: doc.images || [],
    actions,
    createdAt: ensureDate(doc.createdAt),
    updatedAt: ensureDate(doc.updatedAt),
    price: doc.price,
    currency: doc.currency || 'GBP',
    address: doc.address,
    cityId: doc.cityId || DEFAULT_CITY_ID,
    approved: doc.approved ?? true,
    startTime: doc.startTime ? ensureDate(doc.startTime) : undefined,
    endTime: doc.endTime ? ensureDate(doc.endTime) : undefined,
  };
};

export const mapEventDocToEvent = (doc: FirestoreEvent): Event => {
  const region = normalizeRegion(doc.region as string | undefined);
  const actions = normalizeActions(
    doc.actions || { allowJoin: true, allowCheckIn: true, allowTaxi: true },
  );

  return {
    id: doc.id,
    type: 'event',
    title: doc.title,
    description: doc.description || '',
    coordinates: ensureCoords(doc.coordinates),
    category: doc.category || 'event',
    region,
    images: doc.images || [],
    actions,
    createdAt: ensureDate(doc.createdAt),
    updatedAt: ensureDate(doc.updatedAt),
    price: doc.price,
    currency: doc.currency || 'GBP',
    address: doc.address,
    cityId: doc.cityId || DEFAULT_CITY_ID,
    startTime: ensureDate(doc.startTime),
    endTime: doc.endTime ? ensureDate(doc.endTime) : undefined,
    isPublic: doc.isPublic ?? true,
    approved: doc.approved ?? true,
  };
};

export const mapPlaceDocToPlace = (doc: FirestorePlace): Place => {
  const region = normalizeRegion(doc.region as string | undefined);
  const actions = normalizeActions(
    doc.actions || { allowCheckIn: true, allowWave: true, allowTaxi: true },
  );

  return {
    id: doc.id,
    type: 'place',
    title: doc.title,
    description: doc.description || '',
    coordinates: ensureCoords(doc.coordinates),
    category: doc.category || 'place',
    region,
    images: doc.images || [],
    actions,
    createdAt: ensureDate(doc.createdAt),
    updatedAt: ensureDate(doc.updatedAt),
    price: doc.price,
    currency: doc.currency || 'GBP',
    address: doc.address,
    cityId: doc.cityId || DEFAULT_CITY_ID,
  };
};

export const mapExperienceDocToExperience = (doc: FirestoreExperience): Experience => {
  const region = normalizeRegion(doc.region as string | undefined);
  const actions = normalizeActions(doc.actions || { allowBooking: true });

  return {
    id: doc.id,
    type: 'experience',
    title: doc.title,
    description: doc.description || '',
    coordinates: ensureCoords(doc.coordinates),
    category: doc.category || 'experience',
    region,
    images: doc.images || [],
    actions,
    createdAt: ensureDate(doc.createdAt),
    updatedAt: ensureDate(doc.updatedAt),
    price: doc.price,
    currency: doc.currency || 'GBP',
    address: doc.address,
    cityId: doc.cityId || DEFAULT_CITY_ID,
    duration: doc.duration,
    difficulty:
      doc.difficulty === 'easy' || doc.difficulty === 'medium' || doc.difficulty === 'hard'
        ? doc.difficulty
        : undefined,
    included: doc.included,
    requirements: doc.requirements,
  };
};

