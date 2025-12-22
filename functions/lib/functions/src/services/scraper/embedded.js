"use strict";
/**
 * Embedded JSON Extraction (Tier 2)
 *
 * Extracts data from JavaScript-embedded JSON in HTML pages.
 * Handles: Next.js, Nuxt, Apollo, JSON-LD, window state objects.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectSpaShell = detectSpaShell;
exports.detectBlockingResponse = detectBlockingResponse;
exports.extractEmbeddedJson = extractEmbeddedJson;
exports.getExtractionErrorMessage = getExtractionErrorMessage;
const cheerio = __importStar(require("cheerio"));
const log_1 = require("../../utils/log");
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
function detectSpaShell(html, $) {
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
function detectBlockingResponse(html, statusCode) {
    if (statusCode === 403)
        return 'blocked_403';
    if (statusCode === 429)
        return 'rate_limited_429';
    const lowerHtml = html.toLowerCase();
    // CAPTCHA detection
    if (lowerHtml.includes('captcha') ||
        lowerHtml.includes('recaptcha') ||
        lowerHtml.includes('hcaptcha') ||
        lowerHtml.includes('cf-turnstile') ||
        lowerHtml.includes('challenge-running')) {
        return 'captcha_challenge';
    }
    // Cloudflare challenge
    if (lowerHtml.includes('cloudflare') &&
        (lowerHtml.includes('checking your browser') || lowerHtml.includes('ray id'))) {
        return 'captcha_challenge';
    }
    return null;
}
/**
 * Parse potentially malformed JSON (handles trailing commas, etc.)
 */
function parseLooseJson(str) {
    try {
        return JSON.parse(str);
    }
    catch (_a) {
        // Try fixing common issues
        try {
            // Remove trailing commas
            const fixed = str
                .replace(/,\s*}/g, '}')
                .replace(/,\s*]/g, ']');
            return JSON.parse(fixed);
        }
        catch (_b) {
            return null;
        }
    }
}
/**
 * Recursively find arrays of product-like objects in JSON
 */
function findProductArrays(obj, depth = 0) {
    if (depth > 10)
        return [];
    if (!obj || typeof obj !== 'object')
        return [];
    const results = [];
    // Check if this is an array of product-like objects
    if (Array.isArray(obj)) {
        const hasProducts = obj.length > 0 && obj.some(item => item && typeof item === 'object' &&
            (item.name || item.title || item.productName) &&
            (item.price !== undefined || item.prices || item.priceInfo));
        if (hasProducts) {
            results.push(...obj.filter(item => item && typeof item === 'object' &&
                (item.name || item.title || item.productName)));
        }
    }
    // Recurse into object properties
    for (const key of Object.keys(obj)) {
        const productKeys = ['products', 'items', 'menuItems', 'menu', 'services',
            'offerings', 'catalog', 'data', 'results', 'edges', 'nodes'];
        if (productKeys.includes(key.toLowerCase()) || Array.isArray(obj[key])) {
            results.push(...findProductArrays(obj[key], depth + 1));
        }
        else if (typeof obj[key] === 'object') {
            results.push(...findProductArrays(obj[key], depth + 1));
        }
    }
    return results;
}
/**
 * Extract product data from JSON-LD schema
 */
function extractFromJsonLd(jsonLdArray) {
    var _a, _b, _c, _d, _e, _f;
    const products = [];
    for (const schema of jsonLdArray) {
        if (!schema)
            continue;
        // Direct product
        if (schema['@type'] === 'Product' || schema['@type'] === 'MenuItem') {
            products.push({
                name: schema.name,
                description: schema.description,
                price: ((_a = schema.offers) === null || _a === void 0 ? void 0 : _a.price) || schema.price,
                currency: ((_b = schema.offers) === null || _b === void 0 ? void 0 : _b.priceCurrency) || schema.priceCurrency,
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
                        price: (_c = item.item.offers) === null || _c === void 0 ? void 0 : _c.price,
                        currency: (_d = item.item.offers) === null || _d === void 0 ? void 0 : _d.priceCurrency,
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
                        price: (_e = menuItem.offers) === null || _e === void 0 ? void 0 : _e.price,
                        currency: (_f = menuItem.offers) === null || _f === void 0 ? void 0 : _f.priceCurrency,
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
function extractEmbeddedJson(html, statusCode = 200) {
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
        let jsonData = null;
        let rawJson = '';
        if (pattern.selector) {
            // DOM selector approach
            const scriptTag = $(pattern.selector).first();
            if (scriptTag.length) {
                rawJson = scriptTag.html() || '';
            }
        }
        else if (pattern.pattern) {
            // Regex approach
            const match = html.match(pattern.pattern);
            if (match && match[1]) {
                rawJson = match[1];
            }
        }
        if (!rawJson)
            continue;
        // Parse JSON
        jsonData = parseLooseJson(rawJson);
        if (!jsonData)
            continue;
        log_1.log.info('[EmbeddedExtractor] Found embedded JSON', { pattern: pattern.name });
        // Extract products based on type
        let products = [];
        if (pattern.type === 'json_ld') {
            // Collect all JSON-LD scripts
            const jsonLdScripts = [];
            $('script[type="application/ld+json"]').each((_, el) => {
                const content = $(el).html();
                if (content) {
                    const parsed = parseLooseJson(content);
                    if (parsed) {
                        if (Array.isArray(parsed)) {
                            jsonLdScripts.push(...parsed);
                        }
                        else {
                            jsonLdScripts.push(parsed);
                        }
                    }
                }
            });
            products = extractFromJsonLd(jsonLdScripts);
        }
        else {
            // Generic product array discovery
            products = findProductArrays(jsonData);
        }
        if (products.length > 0) {
            // Convert products to text for Gemini
            const textLines = products.map((p, i) => {
                const parts = [`${i + 1}. ${p.name || p.title || 'Unknown'}`];
                if (p.description)
                    parts.push(`   ${p.description}`);
                if (p.price !== undefined)
                    parts.push(`   Price: ${p.currency || ''} ${p.price}`);
                if (p.category)
                    parts.push(`   Category: ${p.category}`);
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
function getExtractionErrorMessage(type) {
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
//# sourceMappingURL=embedded.js.map