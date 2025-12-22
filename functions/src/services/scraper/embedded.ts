/**
 * Embedded JSON Extraction (Tier 2)
 *
 * Extracts data from JavaScript-embedded JSON in HTML pages.
 * Handles: Next.js, Nuxt, Apollo, JSON-LD, window state objects.
 */

import * as cheerio from 'cheerio';
import { log } from '../../utils/log';

export type ExtractionResultType =
    | 'static_ok'           // Normal HTML with content
    | 'embedded_json_ok'    // Found and extracted embedded JSON
    | 'js_shell_detected'   // SPA shell with no content
    | 'blocked_403'         // Access denied
    | 'rate_limited_429'    // Rate limited
    | 'captcha_challenge'   // CAPTCHA or bot challenge detected
    | 'parse_error'         // Could not parse response
    | 'no_items_found'      // Parsed but no products/items
    | 'timeout'             // Request timed out
    | 'unknown_error';      // Catch-all

export interface EmbeddedExtractionResult {
    type: ExtractionResultType;
    text: string;
    jsonData: any[];
    metadata: {
        source: string;  // Which pattern matched
        itemCount: number;
    };
}

// Patterns for embedded JSON extraction
const EMBEDDED_PATTERNS = [
    {
        name: 'next_data',
        selector: 'script#__NEXT_DATA__',
        type: 'json',
    },
    {
        name: 'nuxt_data',
        pattern: /window\.__NUXT__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/,
        type: 'js_object',
    },
    {
        name: 'apollo_state',
        pattern: /window\.__APOLLO_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/,
        type: 'js_object',
    },
    {
        name: 'initial_state',
        pattern: /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/,
        type: 'js_object',
    },
    {
        name: 'preloaded_state',
        pattern: /window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/,
        type: 'js_object',
    },
    {
        name: 'redux_state',
        pattern: /window\.__REDUX_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/,
        type: 'js_object',
    },
    {
        name: 'json_ld_product',
        selector: 'script[type="application/ld+json"]',
        type: 'json_ld',
    },
];

/**
 * Detect if HTML is a JavaScript SPA shell with minimal content
 */
export function detectSpaShell(html: string, $: cheerio.CheerioAPI): boolean {
    // Remove scripts, styles, and metadata
    const clone = $.root().clone();
    clone.find('script, style, meta, link, noscript').remove();

    const bodyText = clone.find('body').text().replace(/\s+/g, ' ').trim();

    // Common SPA shell indicators
    const spaIndicators = [
        bodyText.length < 100,
        /enable\s*javascript/i.test(bodyText),
        /loading/i.test(bodyText) && bodyText.length < 200,
        $('div#app, div#root, div#__next, div#__nuxt').length > 0 && bodyText.length < 200,
        $('script').length > 3 && bodyText.length < 150,
    ];

    return spaIndicators.filter(Boolean).length >= 2;
}

/**
 * Detect blocking/challenge responses
 */
export function detectBlockingResponse(html: string, statusCode: number): ExtractionResultType | null {
    if (statusCode === 403) return 'blocked_403';
    if (statusCode === 429) return 'rate_limited_429';

    const lowerHtml = html.toLowerCase();

    // CAPTCHA detection
    if (
        lowerHtml.includes('captcha') ||
        lowerHtml.includes('recaptcha') ||
        lowerHtml.includes('hcaptcha') ||
        lowerHtml.includes('cf-turnstile') ||
        lowerHtml.includes('challenge-running')
    ) {
        return 'captcha_challenge';
    }

    // Cloudflare challenge
    if (
        lowerHtml.includes('cloudflare') &&
        (lowerHtml.includes('checking your browser') || lowerHtml.includes('ray id'))
    ) {
        return 'captcha_challenge';
    }

    return null;
}

/**
 * Parse potentially malformed JSON (handles trailing commas, etc.)
 */
function parseLooseJson(str: string): any {
    try {
        return JSON.parse(str);
    } catch {
        // Try fixing common issues
        try {
            // Remove trailing commas
            const fixed = str
                .replace(/,\s*}/g, '}')
                .replace(/,\s*]/g, ']');
            return JSON.parse(fixed);
        } catch {
            return null;
        }
    }
}

/**
 * Recursively find arrays of product-like objects in JSON
 */
function findProductArrays(obj: any, depth = 0): any[] {
    if (depth > 10) return [];
    if (!obj || typeof obj !== 'object') return [];

    const results: any[] = [];

    // Check if this is an array of product-like objects
    if (Array.isArray(obj)) {
        const hasProducts = obj.length > 0 && obj.some(item =>
            item && typeof item === 'object' &&
            (item.name || item.title || item.productName) &&
            (item.price !== undefined || item.prices || item.priceInfo)
        );
        if (hasProducts) {
            results.push(...obj.filter(item =>
                item && typeof item === 'object' &&
                (item.name || item.title || item.productName)
            ));
        }
    }

    // Recurse into object properties
    for (const key of Object.keys(obj)) {
        const productKeys = ['products', 'items', 'menuItems', 'menu', 'services',
            'offerings', 'catalog', 'data', 'results', 'edges', 'nodes'];

        if (productKeys.includes(key.toLowerCase()) || Array.isArray(obj[key])) {
            results.push(...findProductArrays(obj[key], depth + 1));
        } else if (typeof obj[key] === 'object') {
            results.push(...findProductArrays(obj[key], depth + 1));
        }
    }

    return results;
}

/**
 * Extract product data from JSON-LD schema
 */
function extractFromJsonLd(jsonLdArray: any[]): any[] {
    const products: any[] = [];

    for (const schema of jsonLdArray) {
        if (!schema) continue;

        // Direct product
        if (schema['@type'] === 'Product' || schema['@type'] === 'MenuItem') {
            products.push({
                name: schema.name,
                description: schema.description,
                price: schema.offers?.price || schema.price,
                currency: schema.offers?.priceCurrency || schema.priceCurrency,
                imageUrl: schema.image,
                category: schema.category,
            });
        }

        // Product list in ItemList
        if (schema['@type'] === 'ItemList' && schema.itemListElement) {
            for (const item of schema.itemListElement) {
                if (item.item) {
                    products.push({
                        name: item.item.name,
                        description: item.item.description,
                        price: item.item.offers?.price,
                        currency: item.item.offers?.priceCurrency,
                        imageUrl: item.item.image,
                    });
                }
            }
        }

        // Menu schema
        if (schema['@type'] === 'Menu' && schema.hasMenuSection) {
            for (const section of schema.hasMenuSection) {
                const category = section.name;
                for (const menuItem of section.hasMenuItem || []) {
                    products.push({
                        name: menuItem.name,
                        description: menuItem.description,
                        price: menuItem.offers?.price,
                        currency: menuItem.offers?.priceCurrency,
                        category,
                    });
                }
            }
        }

        // Restaurant with menu
        if (schema['@type'] === 'Restaurant' && schema.hasMenu) {
            const menu = Array.isArray(schema.hasMenu) ? schema.hasMenu : [schema.hasMenu];
            products.push(...extractFromJsonLd(menu));
        }
    }

    return products;
}

/**
 * Main extraction function for embedded JSON
 */
export function extractEmbeddedJson(html: string, statusCode = 200): EmbeddedExtractionResult {
    const $ = cheerio.load(html);

    // Check for blocking responses first
    const blockingType = detectBlockingResponse(html, statusCode);
    if (blockingType) {
        return {
            type: blockingType,
            text: '',
            jsonData: [],
            metadata: { source: 'blocking_detection', itemCount: 0 },
        };
    }

    // Try each pattern
    for (const pattern of EMBEDDED_PATTERNS) {
        let jsonData: any = null;
        let rawJson = '';

        if (pattern.selector) {
            // DOM selector approach
            const scriptTag = $(pattern.selector).first();
            if (scriptTag.length) {
                rawJson = scriptTag.html() || '';
            }
        } else if (pattern.pattern) {
            // Regex approach
            const match = html.match(pattern.pattern);
            if (match && match[1]) {
                rawJson = match[1];
            }
        }

        if (!rawJson) continue;

        // Parse JSON
        jsonData = parseLooseJson(rawJson);
        if (!jsonData) continue;

        log.info('[EmbeddedExtractor] Found embedded JSON', { pattern: pattern.name });

        // Extract products based on type
        let products: any[] = [];

        if (pattern.type === 'json_ld') {
            // Collect all JSON-LD scripts
            const jsonLdScripts: any[] = [];
            $('script[type="application/ld+json"]').each((_, el) => {
                const content = $(el).html();
                if (content) {
                    const parsed = parseLooseJson(content);
                    if (parsed) {
                        if (Array.isArray(parsed)) {
                            jsonLdScripts.push(...parsed);
                        } else {
                            jsonLdScripts.push(parsed);
                        }
                    }
                }
            });
            products = extractFromJsonLd(jsonLdScripts);
        } else {
            // Generic product array discovery
            products = findProductArrays(jsonData);
        }

        if (products.length > 0) {
            // Convert products to text for Gemini
            const textLines = products.map((p, i) => {
                const parts = [`${i + 1}. ${p.name || p.title || 'Unknown'}`];
                if (p.description) parts.push(`   ${p.description}`);
                if (p.price !== undefined) parts.push(`   Price: ${p.currency || ''} ${p.price}`);
                if (p.category) parts.push(`   Category: ${p.category}`);
                return parts.join('\n');
            });

            return {
                type: 'embedded_json_ok',
                text: textLines.join('\n\n'),
                jsonData: products,
                metadata: { source: pattern.name, itemCount: products.length },
            };
        }
    }

    // Check if this looks like an SPA shell
    if (detectSpaShell(html, $)) {
        return {
            type: 'js_shell_detected',
            text: '',
            jsonData: [],
            metadata: { source: 'spa_detection', itemCount: 0 },
        };
    }

    // No embedded JSON found, return for static processing
    return {
        type: 'no_items_found',
        text: '',
        jsonData: [],
        metadata: { source: 'none', itemCount: 0 },
    };
}

/**
 * Convert extraction result to human-readable error message
 */
export function getExtractionErrorMessage(type: ExtractionResultType): string {
    switch (type) {
        case 'js_shell_detected':
            return 'This website requires JavaScript to load content. Try uploading a screenshot or PDF instead.';
        case 'blocked_403':
            return 'Access to this website was denied (403 Forbidden).';
        case 'rate_limited_429':
            return 'Rate limited by the website. Please try again later.';
        case 'captcha_challenge':
            return 'This website has bot protection. Try uploading a screenshot instead.';
        case 'no_items_found':
            return 'Could not find menu items or products on this page. Try a direct link to the menu page.';
        case 'timeout':
            return 'Request timed out. The website may be slow or unreachable.';
        case 'parse_error':
            return 'Could not parse the website content.';
        default:
            return 'An unexpected error occurred while extracting content.';
    }
}
