/**
 * MerveIntegrationSection - Composer
 *
 * Split Plan:
 * - Extracted types: types.ts
 * - Extracted constants: constants.ts
 * - Extracted hooks: useMerveConfig.ts
 * - Extracted components: ActionRow
 * - Behavior preserved: yes (no UI change)
 */
import React, { useState } from "react";
import { Bot, ChevronDown, ChevronUp, Plus, Settings } from "lucide-react";
import { useMerveConfig } from "./hooks/useMerveConfig";
import { ActionRow } from "./components";
import OfferingsManager from "../OfferingsManager";
import type { MerveIntegrationSectionProps, MerveActionType } from "./types";
import { ACTION_METADATA } from "./constants";

const MerveIntegrationSection: React.FC<MerveIntegrationSectionProps> = (props) => {
    const vm = useMerveConfig(props);
    const [isExpanded, setIsExpanded] = useState(true);
    const [showOfferingsManager, setShowOfferingsManager] = useState(false);

    const enabledCount = vm.config.actions.filter((a) => a.enabled).length;

    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
            {/* Header */}
            <div
                className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${vm.config.enabled ? "bg-emerald-50" : "bg-slate-50 hover:bg-slate-100"}`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <button
                    onClick={(e) => { e.stopPropagation(); vm.handleToggleEnabled(); }}
                    className={`w-12 h-7 rounded-full transition-all relative ${vm.config.enabled ? "bg-emerald-500" : "bg-slate-300"}`}
                >
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${vm.config.enabled ? "left-6" : "left-1"}`} />
                </button>

                <Bot className={vm.config.enabled ? "text-emerald-600" : "text-slate-400"} size={22} />

                <div className="flex-1">
                    <div className="font-semibold text-slate-900">Merve AI Agent</div>
                    <div className="text-xs text-slate-500">
                        {vm.config.enabled ? `${enabledCount} action${enabledCount !== 1 ? "s" : ""} enabled` : "Not configured"}
                    </div>
                </div>

                {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
            </div>

            {/* Content */}
            {isExpanded && vm.config.enabled && (
                <div className="p-4 border-t border-slate-100 space-y-4">
                    {/* Available Actions */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-slate-700">Actions</h4>
                            {props.listingId && (
                                <button onClick={() => setShowOfferingsManager(true)} className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700">
                                    <Settings size={14} /> Manage Offerings
                                </button>
                            )}
                        </div>

                        <div className="space-y-2">
                            {vm.availableActions.map((actionType: MerveActionType) => (
                                <ActionRow
                                    key={actionType}
                                    actionType={actionType}
                                    action={vm.getAction(actionType)}
                                    isEnabled={vm.isActionEnabled(actionType)}
                                    onToggle={() => vm.handleActionToggle(actionType)}
                                    onTemplateChange={(t) => vm.handleActionTemplateChange(actionType, t)}
                                    onWhatsAppChange={(n) => vm.handleActionWhatsAppChange(actionType, n)}
                                    onDataKindChange={(k) => vm.handleActionDataKindChange(actionType, k)}
                                    onDataRequiredChange={(r) => vm.handleActionDataRequiredChange(actionType, r)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Inactive Actions Hint */}
                    {enabledCount === 0 && (
                        <div className="text-center py-4 text-slate-400 text-sm">
                            Enable at least one action for Merve to handle
                        </div>
                    )}
                </div>
            )}

            {/* Offerings Manager Modal */}
            {showOfferingsManager && props.listingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="font-semibold text-lg">Manage Offerings</h3>
                            <button onClick={() => setShowOfferingsManager(false)} className="p-2 hover:bg-slate-100 rounded-lg">&times;</button>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-[calc(90vh-60px)]">
                            <OfferingsManager listingId={props.listingId} marketId={props.marketId} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MerveIntegrationSection;
