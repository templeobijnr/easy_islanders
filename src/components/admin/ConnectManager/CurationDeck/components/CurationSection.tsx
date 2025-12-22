/**
 * CurationSection - Section container with items
 */
import React from "react";
import { Loader2 } from "lucide-react";
import CurationItemCard from "./CurationItemCard";
import type { CuratedItem, SectionConfig } from "../types";

interface CurationSectionProps {
    section: SectionConfig;
    items: CuratedItem[];
    isLoading: boolean;
    onRemoveItem: (id: string) => void;
    onToggleActive: (id: string, current: boolean) => void;
}

const CurationSection: React.FC<CurationSectionProps> = ({ section, items, isLoading, onRemoveItem, onToggleActive }) => {
    const Icon = section.icon;
    const colorMap: Record<string, string> = {
        green: "bg-green-100 text-green-600",
        red: "bg-red-100 text-red-600",
        orange: "bg-orange-100 text-orange-600",
        blue: "bg-blue-100 text-blue-600",
        yellow: "bg-yellow-100 text-yellow-600",
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-slate-400" size={28} />
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-lg ${colorMap[section.color] || "bg-slate-100 text-slate-600"}`}>
                    <Icon size={18} />
                </div>
                <h3 className="font-semibold text-slate-900">{section.label}</h3>
                <span className="text-xs text-slate-400">({items.length} items)</span>
            </div>

            {items.length === 0 ? (
                <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                    No items in this section
                </div>
            ) : (
                <div className="space-y-2">
                    {items.map((item) => (
                        <CurationItemCard
                            key={item.id}
                            item={item}
                            onRemove={() => onRemoveItem(item.id)}
                            onToggleActive={() => onToggleActive(item.id, item.isActive)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default CurationSection;
