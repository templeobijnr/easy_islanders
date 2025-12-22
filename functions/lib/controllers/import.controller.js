"use strict";
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
exports.importPropertyFromUrl = void 0;
const generative_ai_1 = require("@google/generative-ai");
const cheerio = __importStar(require("cheerio"));
const fetchFn = globalThis.fetch;
// Lazy initialize Gemini to avoid module-load warnings when key is injected at runtime
let genAI = null;
const getGenAI = () => {
    if (genAI)
        return genAI;
    const key = process.env.GEMINI_API_KEY;
    if (!key)
        return null;
    genAI = new generative_ai_1.GoogleGenerativeAI(key);
    return genAI;
};
/**
 * Import property from URL using Gemini AI with Google Search
 * POST /v1/import/property
 * Body: { url: string }
 */
const normalizePrice = (raw) => {
    if (!raw)
        return undefined;
    const match = raw.replace(/,/g, '').match(/([\d\.]+)/);
    if (match) {
        return parseFloat(match[1]);
    }
    return undefined;
};
const toAbsoluteUrl = (baseUrl, relativeUrl) => {
    if (!relativeUrl)
        return null;
    try {
        // Already absolute
        if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
            return relativeUrl;
        }
        // Protocol-relative URL
        if (relativeUrl.startsWith('//')) {
            return 'https:' + relativeUrl;
        }
        // Relative URL
        const base = new URL(baseUrl);
        return new URL(relativeUrl, base.origin).href;
    }
    catch (error) {
        console.warn('Failed to convert URL:', relativeUrl);
        return null;
    }
};
const isProtectionPage = (html, title) => {
    const protectionIndicators = [
        'Just a moment',
        'Checking your browser',
        'Please wait',
        'DDoS protection',
        'cloudflare',
        'cf-browser-verification',
        'Access denied'
    ];
    const htmlLower = html.toLowerCase();
    const titleLower = (title || '').toLowerCase();
    return protectionIndicators.some(indicator => htmlLower.includes(indicator.toLowerCase()) ||
        titleLower.includes(indicator.toLowerCase()));
};
const scrapeListing = async (url) => {
    if (!fetchFn)
        return null;
    console.log('🔵 [Scrape] Fetching URL:', url);
    try {
        const response = await fetchFn(url, {
            redirect: 'follow',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }
        });
        const html = await response.text();
        // Check if we hit a protection page
        if (isProtectionPage(html)) {
            console.warn('⚠️ [Scrape] Detected protection page (Cloudflare/bot detection). Skipping scrape, will use AI search instead.');
            return null;
        }
        const $ = cheerio.load(html);
        // Extract title with fallbacks
        const ogTitle = $('meta[property="og:title"]').attr('content')
            || $('meta[name="twitter:title"]').attr('content')
            || $('h1').first().text()
            || $('title').text();
        // Extract description
        const ogDesc = $('meta[property="og:description"]').attr('content')
            || $('meta[name="description"]').attr('content')
            || $('meta[name="twitter:description"]').attr('content');
        // Extract OG image
        const ogImage = $('meta[property="og:image"]').attr('content')
            || $('meta[name="twitter:image"]').attr('content');
        // Extract price
        const priceMeta = $('meta[property="product:price:amount"]').attr('content')
            || $('meta[property="og:price:amount"]').attr('content');
        const currencyMeta = $('meta[property="product:price:currency"]').attr('content')
            || $('meta[property="og:price:currency"]').attr('content');
        const priceText = priceMeta
            || $('[class*="price"]').first().text()
            || $('[id*="price"]').first().text()
            || $('.price').first().text();
        const price = normalizePrice(priceText);
        const currency = currencyMeta
            || ((priceText === null || priceText === void 0 ? void 0 : priceText.includes('£')) ? 'GBP' : (priceText === null || priceText === void 0 ? void 0 : priceText.includes('$')) ? 'USD' : 'GBP');
        // Extract images more carefully
        const images = [];
        // Add OG image first (usually the main image)
        if (ogImage) {
            const absoluteUrl = toAbsoluteUrl(url, ogImage);
            if (absoluteUrl)
                images.push(absoluteUrl);
        }
        // Find images from img tags
        $('img').each((_, el) => {
            if (images.length >= 12)
                return false; // Limit to 12 images
            // Try multiple attributes (lazy loading support)
            const src = $(el).attr('src')
                || $(el).attr('data-src')
                || $(el).attr('data-lazy-src')
                || $(el).attr('data-original');
            if (src) {
                const absoluteUrl = toAbsoluteUrl(url, src);
                // Filter out tiny images, icons, logos
                const width = parseInt($(el).attr('width') || '0');
                const height = parseInt($(el).attr('height') || '0');
                const isLargeEnough = !width || !height || (width > 200 && height > 150);
                // Avoid common non-property images
                const isNotIcon = !src.includes('logo') && !src.includes('icon') && !src.includes('avatar');
                if (absoluteUrl && isLargeEnough && isNotIcon && !images.includes(absoluteUrl)) {
                    images.push(absoluteUrl);
                }
            }
            return true; // Continue iteration
        });
        // Extract location
        const possibleLocation = $('[class*="location"]').first().text().trim()
            || $('[id*="location"]').first().text().trim()
            || $('[class*="address"]').first().text().trim()
            || '';
        // Validate extracted title
        const validTitle = (ogTitle === null || ogTitle === void 0 ? void 0 : ogTitle.trim()) && !isProtectionPage('', ogTitle) ? ogTitle.trim() : undefined;
        console.log('✅ [Scrape] Extracted:', {
            title: validTitle === null || validTitle === void 0 ? void 0 : validTitle.substring(0, 50),
            price,
            images: images.length,
            location: possibleLocation === null || possibleLocation === void 0 ? void 0 : possibleLocation.substring(0, 30)
        });
        return {
            title: validTitle,
            description: ogDesc === null || ogDesc === void 0 ? void 0 : ogDesc.trim(),
            price: price || null,
            currency: currency || 'GBP',
            images: images.filter(Boolean),
            location: possibleLocation || undefined
        };
    }
    catch (error) {
        console.error('❌ [Scrape] Error:', error.message);
        return null;
    }
};
const importPropertyFromUrl = async (req, res) => {
    var _a, _b, _c;
    const { url } = req.body;
    if (!url) {
        res.status(400).json({ error: 'URL is required' });
        return;
    }
    try {
        console.log('🔵 [Import] Processing URL:', url);
        const scraped = await scrapeListing(url);
        let aiData = {};
        const client = getGenAI();
        if (client) {
            console.log('🤖 [AI] Enhancing with Gemini...');
            const model = client.getGenerativeModel({
                model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp'
            }, { apiVersion: 'v1beta' });
            const hasValidScrapedData = (scraped === null || scraped === void 0 ? void 0 : scraped.title) && scraped.title.length > 10;
            const prompt = `
        Extract property listing data from this URL: ${url}

        ${hasValidScrapedData ? `SCRAPED DATA (use as foundation):\n${JSON.stringify(scraped, null, 2)}` : `SCRAPED DATA: Unable to scrape (site may be protected by Cloudflare or bot detection)`}

        INSTRUCTIONS:
        ${!hasValidScrapedData ? `- The URL is protected/blocked, so you MUST use Google Search to find information about this property listing
        - Search for the property using the URL domain and any identifiable information
        - Look for the property on real estate listing sites, property portals, or related pages` : '- Use scraped data as foundation and enhance with additional details if needed'}
        - Extract all available property details
        - Return ONLY valid JSON (no markdown, no explanation, no code blocks)
        - If a field is truly unknown after searching, use null
        - DO NOT use placeholder text like "Just a moment..." or loading messages

        Required JSON structure (all fields must be present):
        {
          "title": string (actual property title, minimum 10 characters),
          "price": number (numeric value only, no currency symbols, must be > 0),
          "currency": "GBP" | "USD" | "EUR" | "TRY",
          "location": string (city/district/area name),
          "description": string (detailed property description, minimum 50 characters),
          "bedrooms": number (must be >= 0, use 1 as default if unknown),
          "bathrooms": number (must be >= 0, use 1 as default if unknown),
          "squareMeters": number | null (property size in m²),
          "plotSize": number | null (land/plot size in m²),
          "category": "Villa" | "Semi-Detached" | "Residence" | "Detached House" | "Timeshare" | "Unfinished Building" | "Flat" | "Penthouse" | "Bungalow" | "Complete Building",
          "rentalType": "sale" | "short-term" | "long-term" | "project",
          "furnishedStatus": "Unfurnished" | "Semi-Furnished" | "Fully Furnished",
          "buildYear": number (year built, e.g., 2020, 2015, or current year for brand new),
          "amenities": string[] (e.g., ["Pool", "Gym", "Wi-Fi", "Sea View", "Parking", "Air Conditioning"]),
          "images": string[] (absolute URLs only, starting with http:// or https://),
          "depositNeeded": boolean (for short-term rentals),
          "cleaningFee": number | null (for short-term rentals),
          "monthlyDeposit": number | null (for long-term rentals),
          "titleDeedType": "Exchange Title" | "Turkish Title" | "TMD Title" | "Leasehold" | null (for sale listings),
          "paymentPlanAvailable": boolean (for sale and project listings)
        }

        VALIDATION RULES:
        - title must NOT contain: "Just a moment", "Please wait", "Loading", "Cloudflare"
        - price must be a positive number greater than 0
        - description must be meaningful and at least 50 characters
        - bedrooms and bathrooms must be positive integers (default to 1 if unknown)
        - category must be one of the exact values listed
        - rentalType must be one of the exact values listed
        - images must be absolute URLs or empty array if none found

        Return valid JSON immediately:
      `;
            try {
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();
                console.log('🤖 [AI] Raw response:', text.substring(0, 200));
                const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
                const start = cleanedText.indexOf('{');
                const end = cleanedText.lastIndexOf('}');
                if (start !== -1 && end !== -1) {
                    const jsonStr = cleanedText.substring(start, end + 1);
                    const parsed = JSON.parse(jsonStr);
                    // Validate parsed data
                    const isValidTitle = parsed.title &&
                        parsed.title.length >= 10 &&
                        !isProtectionPage('', parsed.title);
                    const isValidPrice = parsed.price && parsed.price > 0;
                    const isValidDescription = parsed.description && parsed.description.length >= 20;
                    if (!isValidTitle) {
                        console.warn('⚠️ [AI] Invalid title:', parsed.title);
                    }
                    if (!isValidPrice) {
                        console.warn('⚠️ [AI] Invalid price:', parsed.price);
                    }
                    if (!isValidDescription) {
                        console.warn('⚠️ [AI] Invalid/short description');
                    }
                    // Only use AI data if critical fields are valid
                    if (isValidTitle || isValidPrice || isValidDescription) {
                        aiData = Object.assign(Object.assign({}, parsed), { 
                            // Ensure numeric fields are numbers
                            price: Number(parsed.price) || null, bedrooms: Number(parsed.bedrooms) || 1, bathrooms: Number(parsed.bathrooms) || 1, squareMeters: parsed.squareMeters ? Number(parsed.squareMeters) : null, plotSize: parsed.plotSize ? Number(parsed.plotSize) : null, buildYear: parsed.buildYear ? Number(parsed.buildYear) : new Date().getFullYear(), cleaningFee: parsed.cleaningFee ? Number(parsed.cleaningFee) : null, monthlyDeposit: parsed.monthlyDeposit ? Number(parsed.monthlyDeposit) : null, 
                            // Ensure booleans
                            depositNeeded: Boolean(parsed.depositNeeded), paymentPlanAvailable: Boolean(parsed.paymentPlanAvailable), 
                            // Ensure arrays
                            amenities: Array.isArray(parsed.amenities) ? parsed.amenities : [], images: Array.isArray(parsed.images) ? parsed.images.filter((img) => img && (img.startsWith('http://') || img.startsWith('https://'))) : [] });
                        console.log('✅ [AI] Parsed and validated data:', {
                            title: (_a = aiData.title) === null || _a === void 0 ? void 0 : _a.substring(0, 50),
                            price: aiData.price,
                            bedrooms: aiData.bedrooms,
                            bathrooms: aiData.bathrooms,
                            squareMeters: aiData.squareMeters,
                            images: (_b = aiData.images) === null || _b === void 0 ? void 0 : _b.length,
                            amenities: (_c = aiData.amenities) === null || _c === void 0 ? void 0 : _c.length
                        });
                    }
                    else {
                        console.warn('⚠️ [AI] Validation failed, critical fields missing');
                    }
                }
                else {
                    console.warn('⚠️ [AI] Could not extract JSON from response');
                }
            }
            catch (error) {
                console.error('🔴 [AI] Error:', error.message);
                // Continue with scraped data only
            }
        }
        // Smart merge: prefer valid data from either source
        const scrapedAny = scraped;
        const merged = {
            title: aiData.title || (scraped === null || scraped === void 0 ? void 0 : scraped.title) || 'Untitled Property',
            description: aiData.description || (scraped === null || scraped === void 0 ? void 0 : scraped.description) || 'No description available',
            price: aiData.price || (scraped === null || scraped === void 0 ? void 0 : scraped.price) || null,
            currency: aiData.currency || (scraped === null || scraped === void 0 ? void 0 : scraped.currency) || 'GBP',
            location: aiData.location || (scraped === null || scraped === void 0 ? void 0 : scraped.location) || 'Unknown',
            bedrooms: aiData.bedrooms || (scrapedAny === null || scrapedAny === void 0 ? void 0 : scrapedAny.bedrooms) || 1,
            bathrooms: aiData.bathrooms || (scrapedAny === null || scrapedAny === void 0 ? void 0 : scrapedAny.bathrooms) || 1,
            squareMeters: aiData.squareMeters || (scrapedAny === null || scrapedAny === void 0 ? void 0 : scrapedAny.squareMeters) || null,
            plotSize: aiData.plotSize || null,
            category: aiData.category || 'Villa',
            rentalType: aiData.rentalType || 'sale',
            furnishedStatus: aiData.furnishedStatus || 'Unfurnished',
            buildYear: aiData.buildYear || new Date().getFullYear(),
            depositNeeded: aiData.depositNeeded || false,
            cleaningFee: aiData.cleaningFee || null,
            monthlyDeposit: aiData.monthlyDeposit || null,
            titleDeedType: aiData.titleDeedType || null,
            paymentPlanAvailable: aiData.paymentPlanAvailable || false,
            amenities: [...(aiData.amenities || []), ...((scrapedAny === null || scrapedAny === void 0 ? void 0 : scrapedAny.amenities) || [])].filter((v, i, a) => a.indexOf(v) === i),
            images: Array.from(new Set([...(aiData.images || []), ...((scraped === null || scraped === void 0 ? void 0 : scraped.images) || [])])).filter(Boolean)
        };
        // Validate final result
        const hasValidData = merged.title.length >= 10 &&
            !isProtectionPage('', merged.title) &&
            merged.description.length >= 20;
        if (!hasValidData) {
            console.warn('⚠️ [Import] Final validation failed');
            res.status(400).json({
                error: 'Unable to extract valid property data',
                message: 'The URL may be protected or inaccessible. Please try a different URL or fill in details manually.',
                partial: merged
            });
            return;
        }
        console.log('✅ [Import] Returning validated property data:', {
            title: merged.title.substring(0, 50),
            price: merged.price,
            bedrooms: merged.bedrooms,
            bathrooms: merged.bathrooms,
            amenities: merged.amenities.length,
            images: merged.images.length
        });
        res.json(merged);
    }
    catch (error) {
        console.error('🔴 [Import] Error:', error.message);
        res.status(500).json({
            error: 'Failed to import property',
            details: error.message
        });
    }
};
exports.importPropertyFromUrl = importPropertyFromUrl;
//# sourceMappingURL=import.controller.js.map