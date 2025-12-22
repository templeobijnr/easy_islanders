import { Request, Response } from 'express';
import * as typesenseService from '../services/typesense.service';
import * as logger from 'firebase-functions/logger';
import { getErrorMessage } from '../utils/errors';

/**
 * Search listings using Typesense
 * POST /v1/search
 */
export async function searchListings(req: Request, res: Response) {
    try {
        const {
            query = '',
            domain,
            category,
            subCategory,
            minPrice,
            maxPrice,
            location,
            type,
            page = 1,
            perPage = 20
        } = req.body;

        logger.info('🔍 Search request:', { query, domain, category, location });

        const results = await typesenseService.searchListings({
            query,
            domain,
            category,
            subCategory,
            minPrice,
            maxPrice,
            location,
            type,
            page,
            perPage
        });

        res.json({
            success: true,
            data: results.hits,
            total: results.found,
            page: results.page
        });
    } catch (error: unknown) {
        logger.error('❌ Search error:', error);
        res.status(500).json({
            success: false,
            error: getErrorMessage(error) || 'Search failed'
        });
    }
}
