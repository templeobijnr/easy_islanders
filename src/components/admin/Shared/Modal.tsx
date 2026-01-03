/**
 * Modal - Reusable modal component for admin
 * 
 * Scope: Admin-specific. Can be moved to shared if needed elsewhere.
 */
import React, { useEffect } from "react";
import { MODAL_SIZES, MODAL_MAX_HEIGHT_VH } from "../ControlTower/constants/modalConstants";
import ModalHeader from "./ModalHeader";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: keyof typeof MODAL_SIZES;
}

export function Modal({ isOpen, onClose, title, children, size = "lg" }: ModalProps) {
    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={handleBackdropClick}
        >
            <div
                className={`bg-white rounded-2xl shadow-2xl w-full ${MODAL_SIZES[size]} overflow-hidden`}
                style={{ maxHeight: `${MODAL_MAX_HEIGHT_VH}vh` }}
            >
                <ModalHeader title={title} onClose={onClose} />
                <div
                    className="overflow-y-auto"
                    style={{ maxHeight: `calc(${MODAL_MAX_HEIGHT_VH}vh - 60px)` }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}

export default Modal;
