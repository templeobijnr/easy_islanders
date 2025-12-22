import { getErrorMessage } from '../../utils/errors';
/**
 * Consumer Tools: Information & Discovery
 * 
 * Read-only tools for pharmacies, news, exchange rates, events.
 */

import * as logger from 'firebase-functions/logger';
import { pharmacyRepository, newsRepository } from '../../repositories/admin-catalog.repository';

interface ToolResult {
    success: boolean;
    error?: string;
    [key: string]: unknown;
}

export const infoTools = {
    /**
     * Find on-duty pharmacies for today
     */
    findPharmacy: async (args: { district?: string }): Promise<ToolResult> => {
        logger.info('[InfoTools] Finding pharmacies', args);

        try {
            const data = await pharmacyRepository.getTodaysPharmacies(args.district);

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
        } catch (err: unknown) {
            logger.error('[InfoTools] Pharmacy lookup failed', err);
            return { success: false, error: getErrorMessage(err) };
        }
    },

    /**
     * Get latest news
     */
    getNews: async (): Promise<ToolResult> => {
        logger.info('[InfoTools] Getting news');

        try {
            const data = await newsRepository.getLatest();

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
        } catch (err: unknown) {
            logger.error('[InfoTools] News fetch failed', err);
            return { success: false, error: getErrorMessage(err) };
        }
    },

    /**
     * Get exchange rates
     */
    getExchangeRate: async (args: { from?: string; to?: string }): Promise<ToolResult> => {
        logger.info('[InfoTools] Getting exchange rates', args);

        try {
            // Use a free API (exchangerate-api.com or similar)
            const base = (args.from || 'EUR').toUpperCase();
            const target = (args.to || 'TRY').toUpperCase();

            // For now, use approximate rates (can integrate real API later)
            const rates: Record<string, Record<string, number>> = {
                EUR: { TRY: 37.5, GBP: 0.84, USD: 1.08 },
                GBP: { TRY: 44.5, EUR: 1.19, USD: 1.29 },
                USD: { TRY: 34.7, EUR: 0.93, GBP: 0.78 },
                TRY: { EUR: 0.027, GBP: 0.022, USD: 0.029 },
            };

            const rate = rates[base]?.[target];

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
        } catch (err: unknown) {
            logger.error('[InfoTools] Exchange rate failed', err);
            return { success: false, error: getErrorMessage(err) };
        }
    },

    /**
     * Show directions to a place (Google Maps deeplink)
     */
    showDirections: async (args: {
        destination: string;
        lat?: number;
        lng?: number;
    }): Promise<ToolResult> => {
        logger.info('[InfoTools] Getting directions', args);

        let mapsUrl: string;

        if (args.lat && args.lng) {
            mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${args.lat},${args.lng}`;
        } else {
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
