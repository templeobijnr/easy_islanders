/**
 * Action Data Schemas for AskMerve V1
 * 
 * Defines the 10 public action types and their required/optional fields.
 * Each action represents a specific job type that users can create.
 */

import { z } from 'zod';
import { LocationSchema } from './location.schema';

// =============================================================================
// ACTION TYPE ENUM
// =============================================================================

/**
 * The 10 public action types for AskMerve V1 North Cyprus
 */
export const ActionTypeSchema = z.enum([
    'order_food',
    'taxi',
    'order_water_gas',
    'order_grocery',
    'reserve_table',
    'book_service',
    'request_service',
    'book_activity',
    'book_stay',
    'inquire',
]);

export type ActionType = z.infer<typeof ActionTypeSchema>;

// =============================================================================
// INDIVIDUAL ACTION DATA SCHEMAS
// =============================================================================

/**
 * Food delivery or pickup order
 */
export const OrderFoodActionDataSchema = z.object({
    actionType: z.literal('order_food'),
    /** List of items to order */
    items: z.array(z.object({
        name: z.string().min(1),
        quantity: z.number().int().positive().default(1),
        notes: z.string().optional(),
    })).min(1),
    /** Delivery location (required for delivery) */
    deliveryLocation: LocationSchema.optional(),
    /** Whether this is delivery (true) or pickup (false) */
    isDelivery: z.boolean().default(true),
    /** Requested delivery/pickup time */
    requestedTime: z.string().optional(), // ISO 8601
    /** Special instructions for the order */
    notes: z.string().optional(),
});

export type OrderFoodActionData = z.infer<typeof OrderFoodActionDataSchema>;

/**
 * Taxi/ride request
 */
export const TaxiActionDataSchema = z.object({
    actionType: z.literal('taxi'),
    /** Pickup location - REQUIRED */
    pickupLocation: LocationSchema,
    /** Dropoff location (optional, can be determined during ride) */
    dropoffLocation: LocationSchema.optional(),
    /** Number of passengers */
    passengerCount: z.number().int().positive().default(1),
    /** Pickup time (now if not specified) */
    pickupTime: z.string().optional(), // ISO 8601
    /** Has luggage requiring trunk space */
    hasLuggage: z.boolean().optional(),
    /** Additional notes for driver */
    notes: z.string().optional(),
});

export type TaxiActionData = z.infer<typeof TaxiActionDataSchema>;

/**
 * Water/gas delivery order
 */
export const OrderWaterGasActionDataSchema = z.object({
    actionType: z.literal('order_water_gas'),
    /** Delivery location - REQUIRED */
    deliveryLocation: LocationSchema,
    /** Items with quantities */
    items: z.array(z.object({
        type: z.enum(['water_19L', 'water_5L', 'lpg_12kg', 'lpg_27kg', 'other']),
        quantity: z.number().int().positive(),
        notes: z.string().optional(),
    })).min(1),
    /** Preferred delivery time */
    preferredTime: z.string().optional(), // ISO 8601
    /** Floor/access instructions */
    deliveryNotes: z.string().optional(),
});

export type OrderWaterGasActionData = z.infer<typeof OrderWaterGasActionDataSchema>;

/**
 * Grocery/market order
 */
export const OrderGroceryActionDataSchema = z.object({
    actionType: z.literal('order_grocery'),
    /** Delivery location - REQUIRED */
    deliveryLocation: LocationSchema,
    /** Shopping list (text or structured) */
    items: z.array(z.object({
        name: z.string().min(1),
        quantity: z.string().optional(), // "2", "1kg", "3 bunches"
        notes: z.string().optional(),
    })).min(1),
    /** Budget limit if any */
    budgetLimit: z.number().positive().optional(),
    /** Currency code */
    currency: z.string().default('TRY'),
    /** Preferred delivery time */
    preferredTime: z.string().optional(),
    /** Additional notes */
    notes: z.string().optional(),
});

export type OrderGroceryActionData = z.infer<typeof OrderGroceryActionDataSchema>;

/**
 * Restaurant table reservation
 */
export const ReserveTableActionDataSchema = z.object({
    actionType: z.literal('reserve_table'),
    /** Reservation date and time - REQUIRED */
    dateTime: z.string(), // ISO 8601
    /** Number of guests - REQUIRED */
    guestCount: z.number().int().positive(),
    /** Special requests (outdoor, quiet, etc.) */
    preferences: z.array(z.string()).optional(),
    /** Special occasion */
    occasion: z.string().optional(),
    /** Additional notes */
    notes: z.string().optional(),
    /** Customer contact for confirmation */
    contactPhone: z.string().optional(),
});

export type ReserveTableActionData = z.infer<typeof ReserveTableActionDataSchema>;

/**
 * Service appointment booking (spa, salon, etc.)
 */
export const BookServiceActionDataSchema = z.object({
    actionType: z.literal('book_service'),
    /** Service type - REQUIRED */
    serviceType: z.string().min(1),
    /** Appointment date and time - REQUIRED */
    dateTime: z.string(), // ISO 8601
    /** Duration in minutes (if known) */
    durationMinutes: z.number().int().positive().optional(),
    /** Number of people for group services */
    participantCount: z.number().int().positive().default(1),
    /** Staff preference */
    staffPreference: z.string().optional(),
    /** Additional notes */
    notes: z.string().optional(),
});

export type BookServiceActionData = z.infer<typeof BookServiceActionDataSchema>;

/**
 * On-demand service request (plumber, electrician, etc.)
 */
export const RequestServiceActionDataSchema = z.object({
    actionType: z.literal('request_service'),
    /** Description of the issue/need - REQUIRED */
    description: z.string().min(1),
    /** Service location - REQUIRED */
    location: LocationSchema,
    /** Service category */
    serviceCategory: z.enum([
        'plumber',
        'electrician',
        'ac_tech',
        'cleaner',
        'handyman',
        'painter',
        'gardener',
        'locksmith',
        'other',
    ]).optional(),
    /** Urgency level */
    urgency: z.enum(['emergency', 'today', 'this_week', 'flexible']).default('flexible'),
    /** Preferred time window */
    preferredTime: z.string().optional(),
    /** Photos of the issue (URLs) */
    photos: z.array(z.string().url()).optional(),
    /** Access instructions */
    accessNotes: z.string().optional(),
});

export type RequestServiceActionData = z.infer<typeof RequestServiceActionDataSchema>;

/**
 * Activity/experience booking (tours, excursions, etc.)
 */
export const BookActivityActionDataSchema = z.object({
    actionType: z.literal('book_activity'),
    /** Activity name or ID */
    activityName: z.string().optional(),
    /** Activity date and time - REQUIRED */
    dateTime: z.string(), // ISO 8601
    /** Number of participants - REQUIRED */
    participantCount: z.number().int().positive(),
    /** Participant details if needed */
    participants: z.array(z.object({
        name: z.string().optional(),
        age: z.number().int().positive().optional(),
    })).optional(),
    /** Pickup location for tours */
    pickupLocation: LocationSchema.optional(),
    /** Special requirements */
    notes: z.string().optional(),
});

export type BookActivityActionData = z.infer<typeof BookActivityActionDataSchema>;

/**
 * Accommodation booking
 */
export const BookStayActionDataSchema = z.object({
    actionType: z.literal('book_stay'),
    /** Check-in date - REQUIRED */
    checkIn: z.string(), // ISO 8601 date
    /** Check-out date - REQUIRED */
    checkOut: z.string(), // ISO 8601 date
    /** Number of guests - REQUIRED */
    guestCount: z.number().int().positive(),
    /** Number of rooms if multi-room */
    roomCount: z.number().int().positive().default(1),
    /** Room type preference */
    roomType: z.string().optional(),
    /** Special requests */
    specialRequests: z.array(z.string()).optional(),
    /** Additional notes */
    notes: z.string().optional(),
});

export type BookStayActionData = z.infer<typeof BookStayActionDataSchema>;

/**
 * General inquiry (free-form)
 */
export const InquireActionDataSchema = z.object({
    actionType: z.literal('inquire'),
    /** The inquiry message - REQUIRED */
    message: z.string().min(1),
    /** Topic/category of inquiry */
    topic: z.string().optional(),
    /** Preferred response method */
    preferredContact: z.enum(['whatsapp', 'phone', 'app']).optional(),
    /** Contact phone if WhatsApp/phone preferred */
    contactPhone: z.string().optional(),
});

export type InquireActionData = z.infer<typeof InquireActionDataSchema>;

// =============================================================================
// UNION ACTION DATA SCHEMA
// =============================================================================

/**
 * Discriminated union of all action data types.
 * Use `actionType` field to determine the specific type.
 */
export const ActionDataSchema = z.discriminatedUnion('actionType', [
    OrderFoodActionDataSchema,
    TaxiActionDataSchema,
    OrderWaterGasActionDataSchema,
    OrderGroceryActionDataSchema,
    ReserveTableActionDataSchema,
    BookServiceActionDataSchema,
    RequestServiceActionDataSchema,
    BookActivityActionDataSchema,
    BookStayActionDataSchema,
    InquireActionDataSchema,
]);

export type ActionData = z.infer<typeof ActionDataSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Checks if an action type requires a location field.
 */
export function actionRequiresLocation(actionType: ActionType): boolean {
    const locationRequired: ActionType[] = [
        'taxi',           // pickupLocation
        'order_water_gas', // deliveryLocation
        'order_grocery',   // deliveryLocation
        'request_service', // location
    ];
    return locationRequired.includes(actionType);
}

/**
 * Checks if an action type requires a dateTime field.
 */
export function actionRequiresDateTime(actionType: ActionType): boolean {
    const dateTimeRequired: ActionType[] = [
        'reserve_table',
        'book_service',
        'book_activity',
        'book_stay',
    ];
    return dateTimeRequired.includes(actionType);
}
