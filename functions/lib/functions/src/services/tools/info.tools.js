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
exports.infoTools = void 0;
const errors_1 = require("../../utils/errors");
/**
 * Consumer Tools: Information & Discovery
 *
 * Read-only tools for pharmacies, news, exchange rates, events.
 */
const logger = __importStar(require("firebase-functions/logger"));
const admin_catalog_repository_1 = require("../../repositories/admin-catalog.repository");
exports.infoTools = {
    /**
     * Find on-duty pharmacies for today
     */
    findPharmacy: async (args) => {
        logger.info('[InfoTools] Finding pharmacies', args);
        try {
            const data = await admin_catalog_repository_1.pharmacyRepository.getTodaysPharmacies(args.district);
            if (!data || data.pharmacies.length === 0) {
                return {
                    success: true,
                    pharmacies: [],
                    message: 'No on-duty pharmacy information available for today.',
                };
            }
            // Build response with maps links
            const pharmacies = data.pharmacies.map(p => ({
                name: p.name,
                address: p.address,
                phone: p.phone,
                district: p.district,
                mapsLink: p.geo
                    ? `https://www.google.com/maps?q=${p.geo.lat},${p.geo.lng}`
                    : `https://www.google.com/maps/search/${encodeURIComponent(p.address)}`,
            }));
            return {
                success: true,
                date: data.date,
                pharmacies,
                message: `Found ${pharmacies.length} on-duty pharmacy(s) for today.`,
            };
        }
        catch (err) {
            logger.error('[InfoTools] Pharmacy lookup failed', err);
            return { success: false, error: (0, errors_1.getErrorMessage)(err) };
        }
    },
    /**
     * Get latest news
     */
    getNews: async () => {
        logger.info('[InfoTools] Getting news');
        try {
            const data = await admin_catalog_repository_1.newsRepository.getLatest();
            if (!data || data.articles.length === 0) {
                return {
                    success: true,
                    articles: [],
                    message: 'No news available at the moment.',
                };
            }
            return {
                success: true,
                articles: data.articles.slice(0, 5).map(a => ({
                    title: a.title,
                    source: a.source,
                    url: a.url,
                    publishedAt: a.publishedAt,
                })),
                message: `Here are the latest headlines from North Cyprus.`,
            };
        }
        catch (err) {
            logger.error('[InfoTools] News fetch failed', err);
            return { success: false, error: (0, errors_1.getErrorMessage)(err) };
        }
    },
    /**
     * Get exchange rates
     */
    getExchangeRate: async (args) => {
        var _a;
        logger.info('[InfoTools] Getting exchange rates', args);
        try {
            // Use a free API (exchangerate-api.com or similar)
            const base = (args.from || 'EUR').toUpperCase();
            const target = (args.to || 'TRY').toUpperCase();
            // For now, use approximate rates (can integrate real API later)
            const rates = {
                EUR: { TRY: 37.5, GBP: 0.84, USD: 1.08 },
                GBP: { TRY: 44.5, EUR: 1.19, USD: 1.29 },
                USD: { TRY: 34.7, EUR: 0.93, GBP: 0.78 },
                TRY: { EUR: 0.027, GBP: 0.022, USD: 0.029 },
            };
            const rate = (_a = rates[base]) === null || _a === void 0 ? void 0 : _a[target];
            if (!rate) {
                return {
                    success: false,
                    error: `Cannot find rate for ${base} to ${target}`,
                };
            }
            return {
                success: true,
                from: base,
                to: target,
                rate: rate,
                formatted: `1 ${base} = ${rate.toFixed(4)} ${target}`,
                note: 'Approximate rate. Check bank for exact rates.',
            };
        }
        catch (err) {
            logger.error('[InfoTools] Exchange rate failed', err);
            return { success: false, error: (0, errors_1.getErrorMessage)(err) };
        }
    },
    /**
     * Show directions to a place (Google Maps deeplink)
     */
    showDirections: async (args) => {
        logger.info('[InfoTools] Getting directions', args);
        let mapsUrl;
        if (args.lat && args.lng) {
            mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${args.lat},${args.lng}`;
        }
        else {
            mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(args.destination)}`;
        }
        return {
            success: true,
            destination: args.destination,
            mapsUrl,
            message: `📍 **Directions to ${args.destination}**\n\n[Open in Google Maps](${mapsUrl})`,
        };
    },
};
//# sourceMappingURL=info.tools.js.map