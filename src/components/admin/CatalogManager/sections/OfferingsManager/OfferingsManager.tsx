/**
 * OfferingsManager - Main Composer
 *
 * Manages listing data subcollections for Merve actions.
 * Thin composer using useOfferingsManager hook.
 */
import React from "react";
import { Plus, X, Loader2, Upload, FileText, Package } from "lucide-react";
import ProposalReviewModal from "../ProposalReviewModal";
import ImportModal from "../ImportModal";
import ItemForm, { CURRENCY_OPTIONS } from "../ItemForm";
import ItemsList from "../ItemsList";
import { useOfferingsManager } from "./hooks/useOfferingsManager";
import { getKindLabel, getItemLabel } from "./constants";
import type { OfferingsManagerProps, IngestKind } from "./types";

const OfferingsManager: React.FC<OfferingsManagerProps> = ({
    listingId,
    listingTitle,
    marketId,
    kinds,
    variant = "standalone",
    actionLabel,
}) => {
    const vm = useOfferingsManager({ listingId, listingTitle, marketId, kinds });

    const kindLabel = getKindLabel(vm.selectedKind);
    const itemLabel = getItemLabel(vm.selectedKind);
    const getCurrencySymbol = (code: string) =>
        CURRENCY_OPTIONS.find((c) => c.value === code)?.symbol || code;

    if (vm.loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
            </div>
        );
    }

    // =========================================================================
    // INLINE VARIANT - Compact UI for embedding in action panels
    // =========================================================================
    if (variant === "inline") {
        return (
            <div className="space-y-2">
                {/* Compact header */}
                <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                        {vm.items.length} {vm.items.length === 1 ? itemLabel : kindLabel}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => vm.setShowImportModal(true)}
                            className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center gap-1"
                        >
                            <Upload size={12} /> Import
                        </button>
                        <button
                            type="button"
                            onClick={() => vm.setShowAddForm(true)}
                            className="text-xs px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1"
                        >
                            <Plus size={12} /> Add
                        </button>
                    </div>
                </div>

                {/* Extraction Status Banner */}
                {vm.extractionStatus !== "idle" && (
                    <div
                        className={`flex items-center gap-2 p-2 rounded-lg text-xs ${vm.extractionStatus === "processing"
                                ? "bg-amber-900/30 border border-amber-500/30 text-amber-300"
                                : vm.extractionStatus === "complete"
                                    ? "bg-emerald-900/30 border border-emerald-500/30 text-emerald-300"
                                    : "bg-red-900/30 border border-red-500/30 text-red-300"
                            }`}
                    >
                        {vm.extractionStatus === "processing" && (
                            <Loader2 size={12} className="animate-spin" />
                        )}
                        {vm.extractionStatus === "complete" && <span>✅</span>}
                        {vm.extractionStatus === "error" && <span>❌</span>}
                        <span>{vm.extractionMessage}</span>
                        {vm.extractionStatus !== "processing" && (
                            <button
                                type="button"
                                onClick={() => vm.setExtractionStatus("idle")}
                                className="ml-auto text-slate-400 hover:text-white"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                )}

                {/* Items list - compact */}
                {!vm.showAddForm && (
                    <ItemsList
                        items={vm.items}
                        onEdit={vm.handleEdit}
                        onDelete={vm.handleDelete}
                        variant="compact"
                        emptyMessage={`No ${kindLabel.toLowerCase()} yet. Add or import.`}
                    />
                )}

                {/* Inline add form */}
                {vm.showAddForm && (
                    <ItemForm
                        formData={vm.formData}
                        onFormChange={vm.setFormData}
                        onSave={vm.handleSave}
                        onCancel={vm.resetForm}
                        saving={vm.saving}
                        editingId={vm.editingId}
                        itemLabel={itemLabel}
                        categories={vm.categories}
                        variant="compact"
                    />
                )}

                {/* Import Modal */}
                {vm.showImportModal && (
                    <ImportModal
                        kindLabel={kindLabel}
                        variant="compact"
                        onImport={async (mode, urlOrFile) => {
                            const result =
                                mode === "url"
                                    ? await vm.createIngestJobFromUrl(urlOrFile as string)
                                    : await vm.createIngestJobFromFile(urlOrFile as File);
                            const jobId = (result as any)?.jobId as string | undefined;
                            vm.setShowImportModal(false);
                            if (jobId) await vm.pollJobUntilDone(jobId);
                            return jobId || null;
                        }}
                        onClose={() => vm.setShowImportModal(false)}
                    />
                )}

                {/* Proposal Review Modal */}
                {vm.showProposalModal && vm.proposal && (
                    <ProposalReviewModal
                        proposal={vm.proposal}
                        onClose={() => vm.setShowProposalModal(false)}
                        onApply={async () => {
                            await vm.applyProposal(vm.proposal!.id);
                            await vm.loadItems();
                            vm.setShowProposalModal(false);
                            vm.setExtractionStatus("idle");
                        }}
                        onReject={async () => {
                            await vm.rejectProposal(vm.proposal!.id);
                            vm.setShowProposalModal(false);
                            vm.setExtractionStatus("idle");
                        }}
                    />
                )}
            </div>
        );
    }

    // =========================================================================
    // STANDALONE VARIANT - Full UI with tabs and proposal review
    // =========================================================================
    return (
        <>
            <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Package className="text-emerald-500" size={20} />
                            {kindLabel}
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">
                            {vm.items.length} items for "{listingTitle}"
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {kinds.length > 1 && (
                            <select
                                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                                value={vm.selectedKind}
                                onChange={(e) => vm.setSelectedKind(e.target.value as IngestKind)}
                            >
                                {kinds.map((k) => (
                                    <option key={k} value={k}>
                                        {k}
                                    </option>
                                ))}
                            </select>
                        )}
                        <button
                            onClick={() => vm.setShowImportModal(true)}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                            title="Import from URL or file"
                        >
                            <Upload size={16} /> Import
                        </button>
                        {!vm.showAddForm && (
                            <button
                                onClick={() => vm.setShowAddForm(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                            >
                                <Plus size={18} /> Add {itemLabel}
                            </button>
                        )}
                    </div>
                </div>

                <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <FileText size={16} className="text-slate-400" />
                            <div className="text-sm text-slate-300">
                                Extraction proposal
                                {vm.proposalLoading ? " (loading...)" : vm.proposal ? "" : " (none)"}
                            </div>
                        </div>
                        {vm.proposal && (
                            <button
                                onClick={() => vm.setShowProposalModal(true)}
                                className="text-xs px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg"
                            >
                                Review ({vm.proposal.extractedItems?.length || 0} items)
                            </button>
                        )}
                    </div>
                </div>

                {/* Add/Edit Form */}
                {vm.showAddForm && (
                    <ItemForm
                        formData={vm.formData}
                        onFormChange={vm.setFormData}
                        onSave={vm.handleSave}
                        onCancel={vm.resetForm}
                        saving={vm.saving}
                        editingId={vm.editingId}
                        itemLabel={itemLabel}
                        categories={vm.categories}
                    />
                )}

                {/* Items List */}
                <ItemsList
                    items={vm.items}
                    onEdit={vm.handleEdit}
                    onDelete={vm.handleDelete}
                    emptyMessage={`No ${kindLabel.toLowerCase()} yet. Add or import.`}
                />
            </div>

            {/* Modals */}
            {vm.showImportModal && (
                <ImportModal
                    kindLabel={kindLabel}
                    onImport={async (mode, urlOrFile) => {
                        const result =
                            mode === "url"
                                ? await vm.createIngestJobFromUrl(urlOrFile as string)
                                : await vm.createIngestJobFromFile(urlOrFile as File);
                        const jobId = (result as any)?.jobId as string | undefined;
                        vm.setShowImportModal(false);
                        if (jobId) await vm.pollJobUntilDone(jobId);
                        return jobId || null;
                    }}
                    onClose={() => vm.setShowImportModal(false)}
                />
            )}

            {vm.showProposalModal && vm.proposal && (
                <ProposalReviewModal
                    proposal={vm.proposal}
                    onClose={() => vm.setShowProposalModal(false)}
                    onApply={async () => {
                        await vm.applyProposal(vm.proposal!.id);
                        await vm.loadItems();
                        vm.setShowProposalModal(false);
                        vm.setExtractionStatus("idle");
                    }}
                    onReject={async () => {
                        await vm.rejectProposal(vm.proposal!.id);
                        vm.setShowProposalModal(false);
                        vm.setExtractionStatus("idle");
                    }}
                />
            )}
        </>
    );
};

export default OfferingsManager;
