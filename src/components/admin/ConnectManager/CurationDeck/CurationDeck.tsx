/**
 * CurationDeck - Composer
 *
 * Split Plan:
 * - Extracted types: types.ts
 * - Extracted constants: constants.ts
 * - Extracted hooks: useCurationDeck.ts
 * - Extracted components: CurationItemCard, CurationSection
 * - Behavior preserved: yes (no UI change)
 */
import React from "react";
import { Plus, Zap, Loader2 } from "lucide-react";
import { useCurationDeck } from "./hooks/useCurationDeck";
import { CurationSection } from "./components";
import AddCurationModal from "../AddCurationModal";
import { SECTIONS } from "./constants";
import type { SectionId } from "./types";

const CurationDeck: React.FC = () => {
    const vm = useCurationDeck();

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-xl">
                        <Zap className="text-purple-600" size={22} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Connect Curation</h2>
                        <p className="text-sm text-slate-500">Manage what appears in Connect feed sections</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Seed Check-ins (for Live Pulse) */}
                    {vm.activeSection === "live" && (
                        <button onClick={vm.handleSeedCheckIns} className="px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                            Seed Check-ins
                        </button>
                    )}

                    {/* Add Item */}
                    <button onClick={() => vm.setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors">
                        <Plus size={18} /> Add Item
                    </button>
                </div>
            </div>

            {/* Section Tabs */}
            <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
                {SECTIONS.map((section) => {
                    const Icon = section.icon;
                    const isActive = vm.activeSection === section.id;
                    return (
                        <button
                            key={section.id}
                            onClick={() => vm.setActiveSection(section.id as SectionId)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                        >
                            <Icon size={16} /> {section.label}
                        </button>
                    );
                })}
            </div>

            {/* Active Section Content */}
            {vm.isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="animate-spin text-slate-400" size={32} />
                </div>
            ) : (
                <CurationSection
                    section={SECTIONS.find((s) => s.id === vm.activeSection)!}
                    items={vm.itemsBySection(vm.activeSection)}
                    isLoading={vm.isLoading}
                    onRemoveItem={vm.handleRemoveItem}
                    onToggleActive={vm.handleToggleActive}
                />
            )}

            {/* Add Modal */}
            {vm.showAddModal && (
                <AddCurationModal
                    onClose={() => vm.setShowAddModal(false)}
                    onComplete={vm.handleAddComplete}
                    defaultSection={vm.activeSection}
                />
            )}
        </div>
    );
};

export default CurationDeck;
