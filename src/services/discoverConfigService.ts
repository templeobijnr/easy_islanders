/**
 * Discover Config Service
 * Handles CRUD operations for Discover and Homepage configurations
 * Includes caching with 5-minute TTL for performance
 */

import { logger } from "@/utils/logger";
import { db } from "./firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import {
  DiscoverConfig,
  HomepageConfig,
  RegionConfig,
  TabConfig,
  DEFAULT_DISCOVER_CONFIG,
  DEFAULT_HOMEPAGE_CONFIG,
} from "../types/adminConfig";

const CONFIG_COLLECTION = "appConfig";
const DISCOVER_DOC_ID = "discover";
const HOMEPAGE_DOC_ID = "homepage";

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache: {
  discover: CacheEntry<DiscoverConfig> | null;
  homepage: CacheEntry<HomepageConfig> | null;
} = {
  discover: null,
  homepage: null,
};

const isCacheValid = <T>(entry: CacheEntry<T> | null): boolean => {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
};

export const clearLocationsCache = (): void => {
  cache.discover = null;
  cache.homepage = null;
  logger.debug("[DiscoverConfigService] Cache cleared");
};

// ============================================================================
// DISCOVER CONFIG
// ============================================================================

export const getDiscoverConfig = async (
  forceRefresh = false,
): Promise<DiscoverConfig> => {
  // Check cache first
  if (!forceRefresh && isCacheValid(cache.discover)) {
    return cache.discover!.data;
  }

  try {
    const docRef = doc(db, CONFIG_COLLECTION, DISCOVER_DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();

      // Handle both old object format and new array format
      let regions: RegionConfig[];
      if (Array.isArray(data.regions)) {
        regions = data.regions;
      } else if (data.regions && typeof data.regions === "object") {
        // Convert old object format to array
        regions = Object.entries(data.regions).map(
          ([id, value]: [string, any]) => ({
            id,
            label: value.label || id,
            isVisible: value.visible ?? value.isVisible ?? true,
            geo: value.geo || { lat: 35.33, lng: 33.32, radiusKm: 15 },
            aliases: value.aliases || [],
            subRegions: value.subRegions
              ? Array.isArray(value.subRegions)
                ? value.subRegions
                : Object.entries(value.subRegions).map(
                    ([subId, subVal]: [string, any]) => ({
                      id: subId,
                      label: subVal.label || subId,
                      isVisible: subVal.visible ?? subVal.isVisible ?? true,
                      aliases: subVal.aliases || [],
                    }),
                  )
              : [],
          }),
        );
      } else {
        regions = DEFAULT_DISCOVER_CONFIG.regions;
      }

      // Handle both old object format and new array format for tabs
      let tabs: TabConfig[];
      if (Array.isArray(data.tabs)) {
        tabs = data.tabs;
      } else if (data.tabs && typeof data.tabs === "object") {
        tabs = Object.entries(data.tabs).map(([id, value]: [string, any]) => ({
          id,
          label: value.label || id,
          icon: value.icon || "",
          isVisible: value.visible ?? value.isVisible ?? true,
          categories: value.categories
            ? Array.isArray(value.categories)
              ? value.categories
              : Object.entries(value.categories).map(
                  ([catId, catVal]: [string, any]) => ({
                    id: catId,
                    label: catVal.label || catId,
                    icon: catVal.icon || catVal.emoji || "",
                    isVisible: catVal.visible ?? catVal.isVisible ?? true,
                  }),
                )
            : [],
        }));
      } else {
        tabs = DEFAULT_DISCOVER_CONFIG.tabs;
      }

      const config: DiscoverConfig = {
        regions,
        tabs,
        lastUpdated:
          data.lastUpdated instanceof Timestamp
            ? data.lastUpdated.toDate()
            : data.lastUpdated || null,
      };

      // Update cache
      cache.discover = { data: config, timestamp: Date.now() };
      return config;
    }

    // Document doesn't exist, create with defaults
    await setDoc(docRef, {
      ...DEFAULT_DISCOVER_CONFIG,
      lastUpdated: serverTimestamp(),
    });

    cache.discover = { data: DEFAULT_DISCOVER_CONFIG, timestamp: Date.now() };
    return DEFAULT_DISCOVER_CONFIG;
  } catch (error) {
    console.error(
      "[DiscoverConfigService] Error fetching discover config:",
      error,
    );
    return DEFAULT_DISCOVER_CONFIG;
  }
};

export const updateDiscoverConfig = async (
  config: Partial<DiscoverConfig>,
): Promise<void> => {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, DISCOVER_DOC_ID);
    await setDoc(
      docRef,
      {
        ...config,
        lastUpdated: serverTimestamp(),
      },
      { merge: true },
    );

    // Invalidate cache
    cache.discover = null;
  } catch (error) {
    console.error(
      "[DiscoverConfigService] Error updating discover config:",
      error,
    );
    throw error;
  }
};

/**
 * Resets the Discover config to defaults (writes all regions, sub-regions, tabs, and categories to Firestore)
 * Use this to sync the Firestore document with the latest DEFAULT_DISCOVER_CONFIG
 */
export const resetDiscoverConfig = async (): Promise<void> => {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, DISCOVER_DOC_ID);
    await setDoc(docRef, {
      ...DEFAULT_DISCOVER_CONFIG,
      lastUpdated: serverTimestamp(),
    });

    // Invalidate cache
    cache.discover = null;
    logger.debug("[DiscoverConfigService] Config reset to defaults");
  } catch (error) {
    console.error(
      "[DiscoverConfigService] Error resetting discover config:",
      error,
    );
    throw error;
  }
};

// ============================================================================
// REGION OPERATIONS
// ============================================================================

export const updateRegionVisibility = async (
  regionId: string,
  isVisible: boolean,
): Promise<void> => {
  const config = await getDiscoverConfig(true);
  const updatedRegions = config.regions.map((r) =>
    r.id === regionId ? { ...r, isVisible } : r,
  );
  await updateDiscoverConfig({ regions: updatedRegions });
};

export const updateSubRegionVisibility = async (
  regionId: string,
  subRegionId: string,
  isVisible: boolean,
): Promise<void> => {
  const config = await getDiscoverConfig(true);
  const updatedRegions = config.regions.map((region) => {
    if (region.id !== regionId) return region;
    return {
      ...region,
      subRegions: region.subRegions.map((sub) =>
        sub.id === subRegionId ? { ...sub, isVisible } : sub,
      ),
    };
  });
  await updateDiscoverConfig({ regions: updatedRegions });
};

// ============================================================================
// TAB & CATEGORY OPERATIONS
// ============================================================================

export const updateTabVisibility = async (
  tabId: string,
  isVisible: boolean,
): Promise<void> => {
  const config = await getDiscoverConfig(true);
  const updatedTabs = config.tabs.map((t) =>
    t.id === tabId ? { ...t, isVisible } : t,
  );
  await updateDiscoverConfig({ tabs: updatedTabs });
};

export const updateCategoryVisibility = async (
  tabId: string,
  categoryId: string,
  isVisible: boolean,
): Promise<void> => {
  const config = await getDiscoverConfig(true);
  const updatedTabs = config.tabs.map((tab) => {
    if (tab.id !== tabId) return tab;
    return {
      ...tab,
      categories: tab.categories.map((cat) =>
        cat.id === categoryId ? { ...cat, isVisible } : cat,
      ),
    };
  });
  await updateDiscoverConfig({ tabs: updatedTabs });
};

// ============================================================================
// HOMEPAGE CONFIG
// ============================================================================

export const getHomepageConfig = async (
  forceRefresh = false,
): Promise<HomepageConfig> => {
  // Check cache first
  if (!forceRefresh && isCacheValid(cache.homepage)) {
    return cache.homepage!.data;
  }

  try {
    const docRef = doc(db, CONFIG_COLLECTION, HOMEPAGE_DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const config: HomepageConfig = {
        featuredStays: data.featuredStays || [],
        curatedExperiences: data.curatedExperiences || [],
        heroSection: data.heroSection,
        lastUpdated:
          data.lastUpdated instanceof Timestamp
            ? data.lastUpdated.toDate()
            : data.lastUpdated || null,
      };

      cache.homepage = { data: config, timestamp: Date.now() };
      return config;
    }

    // Document doesn't exist, create with defaults
    await setDoc(docRef, {
      ...DEFAULT_HOMEPAGE_CONFIG,
      lastUpdated: serverTimestamp(),
    });

    cache.homepage = { data: DEFAULT_HOMEPAGE_CONFIG, timestamp: Date.now() };
    return DEFAULT_HOMEPAGE_CONFIG;
  } catch (error) {
    console.error(
      "[DiscoverConfigService] Error fetching homepage config:",
      error,
    );
    return DEFAULT_HOMEPAGE_CONFIG;
  }
};

export const updateHomepageConfig = async (
  config: Partial<HomepageConfig>,
): Promise<void> => {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, HOMEPAGE_DOC_ID);
    await setDoc(
      docRef,
      {
        ...config,
        lastUpdated: serverTimestamp(),
      },
      { merge: true },
    );

    cache.homepage = null;
  } catch (error) {
    console.error(
      "[DiscoverConfigService] Error updating homepage config:",
      error,
    );
    throw error;
  }
};

// ============================================================================
// HELPER: Get all regions for location selector
// ============================================================================

export const getAllRegions = async (): Promise<RegionConfig[]> => {
  const config = await getDiscoverConfig();
  return config.regions;
};

export const getVisibleRegions = async (): Promise<RegionConfig[]> => {
  const config = await getDiscoverConfig();
  return config.regions.filter((r) => r.isVisible);
};

export const getVisibleTabs = async (): Promise<TabConfig[]> => {
  const config = await getDiscoverConfig();
  return config.tabs.filter((t) => t.isVisible);
};
