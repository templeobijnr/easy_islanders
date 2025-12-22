/**
 * RegionSection - Region visibility controls
 */
import React from "react";
import { MapPin, ChevronDown, ChevronRight, Check } from "lucide-react";
import type { RegionConfig } from "../types";

interface RegionSectionProps {
    regions: RegionConfig[];
    expandedRegions: Set<string>;
    isSaving: boolean;
    onToggleRegion: (id: string, visible: boolean) => void;
    onToggleSubRegion: (regionId: string, subId: string, visible: boolean) => void;
    onToggleExpand: (id: string) => void;
}

const RegionSection: React.FC<RegionSectionProps> = ({
    regions,
    expandedRegions,
    isSaving,
    onToggleRegion,
    onToggleSubRegion,
    onToggleExpand,
}) => {
    return (
        <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
                <MapPin size={16} /> Regions
            </h3>

            {regions.map((region) => {
                const isExpanded = expandedRegions.has(region.id);
                const hasSubRegions = region.subRegions && region.subRegions.length > 0;

                return (
                    <div key={region.id} className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="flex items-center gap-2 p-3 bg-slate-50">
                            {hasSubRegions && (
                                <button onClick={() => onToggleExpand(region.id)} className="p-1 hover:bg-slate-200 rounded">
                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </button>
                            )}
                            <button
                                onClick={() => onToggleRegion(region.id, region.visible)}
                                disabled={isSaving}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${region.visible ? "bg-emerald-500 border-emerald-500" : "border-slate-300"
                                    }`}
                            >
                                {region.visible && <Check size={14} className="text-white" />}
                            </button>
                            <span className="font-medium text-slate-900">{region.name || region.id}</span>
                        </div>

                        {isExpanded && hasSubRegions && (
                            <div className="p-3 space-y-2 border-t border-slate-100">
                                {region.subRegions!.map((sub) => (
                                    <div key={sub.id} className="flex items-center gap-2 pl-6">
                                        <button
                                            onClick={() => onToggleSubRegion(region.id, sub.id, sub.visible)}
                                            disabled={isSaving}
                                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${sub.visible ? "bg-emerald-500 border-emerald-500" : "border-slate-300"
                                                }`}
                                        >
                                            {sub.visible && <Check size={10} className="text-white" />}
                                        </button>
                                        <span className="text-sm text-slate-700">{sub.name || sub.id}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default RegionSection;
