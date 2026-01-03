/**
 * OfferingsModal - Modal wrapper for OfferingsManager
 */
import React from "react";
import { Modal } from "../../../../shared";
import OfferingsManager from "../../OfferingsManager";
import type { MerveActionType, IngestKind } from "../types";
import type { IngestKind as OfferingsIngestKind } from "../../OfferingsManager/types";
import { ACTION_METADATA } from "../constants";

interface OfferingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    listingId: string;
    marketId: string;
    listingTitle?: string;
    kinds: OfferingsIngestKind[];
    actionType?: MerveActionType;
}

export function OfferingsModal({
    isOpen,
    onClose,
    listingId,
    marketId,
    listingTitle = "",
    kinds,
    actionType,
}: OfferingsModalProps) {
    // Compute modal title based on action type
    const title = actionType
        ? `${ACTION_METADATA[actionType].label} - Data`
        : "Manage Offerings";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="xl">
            <div className="p-4 bg-slate-900">
                <OfferingsManager
                    listingId={listingId}
                    listingTitle={listingTitle}
                    marketId={marketId}
                    kinds={kinds}
                />
            </div>
        </Modal>
    );
}

export default OfferingsModal;
