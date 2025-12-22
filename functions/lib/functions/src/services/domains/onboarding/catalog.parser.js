"use strict";
/**
 * Catalog Parser
 *
 * Parses item names and prices from free-text WhatsApp messages.
 * Supports multiple currencies and formats.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseItemsFromText = parseItemsFromText;
exports.normalizeItemName = normalizeItemName;
// Currency patterns
const CURRENCY_MAP = {
    '€': 'EUR',
    '$': 'USD',
    '£': 'GBP',
    '₺': 'TRY',
    'tl': 'TRY',
    'eur': 'EUR',
    'usd': 'USD',
    'gbp': 'GBP',
    'try': 'TRY',
};
// Regex patterns for price extraction
// Matches: "Item €12", "Item 12€", "Item 12 EUR", "Item €12.50"
const PRICE_PATTERNS = [
    // Symbol before: €12, $12.50
    /^(.+?)\s*([€$£₺])\s*(\d+(?:[.,]\d{1,2})?)\s*$/i,
    // Symbol after: 12€, 12.50$
    /^(.+?)\s+(\d+(?:[.,]\d{1,2})?)\s*([€$£₺])\s*$/i,
    // Currency code after: 12 EUR, 12.50 TL
    /^(.+?)\s+(\d+(?:[.,]\d{1,2})?)\s*(EUR|USD|GBP|TRY|TL)\s*$/i,
    // Currency code before: EUR 12
    /^(.+?)\s+(EUR|USD|GBP|TRY|TL)\s*(\d+(?:[.,]\d{1,2})?)\s*$/i,
];
/**
 * Normalize price string to number.
 * Handles both "12.50" and "12,50" formats.
 */
function normalizePrice(priceStr) {
    return parseFloat(priceStr.replace(',', '.'));
}
/**
 * Normalize currency symbol/code to standard 3-letter code.
 */
function normalizeCurrency(currencyStr) {
    const lower = currencyStr.toLowerCase().trim();
    return CURRENCY_MAP[lower] || 'EUR';
}
/**
 * Parse a single line for item + price.
 * Returns null if no valid item found.
 */
function parseLine(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3)
        return null;
    for (const pattern of PRICE_PATTERNS) {
        const match = trimmed.match(pattern);
        if (match) {
            // Patterns have different group orders
            let name;
            let priceStr;
            let currencyStr;
            if (pattern === PRICE_PATTERNS[0]) {
                // Symbol before: name, symbol, price
                [, name, currencyStr, priceStr] = match;
            }
            else if (pattern === PRICE_PATTERNS[1]) {
                // Symbol after: name, price, symbol
                [, name, priceStr, currencyStr] = match;
            }
            else if (pattern === PRICE_PATTERNS[2]) {
                // Code after: name, price, code
                [, name, priceStr, currencyStr] = match;
            }
            else if (pattern === PRICE_PATTERNS[3]) {
                // Code before: name, code, price
                [, name, currencyStr, priceStr] = match;
            }
            else {
                continue;
            }
            const cleanName = name.trim();
            if (cleanName.length < 2)
                continue;
            return {
                name: cleanName,
                price: normalizePrice(priceStr),
                currency: normalizeCurrency(currencyStr),
            };
        }
    }
    return null;
}
/**
 * Parse multiple items from text.
 * Splits by comma, newline, or semicolon.
 * Returns max 10 items per message (guard against abuse).
 */
function parseItemsFromText(text) {
    if (!text || typeof text !== 'string')
        return [];
    // Split by common delimiters
    const lines = text
        .split(/[,;\n]+/)
        .map(l => l.trim())
        .filter(l => l.length > 0);
    const items = [];
    const MAX_ITEMS_PER_MESSAGE = 10;
    for (const line of lines) {
        if (items.length >= MAX_ITEMS_PER_MESSAGE)
            break;
        const parsed = parseLine(line);
        if (parsed) {
            items.push(parsed);
        }
    }
    return items;
}
/**
 * Normalize item name for ID generation.
 * Lowercase, remove extra whitespace, remove special chars.
 */
function normalizeItemName(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[^a-z0-9\s]/g, '');
}
//# sourceMappingURL=catalog.parser.js.map