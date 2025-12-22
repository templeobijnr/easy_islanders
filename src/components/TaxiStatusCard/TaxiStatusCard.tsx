/**
 * TaxiStatusCard - Composer
 *
 * Split Plan:
 * - Extracted types: types.ts
 * - Extracted hooks: useTaxiStatus.ts (subscription logic)
 * - Extracted utils: utils.ts
 * - Extracted components: TaxiStatusCardView.tsx (pure UI)
 * - Behavior preserved: yes (no UI change)
 */
import React from "react";
import { Loader2, Car } from "lucide-react";
import { useTaxiStatus } from "./hooks/useTaxiStatus";
import { TaxiStatusCardView } from "./components";
import type { TaxiStatusCardProps } from "./types";

const TaxiStatusCard: React.FC<TaxiStatusCardProps> = (props) => {
    const { request, isLoading, error } = useTaxiStatus(props);

    if (isLoading) {
        return (
            <div className="rounded-2xl p-6 bg-slate-50 border border-slate-200 flex items-center justify-center">
                <Loader2 className="animate-spin text-slate-400" size={24} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-2xl p-4 bg-red-50 border border-red-200 text-center text-red-600 text-sm">
                {error}
            </div>
        );
    }

    if (!request) {
        return (
            <div className="rounded-2xl p-6 bg-slate-50 border border-slate-200 text-center">
                <Car className="mx-auto mb-2 text-slate-300" size={32} />
                <p className="text-slate-500 text-sm">No active taxi requests</p>
            </div>
        );
    }

    return <TaxiStatusCardView request={request} />;
};

export default TaxiStatusCard;
