/**
 * LocationNormalizer
 * Hybrid Spatial + Text matching engine for location normalization
 * 
 * Algorithm:
 * 1. Spatial Match (90% confidence): Within geo radius
 * 2. Text Exact Match (80% confidence): Address contains exact alias
 * 3. Text Fuzzy Match (60% confidence): Levenshtein distance < 3
 * 4. Fallback (0% confidence): No match found
 */

import {
    RegionConfig,
    SubRegionConfig,
    LocationMatch,
    NormalizationResult,
    NormalizationMethod,
} from '../types/adminConfig';
import { getDiscoverConfig } from '../services/discoverConfigService';

// ============================================================================
// GEO UTILITIES
// ============================================================================

/**
 * Calculate distance between two points using Haversine formula
 * @returns Distance in kilometers
 */
export const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number => {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const toRad = (deg: number): number => deg * (Math.PI / 180);

// ============================================================================
// TEXT UTILITIES
// ============================================================================

/**
 * Levenshtein distance for fuzzy matching
 */
export const levenshteinDistance = (a: string, b: string): number => {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[b.length][a.length];
};

/**
 * Normalize text for comparison
 */
const normalizeText = (text: string): string => {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ')        // Normalize whitespace
        .trim();
};

// ============================================================================
// MAIN NORMALIZER
// ============================================================================

export interface NormalizeInput {
    lat?: number;
    lng?: number;
    address?: string;
    addressComponents?: Array<{
        long_name: string;
        short_name: string;
        types: string[];
    }>;
}

/**
 * Main entry point for location normalization
 */
export const normalizeLocation = async (
    input: NormalizeInput
): Promise<NormalizationResult> => {
    const config = await getDiscoverConfig();
    const regions = config.regions;

    const matches: LocationMatch[] = [];

    // Step 1: Spatial matching (if coordinates provided)
    if (input.lat !== undefined && input.lng !== undefined) {
        const spatialMatches = findSpatialMatches(input.lat, input.lng, regions);
        matches.push(...spatialMatches);
    }

    // Step 2: Text matching (if address provided)
    if (input.address || input.addressComponents) {
        const textToMatch = buildSearchText(input);
        const textMatches = findTextMatches(textToMatch, regions);

        // Merge with spatial matches (avoid duplicates)
        for (const textMatch of textMatches) {
            const existing = matches.find(m =>
                m.regionId === textMatch.regionId &&
                m.subRegionId === textMatch.subRegionId
            );
            if (!existing || existing.confidence < textMatch.confidence) {
                if (existing) {
                    matches.splice(matches.indexOf(existing), 1);
                }
                matches.push(textMatch);
            }
        }
    }

    // Sort by confidence (highest first)
    matches.sort((a, b) => b.confidence - a.confidence);

    // Return result
    const bestMatch = matches.length > 0 && matches[0].confidence >= 50 ? matches[0] : null;

    return {
        match: bestMatch,
        alternatives: bestMatch ? matches.slice(1, 4) : matches.slice(0, 3),
        rawInput: {
            lat: input.lat,
            lng: input.lng,
            address: input.address,
        },
    };
};

// ============================================================================
// SPATIAL MATCHING
// ============================================================================

const findSpatialMatches = (
    lat: number,
    lng: number,
    regions: RegionConfig[]
): LocationMatch[] => {
    const matches: LocationMatch[] = [];

    for (const region of regions) {
        // Check sub-regions first (more specific)
        for (const subRegion of region.subRegions) {
            if (subRegion.geo) {
                const distance = calculateDistance(lat, lng, subRegion.geo.lat, subRegion.geo.lng);
                if (distance <= subRegion.geo.radiusKm) {
                    // Inside sub-region radius
                    const confidence = Math.round(90 - (distance / subRegion.geo.radiusKm) * 10);
                    matches.push({
                        regionId: region.id,
                        regionLabel: region.label,
                        subRegionId: subRegion.id,
                        subRegionLabel: subRegion.label,
                        confidence: Math.max(80, confidence),
                        method: 'spatial',
                        distance,
                    });
                }
            }
        }

        // Check region level
        const regionDistance = calculateDistance(lat, lng, region.geo.lat, region.geo.lng);
        if (regionDistance <= region.geo.radiusKm) {
            // Check if we already have a sub-region match
            const hasSubRegionMatch = matches.some(m => m.regionId === region.id && m.subRegionId);
            if (!hasSubRegionMatch) {
                const confidence = Math.round(85 - (regionDistance / region.geo.radiusKm) * 15);
                matches.push({
                    regionId: region.id,
                    regionLabel: region.label,
                    confidence: Math.max(70, confidence),
                    method: 'spatial',
                    distance: regionDistance,
                });
            }
        }
    }

    return matches;
};

// ============================================================================
// TEXT MATCHING
// ============================================================================

const buildSearchText = (input: NormalizeInput): string => {
    const parts: string[] = [];

    if (input.address) {
        parts.push(input.address);
    }

    if (input.addressComponents) {
        for (const comp of input.addressComponents) {
            parts.push(comp.long_name);
            if (comp.short_name !== comp.long_name) {
                parts.push(comp.short_name);
            }
        }
    }

    return normalizeText(parts.join(' '));
};

const findTextMatches = (
    searchText: string,
    regions: RegionConfig[]
): LocationMatch[] => {
    const matches: LocationMatch[] = [];

    for (const region of regions) {
        // Check region aliases
        const regionMatch = matchAliases(searchText, [region.label, ...region.aliases]);
        if (regionMatch) {
            matches.push({
                regionId: region.id,
                regionLabel: region.label,
                confidence: regionMatch.confidence,
                method: regionMatch.method,
            });
        }

        // Check sub-region aliases
        for (const subRegion of region.subRegions) {
            const subMatch = matchAliases(searchText, [subRegion.label, ...subRegion.aliases]);
            if (subMatch) {
                matches.push({
                    regionId: region.id,
                    regionLabel: region.label,
                    subRegionId: subRegion.id,
                    subRegionLabel: subRegion.label,
                    confidence: subMatch.confidence,
                    method: subMatch.method,
                });
            }
        }
    }

    return matches;
};

const matchAliases = (
    searchText: string,
    aliases: string[]
): { confidence: number; method: NormalizationMethod } | null => {
    const normalizedSearch = normalizeText(searchText);

    for (const alias of aliases) {
        const normalizedAlias = normalizeText(alias);

        // Exact match (word boundary)
        if (
            normalizedSearch.includes(normalizedAlias) ||
            normalizedSearch.split(' ').some(word => word === normalizedAlias)
        ) {
            return { confidence: 80, method: 'text_exact' };
        }

        // Fuzzy match
        const words = normalizedSearch.split(' ');
        for (const word of words) {
            if (word.length > 3 && normalizedAlias.length > 3) {
                const distance = levenshteinDistance(word, normalizedAlias);
                if (distance <= 2) {
                    return { confidence: 60, method: 'text_fuzzy' };
                }
            }
        }
    }

    return null;
};

// ============================================================================
// EXPORTS
// ============================================================================

export const LocationNormalizer = {
    normalize: normalizeLocation,
    calculateDistance,
    levenshteinDistance,
};

export default LocationNormalizer;
