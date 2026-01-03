/**
 * useOfferingsModal - Modal state management for offerings
 */
import { useState, useCallback } from "react";
import type { MerveActionType, IngestKind } from "../types";

interface OfferingsModalState {
    isOpen: boolean;
    actionType?: MerveActionType;
    dataKind?: IngestKind;
}

interface UseOfferingsModalReturn {
    isModalOpen: boolean;
    selectedActionType?: MerveActionType;
    selectedDataKind?: IngestKind;
    openModalForAction: (actionType: MerveActionType, dataKind: IngestKind) => void;
    openModalForAllOfferings: () => void;
    closeModal: () => void;
}

export function useOfferingsModal(): UseOfferingsModalReturn {
    const [state, setState] = useState<OfferingsModalState>({ isOpen: false });

    const openModalForAction = useCallback((actionType: MerveActionType, dataKind: IngestKind) => {
        setState({ isOpen: true, actionType, dataKind });
    }, []);

    const openModalForAllOfferings = useCallback(() => {
        setState({ isOpen: true, actionType: undefined, dataKind: undefined });
    }, []);

    const closeModal = useCallback(() => {
        setState({ isOpen: false, actionType: undefined, dataKind: undefined });
    }, []);

    return {
        isModalOpen: state.isOpen,
        selectedActionType: state.actionType,
        selectedDataKind: state.dataKind,
        openModalForAction,
        openModalForAllOfferings,
        closeModal,
    };
}

export default useOfferingsModal;
