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
exports.searchListings = searchListings;
const typesenseService = __importStar(require("../services/typesense.service"));
const logger = __importStar(require("firebase-functions/logger"));
const errors_1 = require("../utils/errors");
/**
 * Search listings using Typesense
 * POST /v1/search
 */
async function searchListings(req, res) {
    try {
        const { query = '', domain, category, subCategory, minPrice, maxPrice, location, type, page = 1, perPage = 20 } = req.body;
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
    }
    catch (error) {
        logger.error('❌ Search error:', error);
        res.status(500).json({
            success: false,
            error: (0, errors_1.getErrorMessage)(error) || 'Search failed'
        });
    }
}
//# sourceMappingURL=search.controller.js.map