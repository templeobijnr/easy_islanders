/**
 * LocationValidator
 * Ensures referential integrity between listings and location config
 */

import { getDiscoverConfig } from '../services/discoverConfigService';
import { RegionConfig, SubRegionConfig } from '../types/adminConfig';

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    regionExists: boolean;
    subRegionExists: boolean;
    regionVisible: boolean;
    subRegionVisible: boolean;
}

/**
 * Validate that a locationId exists in the current config
 */
export const validateLocationId = async (
    regionId: string,
    subRegionId?: string
): Promise<ValidationResult> => {
    const config = await getDiscoverConfig();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Find region
    const region = config.regions.find(r => r.id === regionId);
    const regionExists = !!region;
    const regionVisible = region?.isVisible ?? false;

    if (!regionExists) {
        errors.push(`Region "${regionId}" not found in configuration`);
    } else if (!regionVisible) {
        warnings.push(`Region "${region.label}" is currently hidden from users`);
    }

    // Find sub-region if specified
    let subRegionExists = false;
    let subRegionVisible = false;

    if (subRegionId && region) {
        const subRegion = region.subRegions.find(s => s.id === subRegionId);
        subRegionExists = !!subRegion;
        subRegionVisible = subRegion?.isVisible ?? false;

        if (!subRegionExists) {
            errors.push(`Sub-region "${subRegionId}" not found in region "${region.label}"`);
        } else if (!subRegionVisible) {
            warnings.push(`Sub-region "${subRegion?.label}" is currently hidden from users`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        regionExists,
        subRegionExists: subRegionId ? subRegionExists : true,
        regionVisible,
        subRegionVisible: subRegionId ? subRegionVisible : true,
    };
};

/**
 * Get region by ID
 */
export const getRegionById = async (regionId: string): Promise<RegionConfig | null> => {
    const config = await getDiscoverConfig();
    return config.regions.find(r => r.id === regionId) || null;
};

/**
 * Get sub-region by ID
 */
export const getSubRegionById = async (
    regionId: string,
    subRegionId: string
): Promise<SubRegionConfig | null> => {
    const region = await getRegionById(regionId);
    if (!region) return null;
    return region.subRegions.find(s => s.id === subRegionId) || null;
};

/**
 * Build location label from IDs
 */
export const buildLocationLabel = async (
    regionId: string,
    subRegionId?: string
): Promise<string> => {
    const region = await getRegionById(regionId);
    if (!region) return 'Unknown Location';

    if (subRegionId) {
        const subRegion = region.subRegions.find(s => s.id === subRegionId);
        if (subRegion) {
            return `${subRegion.label}, ${region.label}`;
        }
    }

    return region.label;
};

/**
 * Build a composite locationId from region and sub-region
 */
export const buildLocationId = (regionId: string, subRegionId?: string): string => {
    if (subRegionId) {
        return `${regionId}-${subRegionId}`;
    }
    return regionId;
};

/**
 * Parse a composite locationId into region and sub-region
 */
export const parseLocationId = (locationId: string): { regionId: string; subRegionId?: string } => {
    const parts = locationId.split('-');
    if (parts.length >= 2) {
        return {
            regionId: parts[0],
            subRegionId: parts.slice(1).join('-'),
        };
    }
    return { regionId: locationId };
};

export const LocationValidator = {
    validate: validateLocationId,
    getRegionById,
    getSubRegionById,
    buildLocationLabel,
    buildLocationId,
    parseLocationId,
};

export default LocationValidator;
