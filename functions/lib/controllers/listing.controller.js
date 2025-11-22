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
exports.importListingFromUrl = void 0;
const cheerio = __importStar(require("cheerio"));
const fetchFn = globalThis.fetch;
const normalizePrice = (raw) => {
    if (!raw)
        return undefined;
    const match = raw.replace(/,/g, '').match(/([\d\.]+)/);
    if (match) {
        return parseFloat(match[1]);
    }
    return undefined;
};
const importListingFromUrl = async (req, res) => {
    const { url } = req.body;
    if (!url) {
        res.status(400).json({ error: 'URL is required' });
        return;
    }
    if (!fetchFn) {
        res.status(500).json({ error: 'Fetch not available in runtime' });
        return;
    }
    try {
        const response = await fetchFn(url, { redirect: 'follow' });
        const html = await response.text();
        const $ = cheerio.load(html);
        const ogTitle = $('meta[property="og:title"]').attr('content') || $('title').text();
        const ogDesc = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');
        const ogImage = $('meta[property="og:image"]').attr('content');
        const priceMeta = $('meta[property="product:price:amount"]').attr('content') || $('meta[property="og:price:amount"]').attr('content');
        const currencyMeta = $('meta[property="product:price:currency"]').attr('content') || $('meta[property="og:price:currency"]').attr('content');
        // Heuristic price extraction from visible text if meta missing
        const priceText = priceMeta || $('[class*="price"], [id*="price"]').first().text();
        const price = normalizePrice(priceText);
        const currency = currencyMeta || ((priceText === null || priceText === void 0 ? void 0 : priceText.includes('£')) ? 'GBP' : (priceText === null || priceText === void 0 ? void 0 : priceText.includes('$')) ? 'USD' : undefined);
        // Grab first 4 images
        const images = [];
        $('img').each((_, el) => {
            const src = $(el).attr('src');
            if (src && images.length < 4) {
                images.push(src);
            }
        });
        if (ogImage) {
            images.unshift(ogImage);
        }
        // Location heuristic
        const possibleLocation = $('[class*="location"], [id*="location"]').first().text().trim() || '';
        res.json({
            title: ogTitle === null || ogTitle === void 0 ? void 0 : ogTitle.trim(),
            description: ogDesc === null || ogDesc === void 0 ? void 0 : ogDesc.trim(),
            price: price || null,
            currency: currency || 'GBP',
            images: images.filter(Boolean),
            location: possibleLocation || undefined
        });
    }
    catch (error) {
        console.error('[ImportListing] Failed to import', error);
        res.status(500).json({ error: 'Failed to import listing from URL' });
    }
};
exports.importListingFromUrl = importListingFromUrl;
//# sourceMappingURL=listing.controller.js.map