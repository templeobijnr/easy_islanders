/**
 * AddCurationModal Types
 */

export interface AddCurationModalProps {
    isOpen: boolean;
    onClose: () => void;
    activeSection: string;
    onSuccess: () => void;
}

export interface EventCategory {
    id: string;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
}

export interface ActionConfig {
    id: string;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    color: string;
    description?: string;
}

export interface SectionConfig {
    id: string;
    label: string;
}
