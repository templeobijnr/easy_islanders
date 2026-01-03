/**
 * ActionRow - Single action configuration row with inline data management
 */
import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, MessageCircle, ChevronRight, Database } from "lucide-react";
import type { MerveAction, MerveActionType, IngestKind } from "../types";
import { ACTION_METADATA, INGEST_KIND_OPTIONS, DEFAULT_TEMPLATES, ACTION_DATA_KINDS } from "../constants";
import OfferingsManager from "../../OfferingsManager";

interface ActionRowProps {
    actionType: MerveActionType;
    action?: MerveAction;
    isEnabled: boolean;
    onToggle: () => void;
    onTemplateChange: (template: string) => void;
    onWhatsAppChange: (toE164: string) => void;
    onDataKindChange: (kind: IngestKind | "") => void;
    onDataRequiredChange: (required: boolean) => void;
    /** Listing ID to enable inline data management */
    listingId?: string;
    /** Market ID for data operations */
    marketId?: string;
}

const ActionRow: React.FC<ActionRowProps> = ({
    actionType,
    action,
    isEnabled,
    onToggle,
    onTemplateChange,
    onWhatsAppChange,
    onDataKindChange,
    onDataRequiredChange,
    listingId,
    marketId,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const meta = ACTION_METADATA[actionType];

    // Track if we've already auto-set the data kind for this action
    const autoSetRef = useRef(false);

    // Auto-select data kind based on action type when first enabled
    // Use ref to prevent infinite loops and only trigger once per enable
    useEffect(() => {
        if (isEnabled && !action?.data?.kind && !autoSetRef.current) {
            const suggestedKind = ACTION_DATA_KINDS[actionType];
            if (suggestedKind) {
                autoSetRef.current = true;
                onDataKindChange(suggestedKind);
            }
        }
        // Reset ref when action is disabled
        if (!isEnabled) {
            autoSetRef.current = false;
        }
    }, [isEnabled, actionType, action?.data?.kind, onDataKindChange]);

    const selectedKind = action?.data?.kind || "";

    return (
        <div className={`border rounded-xl overflow-hidden transition-all ${isEnabled ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200"}`}>
            {/* Header */}
            <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50" onClick={onToggle}>
                <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isEnabled ? "bg-emerald-500 border-emerald-500" : "border-slate-300"}`}>
                    {isEnabled && <Check size={14} className="text-white" />}
                </button>
                <span className="text-xl">{meta.emoji}</span>
                <div className="flex-1">
                    <div className="font-medium text-slate-900">{meta.label}</div>
                    <div className="text-xs text-slate-500">{meta.desc}</div>
                </div>
                {isEnabled && (
                    <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="p-1 hover:bg-slate-100 rounded">
                        {isExpanded ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                    </button>
                )}
            </div>

            {/* Expanded Config */}
            {isEnabled && isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-4">
                    {/* WhatsApp Number */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">WhatsApp Number (optional override)</label>
                        <div className="relative">
                            <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="tel"
                                value={action?.dispatch?.toE164 || ""}
                                onChange={(e) => onWhatsAppChange(e.target.value)}
                                placeholder="+905XX..."
                                className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Data Kind Selection */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                            <Database size={12} /> Data Source
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <select
                                value={selectedKind}
                                onChange={(e) => onDataKindChange(e.target.value as IngestKind | "")}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                {INGEST_KIND_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" checked={action?.data?.required || false} onChange={(e) => onDataRequiredChange(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-emerald-500" />
                                <span className="text-sm text-slate-600">Required</span>
                            </label>
                        </div>
                    </div>

                    {/* Inline Data Management - Only show when data source is selected and listingId available */}
                    {selectedKind && listingId && (
                        <div className="bg-slate-900 rounded-xl p-4 -mx-1">
                            <OfferingsManager
                                listingId={listingId}
                                listingTitle=""
                                marketId={marketId || "nc"}
                                kinds={[selectedKind]}
                                variant="inline"
                                actionLabel={meta.label}
                            />
                        </div>
                    )}

                    {/* Help text when no listingId */}
                    {selectedKind && !listingId && (
                        <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg">
                            💡 Save this listing first to enable data import
                        </div>
                    )}

                    {/* Template */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Message Template</label>
                        <textarea
                            value={action?.dispatch?.template || DEFAULT_TEMPLATES[actionType] || ""}
                            onChange={(e) => onTemplateChange(e.target.value)}
                            rows={5}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActionRow;
