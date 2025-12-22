"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callHeadlessScraper = callHeadlessScraper;
exports.getHeadlessErrorMessage = getHeadlessErrorMessage;
const errors_1 = require("../../utils/errors");
/**
 * Headless Scraper Client (Tier 3)
 *
 * Uses Browserless.io for reliable headless browser scraping.
 * No Docker/Chrome configuration needed - it's a managed service.
 */
const log_1 = require("../../utils/log");
// Browserless.io API (free tier: 1000 requests/month)
// Get your token at https://browserless.io
const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN || '';
const BROWSERLESS_URL = 'https://chrome.browserless.io';
/**
 * Recursively find product arrays in JSON
 */
function findProductArrays(obj, depth = 0) {
    if (depth > 8)
        return [];
    if (!obj || typeof obj !== 'object')
        return [];
    const results = [];
    if (Array.isArray(obj)) {
        const hasProducts = obj.length > 0 && obj.some(item => item && typeof item === 'object' &&
            (item.name || item.title || item.productName || item.itemName) &&
            (item.price !== undefined || item.prices || item.priceInfo || item.unitPrice));
        if (hasProducts) {
            results.push(...obj.filter(item => item && typeof item === 'object' &&
                (item.name || item.title || item.productName || item.itemName)));
        }
    }
    // Recurse into likely keys
    const productKeys = ['products', 'items', 'menuItems', 'menu', 'services',
        'offerings', 'catalog', 'data', 'results', 'edges', 'nodes', 'content',
        'list', 'records', 'entries', 'result', 'productList'];
    for (const key of Object.keys(obj)) {
        if (productKeys.includes(key.toLowerCase()) || Array.isArray(obj[key])) {
            results.push(...findProductArrays(obj[key], depth + 1));
        }
        else if (typeof obj[key] === 'object' && depth < 4) {
            results.push(...findProductArrays(obj[key], depth + 1));
        }
    }
    return results;
}
/**
 * Call Browserless.io to scrape a page and capture network responses
 */
async function callHeadlessScraper(request) {
    var _a, _b;
    if (!BROWSERLESS_TOKEN) {
        log_1.log.warn('[HeadlessScraper] BROWSERLESS_TOKEN not configured');
        return {
            type: 'headless_error',
            text: '',
            jsonData: [],
            responses: [],
            metadata: { source: 'config_error', itemCount: 0 },
        };
    }
    const { url, timeoutMs = 45000 } = request;
    log_1.log.info('[HeadlessScraper] Calling Browserless.io', { url });
    try {
        // Use Browserless /content endpoint with stealth to render JS SPAs
        const response = await fetch(`${BROWSERLESS_URL}/content?token=${BROWSERLESS_TOKEN}&stealth=true`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url,
                gotoOptions: {
                    waitUntil: 'networkidle0', // Wait for ALL network activity to stop
                    timeout: timeoutMs
                },
                waitForTimeout: 8000, // Wait 8s for XHR to complete
                waitForSelector: {
                    selector: 'body',
                    timeout: 10000
                },
                bestAttempt: true, // Return content even if errors occur
            }),
        });
        if (!response.ok) {
            const text = await response.text();
            log_1.log.error('[HeadlessScraper] Browserless error', { status: response.status, text });
            if (response.status === 429) {
                return {
                    type: 'headless_blocked',
                    text: '',
                    jsonData: [],
                    responses: [],
                    metadata: { source: 'rate_limited', itemCount: 0 },
                };
            }
            return {
                type: 'headless_error',
                text: '',
                jsonData: [],
                responses: [],
                metadata: { source: 'browserless_error', itemCount: 0 },
            };
        }
        // /content returns HTML string
        const html = await response.text();
        log_1.log.info('[HeadlessScraper] Got HTML response', {
            htmlLength: html.length,
        });
        // Extract products from embedded JSON in HTML
        const allProducts = [];
        const capturedResponses = [];
        // Look for JSON embedded in script tags (common SPA patterns)
        const jsonPatterns = [
            /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi,
            /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/gi,
            /<script[^>]*id="__NUXT__"[^>]*>([\s\S]*?)<\/script>/gi,
            /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/gi,
            /window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?});/gi,
        ];
        for (const pattern of jsonPatterns) {
            let match;
            while ((match = pattern.exec(html)) !== null) {
                try {
                    const jsonStr = match[1].trim();
                    const body = JSON.parse(jsonStr);
                    capturedResponses.push({
                        url: 'embedded-json',
                        status: 200,
                        contentType: 'application/json',
                        body,
                        truncated: false,
                    });
                    const products = findProductArrays(body);
                    allProducts.push(...products);
                }
                catch (e) {
                    // Invalid JSON, skip
                }
            }
        }
        // Also try to find visible product data in the HTML (text content)
        // This is a fallback for sites that render product data directly
        if (allProducts.length === 0) {
            // Check for product-like structures in any script tags
            const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
            let scriptMatch;
            while ((scriptMatch = scriptPattern.exec(html)) !== null) {
                const content = scriptMatch[1];
                // Look for JSON-like structures
                const jsonMatches = content.match(/(\{[^{}]*"(?:name|title|productName)"[^{}]*"price"[^{}]*\})/g);
                if (jsonMatches) {
                    for (const jsonStr of jsonMatches) {
                        try {
                            const body = JSON.parse(jsonStr);
                            const products = findProductArrays([body]);
                            allProducts.push(...products);
                        }
                        catch (e) { }
                    }
                }
            }
        }
        if (allProducts.length === 0) {
            // Return the HTML as text for Gemini to process
            // Strip script/style tags
            const cleanHtml = html
                .replace(/<script[\s\S]*?<\/script>/gi, '')
                .replace(/<style[\s\S]*?<\/style>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 50000);
            log_1.log.info('[HeadlessScraper] Cleaned HTML result', {
                rawHtmlLength: html.length,
                cleanHtmlLength: cleanHtml.length,
                preview: cleanHtml.slice(0, 500),
            });
            return {
                type: 'headless_no_items',
                text: cleanHtml,
                jsonData: [],
                responses: capturedResponses,
                metadata: { source: 'html_only', itemCount: 0 },
            };
        }
        // Convert products to text for Gemini
        const textLines = allProducts.slice(0, 100).map((p, i) => {
            const name = p.name || p.title || p.productName || p.itemName || 'Unknown';
            const parts = [`${i + 1}. ${name}`];
            if (p.description || p.content)
                parts.push(`   ${p.description || p.content}`);
            if (p.price !== undefined)
                parts.push(`   Price: ${p.currencyType || p.currency || ''} ${p.price}`);
            if (p.categoryName || p.category)
                parts.push(`   Category: ${p.categoryName || p.category}`);
            return parts.join('\n');
        });
        log_1.log.info('[HeadlessScraper] Extracted products', { count: allProducts.length });
        return {
            type: 'headless_json_ok',
            text: textLines.join('\n\n'),
            jsonData: allProducts,
            responses: capturedResponses,
            metadata: { source: 'browserless', itemCount: allProducts.length },
        };
    }
    catch (e) {
        log_1.log.error('[HeadlessScraper] Error', { error: (0, errors_1.getErrorMessage)(e) });
        const timedOut = ((_a = (0, errors_1.getErrorMessage)(e)) === null || _a === void 0 ? void 0 : _a.includes('timeout')) || ((_b = (0, errors_1.getErrorMessage)(e)) === null || _b === void 0 ? void 0 : _b.includes('Timeout'));
        return {
            type: timedOut ? 'headless_timeout' : 'headless_error',
            text: '',
            jsonData: [],
            responses: [],
            metadata: { source: 'fetch_error', itemCount: 0 },
        };
    }
}
/**
 * Get user-friendly error message for headless result type
 */
function getHeadlessErrorMessage(type) {
    switch (type) {
        case 'headless_blocked':
            return 'The website blocked automated access. Try uploading a screenshot instead.';
        case 'headless_captcha':
            return 'This website has CAPTCHA protection. Try uploading a screenshot instead.';
        case 'headless_timeout':
            return 'The page took too long to load. Try uploading a screenshot instead.';
        case 'headless_no_items':
            return 'Could not find menu items on this page. Try a direct link to the menu.';
        case 'headless_error':
            return 'An error occurred while loading the page. Try again or upload a screenshot.';
        default:
            return 'Extraction failed. Try uploading a screenshot.';
    }
}
//# sourceMappingURL=headless.js.map