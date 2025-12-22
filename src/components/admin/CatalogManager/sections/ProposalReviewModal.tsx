/**
 * Proposal Review Modal - Shows extracted items for review before publishing
 * 
 * Extracted from OfferingsManager to reduce component size and enable reuse.
 */

import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

export interface ExtractedItem {
    id?: string;
    name: string;
    description?: string | null;
    price?: number | null;
    currency?: string | null;
    category?: string | null;
}

export interface ProposalData {
    id: string;
    extractedItems?: ExtractedItem[];
    warnings?: string[];
}

interface ProposalReviewModalProps {
    proposal: ProposalData;
    onClose: () => void;
    onApply: () => Promise<void>;
    onReject: () => Promise<void>;
}

const ProposalReviewModal: React.FC<ProposalReviewModalProps> = ({
    proposal,
    onClose,
    onApply,
    onReject,
}) => {
    const [applying, setApplying] = useState(false);
    const [rejecting, setRejecting] = useState(false);

    const handleApply = async () => {
        setApplying(true);
        try {
            await onApply();
        } catch (e: unknown) {
            alert(e?.message || 'Failed to publish');
        } finally {
            setApplying(false);
        }
    };

    const handleReject = async () => {
        if (!confirm('Reject this extraction? Items will not be added.')) return;
        setRejecting(true);
        try {
            await onReject();
        } catch (e: unknown) {
            alert(e?.message || 'Failed to reject');
        } finally {
            setRejecting(false);
        }
    };

    const items = proposal.extractedItems || [];
    const itemCount = items.length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            ✨ Extracted Items Ready for Review
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">
                            {itemCount} item(s) extracted
                            {proposal.warnings?.length ? ` • ${proposal.warnings.length} warning(s)` : ''}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white"
                        disabled={applying || rejecting}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Warnings Banner */}
                {proposal.warnings && proposal.warnings.length > 0 && (
                    <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg p-3 mb-4">
                        <div className="text-sm text-amber-300">
                            ⚠️ {proposal.warnings.join(' • ')}
                        </div>
                    </div>
                )}

                {/* Items Preview - Scrollable */}
                <div className="flex-1 overflow-y-auto mb-4 border border-slate-800 rounded-xl">
                    <div className="bg-slate-950 px-3 py-2 text-xs text-slate-400 border-b border-slate-800 sticky top-0">
                        Preview (first 50 items)
                    </div>
                    <div className="p-3 space-y-2">
                        {items.slice(0, 50).map((it, idx) => (
                            <div
                                key={`proposal-item-${idx}-${it.id || it.name}`}
                                className="flex items-center justify-between gap-3 p-2 bg-slate-900/50 rounded-lg border border-slate-800"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-white truncate">{it.name}</div>
                                    {it.description && (
                                        <div className="text-xs text-slate-500 truncate">{it.description}</div>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    {it.category && (
                                        <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">
                                            {it.category}
                                        </span>
                                    )}
                                    {it.price != null && it.price > 0 && (
                                        <span className="text-sm text-emerald-400 font-medium">
                                            {it.currency || '₺'} {it.price}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                        {itemCount > 50 && (
                            <div className="text-center text-xs text-slate-500 py-2">
                                ... and {itemCount - 50} more items
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
                    <button
                        onClick={handleApply}
                        disabled={applying || rejecting}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
                    >
                        {applying ? (
                            <Loader2 className="animate-spin" size={18} />
                        ) : (
                            <>✅ Publish All ({itemCount} items)</>
                        )}
                    </button>
                    <button
                        onClick={handleReject}
                        disabled={applying || rejecting}
                        className="px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl transition-colors"
                    >
                        {rejecting ? (
                            <Loader2 className="animate-spin" size={18} />
                        ) : (
                            <>❌ Reject</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProposalReviewModal;
