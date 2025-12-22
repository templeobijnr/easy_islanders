/**
 * Unit tests for Action schemas
 */

import { describe, it, expect } from 'vitest';
import {
    ActionTypeSchema,
    ActionDataSchema,
    TaxiActionDataSchema,
    OrderWaterGasActionDataSchema,
    ReserveTableActionDataSchema,
    actionRequiresLocation,
    actionRequiresDateTime,
} from '../schemas/action.schema';

describe('ActionTypeSchema', () => {
    it('accepts all 10 valid action types', () => {
        const types = [
            'order_food', 'taxi', 'order_water_gas', 'order_grocery',
            'reserve_table', 'book_service', 'request_service',
            'book_activity', 'book_stay', 'inquire',
        ];
        for (const type of types) {
            const result = ActionTypeSchema.safeParse(type);
            expect(result.success).toBe(true);
        }
    });

    it('rejects invalid action type', () => {
        const result = ActionTypeSchema.safeParse('book_hotel');
        expect(result.success).toBe(false);
    });
});

describe('TaxiActionDataSchema', () => {
    it('requires pickupLocation', () => {
        const result = TaxiActionDataSchema.safeParse({
            actionType: 'taxi',
            passengerCount: 2,
        });
        expect(result.success).toBe(false);
    });

    it('accepts valid taxi request', () => {
        const result = TaxiActionDataSchema.safeParse({
            actionType: 'taxi',
            pickupLocation: { address: 'Kyrenia Harbour' },
            passengerCount: 2,
        });
        expect(result.success).toBe(true);
    });

    it('accepts taxi with dropoff', () => {
        const result = TaxiActionDataSchema.safeParse({
            actionType: 'taxi',
            pickupLocation: { address: 'Kyrenia Harbour' },
            dropoffLocation: { address: 'Nicosia City Center' },
            passengerCount: 2,
            hasLuggage: true,
        });
        expect(result.success).toBe(true);
    });

    it('defaults passengerCount to 1', () => {
        const result = TaxiActionDataSchema.safeParse({
            actionType: 'taxi',
            pickupLocation: { address: 'Kyrenia Harbour' },
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.passengerCount).toBe(1);
        }
    });
});

describe('OrderWaterGasActionDataSchema', () => {
    it('requires deliveryLocation and items', () => {
        const result = OrderWaterGasActionDataSchema.safeParse({
            actionType: 'order_water_gas',
        });
        expect(result.success).toBe(false);
    });

    it('accepts valid water/gas order', () => {
        const result = OrderWaterGasActionDataSchema.safeParse({
            actionType: 'order_water_gas',
            deliveryLocation: { address: 'Girne, Near Castle' },
            items: [
                { type: 'water_19L', quantity: 2 },
                { type: 'lpg_12kg', quantity: 1 },
            ],
        });
        expect(result.success).toBe(true);
    });

    it('rejects empty items array', () => {
        const result = OrderWaterGasActionDataSchema.safeParse({
            actionType: 'order_water_gas',
            deliveryLocation: { address: 'Girne' },
            items: [],
        });
        expect(result.success).toBe(false);
    });
});

describe('ReserveTableActionDataSchema', () => {
    it('requires dateTime and guestCount', () => {
        const result = ReserveTableActionDataSchema.safeParse({
            actionType: 'reserve_table',
        });
        expect(result.success).toBe(false);
    });

    it('accepts valid reservation', () => {
        const result = ReserveTableActionDataSchema.safeParse({
            actionType: 'reserve_table',
            dateTime: '2024-12-20T19:00:00Z',
            guestCount: 4,
        });
        expect(result.success).toBe(true);
    });

    it('accepts reservation with preferences', () => {
        const result = ReserveTableActionDataSchema.safeParse({
            actionType: 'reserve_table',
            dateTime: '2024-12-20T19:00:00Z',
            guestCount: 4,
            preferences: ['outdoor', 'quiet'],
            occasion: 'birthday',
        });
        expect(result.success).toBe(true);
    });
});

describe('ActionDataSchema (discriminated union)', () => {
    it('correctly parses taxi by actionType', () => {
        const result = ActionDataSchema.safeParse({
            actionType: 'taxi',
            pickupLocation: { address: 'Test' },
        });
        expect(result.success).toBe(true);
    });

    it('correctly parses inquire by actionType', () => {
        const result = ActionDataSchema.safeParse({
            actionType: 'inquire',
            message: 'Do you accept credit cards?',
        });
        expect(result.success).toBe(true);
    });

    it('validates according to correct schema based on actionType', () => {
        // Taxi without pickupLocation should fail
        const result = ActionDataSchema.safeParse({
            actionType: 'taxi',
            message: 'Hello', // Wrong field for taxi
        });
        expect(result.success).toBe(false);
    });
});

describe('actionRequiresLocation', () => {
    it('returns true for taxi', () => {
        expect(actionRequiresLocation('taxi')).toBe(true);
    });

    it('returns true for order_water_gas', () => {
        expect(actionRequiresLocation('order_water_gas')).toBe(true);
    });

    it('returns true for order_grocery', () => {
        expect(actionRequiresLocation('order_grocery')).toBe(true);
    });

    it('returns true for request_service', () => {
        expect(actionRequiresLocation('request_service')).toBe(true);
    });

    it('returns false for reserve_table', () => {
        expect(actionRequiresLocation('reserve_table')).toBe(false);
    });

    it('returns false for inquire', () => {
        expect(actionRequiresLocation('inquire')).toBe(false);
    });
});

describe('actionRequiresDateTime', () => {
    it('returns true for reserve_table', () => {
        expect(actionRequiresDateTime('reserve_table')).toBe(true);
    });

    it('returns true for book_service', () => {
        expect(actionRequiresDateTime('book_service')).toBe(true);
    });

    it('returns true for book_activity', () => {
        expect(actionRequiresDateTime('book_activity')).toBe(true);
    });

    it('returns true for book_stay', () => {
        expect(actionRequiresDateTime('book_stay')).toBe(true);
    });

    it('returns false for taxi', () => {
        expect(actionRequiresDateTime('taxi')).toBe(false);
    });

    it('returns false for order_food', () => {
        expect(actionRequiresDateTime('order_food')).toBe(false);
    });
});
