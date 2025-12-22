"use strict";
/**
 * Action Data Schemas for AskMerve V1
 *
 * Defines the 10 public action types and their required/optional fields.
 * Each action represents a specific job type that users can create.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionDataSchema = exports.InquireActionDataSchema = exports.BookStayActionDataSchema = exports.BookActivityActionDataSchema = exports.RequestServiceActionDataSchema = exports.BookServiceActionDataSchema = exports.ReserveTableActionDataSchema = exports.OrderGroceryActionDataSchema = exports.OrderWaterGasActionDataSchema = exports.TaxiActionDataSchema = exports.OrderFoodActionDataSchema = exports.ActionTypeSchema = void 0;
exports.actionRequiresLocation = actionRequiresLocation;
exports.actionRequiresDateTime = actionRequiresDateTime;
const zod_1 = require("zod");
const location_schema_1 = require("./location.schema");
// =============================================================================
// ACTION TYPE ENUM
// =============================================================================
/**
 * The 10 public action types for AskMerve V1 North Cyprus
 */
exports.ActionTypeSchema = zod_1.z.enum([
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
// =============================================================================
// INDIVIDUAL ACTION DATA SCHEMAS
// =============================================================================
/**
 * Food delivery or pickup order
 */
exports.OrderFoodActionDataSchema = zod_1.z.object({
    actionType: zod_1.z.literal('order_food'),
    /** List of items to order */
    items: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string().min(1),
        quantity: zod_1.z.number().int().positive().default(1),
        notes: zod_1.z.string().optional(),
    })).min(1),
    /** Delivery location (required for delivery) */
    deliveryLocation: location_schema_1.LocationSchema.optional(),
    /** Whether this is delivery (true) or pickup (false) */
    isDelivery: zod_1.z.boolean().default(true),
    /** Requested delivery/pickup time */
    requestedTime: zod_1.z.string().optional(), // ISO 8601
    /** Special instructions for the order */
    notes: zod_1.z.string().optional(),
});
/**
 * Taxi/ride request
 */
exports.TaxiActionDataSchema = zod_1.z.object({
    actionType: zod_1.z.literal('taxi'),
    /** Pickup location - REQUIRED */
    pickupLocation: location_schema_1.LocationSchema,
    /** Dropoff location (optional, can be determined during ride) */
    dropoffLocation: location_schema_1.LocationSchema.optional(),
    /** Number of passengers */
    passengerCount: zod_1.z.number().int().positive().default(1),
    /** Pickup time (now if not specified) */
    pickupTime: zod_1.z.string().optional(), // ISO 8601
    /** Has luggage requiring trunk space */
    hasLuggage: zod_1.z.boolean().optional(),
    /** Additional notes for driver */
    notes: zod_1.z.string().optional(),
});
/**
 * Water/gas delivery order
 */
exports.OrderWaterGasActionDataSchema = zod_1.z.object({
    actionType: zod_1.z.literal('order_water_gas'),
    /** Delivery location - REQUIRED */
    deliveryLocation: location_schema_1.LocationSchema,
    /** Items with quantities */
    items: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(['water_19L', 'water_5L', 'lpg_12kg', 'lpg_27kg', 'other']),
        quantity: zod_1.z.number().int().positive(),
        notes: zod_1.z.string().optional(),
    })).min(1),
    /** Preferred delivery time */
    preferredTime: zod_1.z.string().optional(), // ISO 8601
    /** Floor/access instructions */
    deliveryNotes: zod_1.z.string().optional(),
});
/**
 * Grocery/market order
 */
exports.OrderGroceryActionDataSchema = zod_1.z.object({
    actionType: zod_1.z.literal('order_grocery'),
    /** Delivery location - REQUIRED */
    deliveryLocation: location_schema_1.LocationSchema,
    /** Shopping list (text or structured) */
    items: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string().min(1),
        quantity: zod_1.z.string().optional(), // "2", "1kg", "3 bunches"
        notes: zod_1.z.string().optional(),
    })).min(1),
    /** Budget limit if any */
    budgetLimit: zod_1.z.number().positive().optional(),
    /** Currency code */
    currency: zod_1.z.string().default('TRY'),
    /** Preferred delivery time */
    preferredTime: zod_1.z.string().optional(),
    /** Additional notes */
    notes: zod_1.z.string().optional(),
});
/**
 * Restaurant table reservation
 */
exports.ReserveTableActionDataSchema = zod_1.z.object({
    actionType: zod_1.z.literal('reserve_table'),
    /** Reservation date and time - REQUIRED */
    dateTime: zod_1.z.string(), // ISO 8601
    /** Number of guests - REQUIRED */
    guestCount: zod_1.z.number().int().positive(),
    /** Special requests (outdoor, quiet, etc.) */
    preferences: zod_1.z.array(zod_1.z.string()).optional(),
    /** Special occasion */
    occasion: zod_1.z.string().optional(),
    /** Additional notes */
    notes: zod_1.z.string().optional(),
    /** Customer contact for confirmation */
    contactPhone: zod_1.z.string().optional(),
});
/**
 * Service appointment booking (spa, salon, etc.)
 */
exports.BookServiceActionDataSchema = zod_1.z.object({
    actionType: zod_1.z.literal('book_service'),
    /** Service type - REQUIRED */
    serviceType: zod_1.z.string().min(1),
    /** Appointment date and time - REQUIRED */
    dateTime: zod_1.z.string(), // ISO 8601
    /** Duration in minutes (if known) */
    durationMinutes: zod_1.z.number().int().positive().optional(),
    /** Number of people for group services */
    participantCount: zod_1.z.number().int().positive().default(1),
    /** Staff preference */
    staffPreference: zod_1.z.string().optional(),
    /** Additional notes */
    notes: zod_1.z.string().optional(),
});
/**
 * On-demand service request (plumber, electrician, etc.)
 */
exports.RequestServiceActionDataSchema = zod_1.z.object({
    actionType: zod_1.z.literal('request_service'),
    /** Description of the issue/need - REQUIRED */
    description: zod_1.z.string().min(1),
    /** Service location - REQUIRED */
    location: location_schema_1.LocationSchema,
    /** Service category */
    serviceCategory: zod_1.z.enum([
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
    urgency: zod_1.z.enum(['emergency', 'today', 'this_week', 'flexible']).default('flexible'),
    /** Preferred time window */
    preferredTime: zod_1.z.string().optional(),
    /** Photos of the issue (URLs) */
    photos: zod_1.z.array(zod_1.z.string().url()).optional(),
    /** Access instructions */
    accessNotes: zod_1.z.string().optional(),
});
/**
 * Activity/experience booking (tours, excursions, etc.)
 */
exports.BookActivityActionDataSchema = zod_1.z.object({
    actionType: zod_1.z.literal('book_activity'),
    /** Activity name or ID */
    activityName: zod_1.z.string().optional(),
    /** Activity date and time - REQUIRED */
    dateTime: zod_1.z.string(), // ISO 8601
    /** Number of participants - REQUIRED */
    participantCount: zod_1.z.number().int().positive(),
    /** Participant details if needed */
    participants: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string().optional(),
        age: zod_1.z.number().int().positive().optional(),
    })).optional(),
    /** Pickup location for tours */
    pickupLocation: location_schema_1.LocationSchema.optional(),
    /** Special requirements */
    notes: zod_1.z.string().optional(),
});
/**
 * Accommodation booking
 */
exports.BookStayActionDataSchema = zod_1.z.object({
    actionType: zod_1.z.literal('book_stay'),
    /** Check-in date - REQUIRED */
    checkIn: zod_1.z.string(), // ISO 8601 date
    /** Check-out date - REQUIRED */
    checkOut: zod_1.z.string(), // ISO 8601 date
    /** Number of guests - REQUIRED */
    guestCount: zod_1.z.number().int().positive(),
    /** Number of rooms if multi-room */
    roomCount: zod_1.z.number().int().positive().default(1),
    /** Room type preference */
    roomType: zod_1.z.string().optional(),
    /** Special requests */
    specialRequests: zod_1.z.array(zod_1.z.string()).optional(),
    /** Additional notes */
    notes: zod_1.z.string().optional(),
});
/**
 * General inquiry (free-form)
 */
exports.InquireActionDataSchema = zod_1.z.object({
    actionType: zod_1.z.literal('inquire'),
    /** The inquiry message - REQUIRED */
    message: zod_1.z.string().min(1),
    /** Topic/category of inquiry */
    topic: zod_1.z.string().optional(),
    /** Preferred response method */
    preferredContact: zod_1.z.enum(['whatsapp', 'phone', 'app']).optional(),
    /** Contact phone if WhatsApp/phone preferred */
    contactPhone: zod_1.z.string().optional(),
});
// =============================================================================
// UNION ACTION DATA SCHEMA
// =============================================================================
/**
 * Discriminated union of all action data types.
 * Use `actionType` field to determine the specific type.
 */
exports.ActionDataSchema = zod_1.z.discriminatedUnion('actionType', [
    exports.OrderFoodActionDataSchema,
    exports.TaxiActionDataSchema,
    exports.OrderWaterGasActionDataSchema,
    exports.OrderGroceryActionDataSchema,
    exports.ReserveTableActionDataSchema,
    exports.BookServiceActionDataSchema,
    exports.RequestServiceActionDataSchema,
    exports.BookActivityActionDataSchema,
    exports.BookStayActionDataSchema,
    exports.InquireActionDataSchema,
]);
// =============================================================================
// VALIDATION HELPERS
// =============================================================================
/**
 * Checks if an action type requires a location field.
 */
function actionRequiresLocation(actionType) {
    const locationRequired = [
        'taxi', // pickupLocation
        'order_water_gas', // deliveryLocation
        'order_grocery', // deliveryLocation
        'request_service', // location
    ];
    return locationRequired.includes(actionType);
}
/**
 * Checks if an action type requires a dateTime field.
 */
function actionRequiresDateTime(actionType) {
    const dateTimeRequired = [
        'reserve_table',
        'book_service',
        'book_activity',
        'book_stay',
    ];
    return dateTimeRequired.includes(actionType);
}
//# sourceMappingURL=action.schema.js.map