/**
 * Catalog Parser Tests
 */

import { parseItemsFromText, normalizeItemName } from './catalog.parser';

describe('Catalog Parser', () => {
    describe('parseItemsFromText', () => {
        it('parses "Burger €12, Fries €4" to 2 items', () => {
            const items = parseItemsFromText('Burger €12, Fries €4');
            expect(items).toHaveLength(2);
            expect(items[0]).toEqual({ name: 'Burger', price: 12, currency: 'EUR' });
            expect(items[1]).toEqual({ name: 'Fries', price: 4, currency: 'EUR' });
        });

        it('parses "Burger 12€\\nFries 4€" to 2 items', () => {
            const items = parseItemsFromText('Burger 12€\nFries 4€');
            expect(items).toHaveLength(2);
            expect(items[0]).toEqual({ name: 'Burger', price: 12, currency: 'EUR' });
            expect(items[1]).toEqual({ name: 'Fries', price: 4, currency: 'EUR' });
        });

        it('parses "Coke 2.50 EUR" to 1 item', () => {
            const items = parseItemsFromText('Coke 2.50 EUR');
            expect(items).toHaveLength(1);
            expect(items[0]).toEqual({ name: 'Coke', price: 2.5, currency: 'EUR' });
        });

        it('parses "Pizza ₺250" to 1 TRY item', () => {
            const items = parseItemsFromText('Pizza ₺250');
            expect(items).toHaveLength(1);
            expect(items[0]).toEqual({ name: 'Pizza', price: 250, currency: 'TRY' });
        });

        it('returns empty array for garbage text', () => {
            const items = parseItemsFromText('Hello, how are you?');
            expect(items).toHaveLength(0);
        });

        it('limits to 10 items per message', () => {
            const text = Array(15).fill('Item €1').join(', ');
            const items = parseItemsFromText(text);
            expect(items).toHaveLength(10);
        });
    });

    describe('normalizeItemName', () => {
        it('normalizes "  Burger King  " to "burger king"', () => {
            expect(normalizeItemName('  Burger King  ')).toBe('burger king');
        });

        it('removes special characters', () => {
            expect(normalizeItemName('Burger™ (Large)')).toBe('burger large');
        });
    });
});
