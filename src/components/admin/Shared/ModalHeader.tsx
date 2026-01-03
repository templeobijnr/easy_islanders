/**
 * ModalHeader - Consistent modal header with title and close button
 */
import React from "react";
import { X } from "lucide-react";
import { MODAL_HEADER_HEIGHT } from "../ControlTower/constants/modalConstants";

interface ModalHeaderProps {
    title: string;
    onClose: () => void;
}

export function ModalHeader({ title, onClose }: ModalHeaderProps) {
    return (
        <div
            className="px-6 flex items-center justify-between border-b border-slate-200"
            style={{ height: MODAL_HEADER_HEIGHT }}
        >
            <h3 className="font-semibold text-lg text-slate-900">{title}</h3>
            <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Close modal"
            >
                <X size={20} className="text-slate-500" />
            </button>
        </div>
    );
}

export default ModalHeader;
