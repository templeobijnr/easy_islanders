/**
 * TabSection - Tab and category visibility controls
 */
import React from "react";
import { Layers, ChevronDown, ChevronRight, Check } from "lucide-react";
import type { TabConfig } from "../types";

interface TabSectionProps {
    tabs: TabConfig[];
    expandedTabs: Set<string>;
    isSaving: boolean;
    onToggleTab: (id: string, visible: boolean) => void;
    onToggleCategory: (tabId: string, catId: string, visible: boolean) => void;
    onToggleExpand: (id: string) => void;
}

const TabSection: React.FC<TabSectionProps> = ({
    tabs,
    expandedTabs,
    isSaving,
    onToggleTab,
    onToggleCategory,
    onToggleExpand,
}) => {
    return (
        <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
                <Layers size={16} /> Tabs & Categories
            </h3>

            {tabs.map((tab) => {
                const isExpanded = expandedTabs.has(tab.id);
                const hasCategories = tab.categories && tab.categories.length > 0;

                return (
                    <div key={tab.id} className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="flex items-center gap-2 p-3 bg-slate-50">
                            {hasCategories && (
                                <button onClick={() => onToggleExpand(tab.id)} className="p-1 hover:bg-slate-200 rounded">
                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </button>
                            )}
                            <button
                                onClick={() => onToggleTab(tab.id, tab.visible)}
                                disabled={isSaving}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${tab.visible ? "bg-blue-500 border-blue-500" : "border-slate-300"
                                    }`}
                            >
                                {tab.visible && <Check size={14} className="text-white" />}
                            </button>
                            <span className="font-medium text-slate-900">{tab.label || tab.id}</span>
                        </div>

                        {isExpanded && hasCategories && (
                            <div className="p-3 space-y-2 border-t border-slate-100">
                                {tab.categories!.map((cat) => (
                                    <div key={cat.id} className="flex items-center gap-2 pl-6">
                                        <button
                                            onClick={() => onToggleCategory(tab.id, cat.id, cat.visible)}
                                            disabled={isSaving}
                                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${cat.visible ? "bg-blue-500 border-blue-500" : "border-slate-300"
                                                }`}
                                        >
                                            {cat.visible && <Check size={10} className="text-white" />}
                                        </button>
                                        <span className="text-sm text-slate-700">{cat.label || cat.id}</span>
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

export default TabSection;
