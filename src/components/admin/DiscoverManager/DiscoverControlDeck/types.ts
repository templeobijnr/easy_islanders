/**
 * DiscoverControlDeck - Types
 *
 * Split Plan:
 * - Extracted types: types.ts
 * - Extracted hooks: useDiscoverControlDeck.ts (config state + handlers)
 * - Extracted components: RegionSection, TabSection
 * - Behavior preserved: yes (no UI change)
 */
import type { DiscoverConfig, RegionConfig, TabConfig } from "../../../../types/adminConfig";

export interface DiscoverControlDeckProps {
    // Currently no props
}

export interface DiscoverState {
    config: DiscoverConfig | null;
    expandedRegions: Set<string>;
    expandedTabs: Set<string>;
    isLoading: boolean;
    isSaving: boolean;
}

export type { DiscoverConfig, RegionConfig, TabConfig };
