/**
 * Merve per-listing action model (for listings collection).
 *
 * Source of truth is `merve.actions[]` on a listing; any other fields (like
 * `merve.actionTypesEnabled`) are derived convenience indexes.
 */

export type ActionType =
    | 'order_food'
    | 'reserve_table'
    | 'book_service'
    | 'request_service'
    | 'book_activity'
    | 'book_stay'
    | 'register_event'
    | 'inquire';

export type IngestKind = 'menuItems' | 'services' | 'offerings' | 'tickets' | 'roomTypes';

export interface MerveAction {
    id: string;
    actionType: ActionType;
    enabled: boolean;
    dispatch: {
        channel: 'whatsapp';
        toE164?: string;
        template?: string;
    };
    data?: {
        kind?: IngestKind;
        required?: boolean;
    };
    tags?: string[];
    notes?: string;
}

export interface MerveIntegration {
    enabled: boolean;
    whatsappE164?: string;
    geo?: { lat: number; lng: number };
    coverageAreas?: string[];
    actions: MerveAction[];
    actionTypesEnabled?: ActionType[];
    tags?: string[];

    // Legacy fields (read-only compatibility)
    toolType?: 'restaurant' | 'provider' | 'activity' | 'stay';
    dispatchTemplate?: string;
}

export type ListingDoc = {
    id: string;
    title?: string;
    name?: string;
    address?: string;
    lat?: number;
    lng?: number;
    cityId?: string;
    category?: string;
    tags?: string[];
    merve?: MerveIntegration | any;
    approved?: boolean;
};

