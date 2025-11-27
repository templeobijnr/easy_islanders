/**
 * Easy Islanders – central type barrel.
 *
 * Import shared types from here instead of reaching into
 * deep paths, e.g.:
 *
 *   import { Listing, TaxiBooking, Notification } from '@/types';
 *
 * This keeps import sites clean and makes it easier to evolve
 * the internal type organisation over time.
 */

// Authentication & Users
export * from './auth';

// Marketplace & Listings
export * from './marketplace';
export * from './booking';

// Social Features
export * from './social';

// Chat & AI
export * from './chat';
export * from './agent';

// Business & CRM
export * from './business';
export * from './crm';

// City OS - Dispatch System
export * from './dispatch';

// City OS - Notifications
export * from './notifications';

// City OS - Messaging
export * from './messaging';

// Geography & Locations
export * from './locations';

// Shared Enums
export * from './enums';
