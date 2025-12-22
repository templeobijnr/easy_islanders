/**
 * TaxiStatusCard - Types
 *
 * Split Plan:
 * - Extracted types: types.ts
 * - Extracted hooks: useTaxiStatus.ts (subscription logic)
 * - Extracted utils: formatTaxiStatus.ts
 * - Extracted components: TaxiStatusCardView.tsx (pure UI)
 * - Behavior preserved: yes (no UI change)
 */
export interface TaxiRequest {
    id: string;
    status: "pending" | "assigned" | "en_route" | "completed" | "cancelled";
    pickup: {
        address: string;
        location: { lat: number; lng: number; district: string };
    };
    dropoff: { address: string };
    assignedDriverId?: string;
    driverName?: string;
    driverPhone?: string;
    vehicleType?: string;
    rating?: number;
    createdAt: Date;
    assignedAt?: Date;
}

export interface TaxiStatusCardProps {
    userId: string;
    requestId?: string;
}

export type TaxiStatus = TaxiRequest["status"];
