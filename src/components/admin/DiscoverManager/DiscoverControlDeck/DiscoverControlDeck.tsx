/**
 * DiscoverControlDeck - Composer
 *
 * Split Plan:
 * - Extracted types: types.ts
 * - Extracted hooks: useDiscoverControlDeck.ts
 * - Extracted components: RegionSection, TabSection
 * - Behavior preserved: yes (no UI change)
 */
import React from "react";
import { Compass, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { useDiscoverControlDeck } from "./hooks/useDiscoverControlDeck";
import { RegionSection, TabSection } from "./components";

const DiscoverControlDeck: React.FC = () => {
    const vm = useDiscoverControlDeck();

    if (vm.isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="animate-spin text-slate-400" size={32} />
            </div>
        );
    }

    if (!vm.config) {
        return (
            <div className="flex items-center justify-center h-96 text-slate-400">
                Failed to load configuration
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-xl">
                        <Compass className="text-indigo-600" size={22} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Discover Settings</h2>
                        <p className="text-sm text-slate-500">Control what appears in the Discover page</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={vm.handleClearCache}
                        disabled={vm.isSaving}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <RefreshCw size={16} /> Clear Cache
                    </button>
                    <button
                        onClick={vm.handleReset}
                        disabled={vm.isSaving}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <RotateCcw size={16} /> Reset
                    </button>
                </div>
            </div>

            {/* Saving Indicator */}
            {vm.isSaving && (
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                    <Loader2 size={14} className="animate-spin" /> Saving changes...
                </div>
            )}

            {/* Two Column Layout */}
            <div className="grid grid-cols-2 gap-6">
                {/* Regions */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <RegionSection
                        regions={vm.config.regions}
                        expandedRegions={vm.expandedRegions}
                        isSaving={vm.isSaving}
                        onToggleRegion={vm.handleRegionToggle}
                        onToggleSubRegion={vm.handleSubRegionToggle}
                        onToggleExpand={vm.toggleRegionExpansion}
                    />
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <TabSection
                        tabs={vm.config.tabs}
                        expandedTabs={vm.expandedTabs}
                        isSaving={vm.isSaving}
                        onToggleTab={vm.handleTabToggle}
                        onToggleCategory={vm.handleCategoryToggle}
                        onToggleExpand={vm.toggleTabExpansion}
                    />
                </div>
            </div>
        </div>
    );
};

export default DiscoverControlDeck;
