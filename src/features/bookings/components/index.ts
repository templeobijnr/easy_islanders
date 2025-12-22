/**
 * Bookings Feature - Booking Modules Barrel
 *
 * Re-exports booking modules from pages/connect for cross-domain use.
 * These are domain-specific booking UIs that can be consumed by any page.
 *
 * TODO: Eventually migrate the actual component files here from pages/connect/
 */

export { default as StayBookingModule } from '../../../pages/connect/StayBookingModule';
export { default as ActivityBookingModule } from '../../../pages/connect/ActivityBookingModule';
export { default as EventBookingModule } from '../../../pages/connect/EventBookingModule';
export { default as PlaceBookingModule } from '../../../pages/connect/PlaceBookingModule';
export { default as ExperienceBookingModule } from '../../../pages/connect/ExperienceBookingModule';
export { default as PinBookingModule } from '../../../pages/connect/PinBookingModule';
