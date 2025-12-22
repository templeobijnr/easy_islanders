/**
 * TaxiStatusCardView - Pure presentational component
 */
import React from "react";
import { MapPin, Phone, Car, Clock, User } from "lucide-react";
import type { TaxiRequest } from "../types";
import { getStatusDisplay, formatTimeAgo } from "../utils";

interface TaxiStatusCardViewProps {
    request: TaxiRequest;
}

const TaxiStatusCardView: React.FC<TaxiStatusCardViewProps> = ({ request }) => {
    const status = getStatusDisplay(request.status);

    return (
        <div className={`rounded-2xl p-4 border ${status.bgColor} border-slate-200 shadow-sm`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">{status.icon}</span>
                    <span className={`font-semibold ${status.color}`}>{status.text}</span>
                </div>
                <span className="text-xs text-slate-400">
                    <Clock size={12} className="inline mr-1" />
                    {formatTimeAgo(request.createdAt)}
                </span>
            </div>

            {/* Pickup & Dropoff */}
            <div className="space-y-3 mb-4">
                <div className="flex items-start gap-2">
                    <div className="mt-1"><MapPin size={16} className="text-green-500" /></div>
                    <div>
                        <div className="text-xs text-slate-500">Pickup</div>
                        <div className="text-sm font-medium text-slate-900">{request.pickup.address}</div>
                    </div>
                </div>
                <div className="flex items-start gap-2">
                    <div className="mt-1"><MapPin size={16} className="text-red-500" /></div>
                    <div>
                        <div className="text-xs text-slate-500">Dropoff</div>
                        <div className="text-sm font-medium text-slate-900">{request.dropoff.address}</div>
                    </div>
                </div>
            </div>

            {/* Driver Info (when assigned) */}
            {request.driverName && (
                <div className="pt-4 border-t border-slate-200/50 space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                            <User size={20} className="text-slate-500" />
                        </div>
                        <div className="flex-1">
                            <div className="font-medium text-slate-900">{request.driverName}</div>
                            {request.vehicleType && <div className="text-xs text-slate-500">{request.vehicleType}</div>}
                        </div>
                        {request.rating && (
                            <div className="text-sm font-medium text-amber-500">⭐ {request.rating.toFixed(1)}</div>
                        )}
                    </div>

                    {request.driverPhone && (
                        <a href={`tel:${request.driverPhone}`} className="flex items-center gap-2 w-full py-2 px-3 bg-green-500 text-white rounded-xl text-sm font-medium justify-center hover:bg-green-600 transition-colors">
                            <Phone size={16} /> Call Driver
                        </a>
                    )}
                </div>
            )}

            {/* Progress Indicator */}
            {(request.status === "pending" || request.status === "en_route") && (
                <div className="mt-4 flex gap-1">
                    {["pending", "assigned", "en_route", "completed"].map((step, i) => {
                        const currentIndex = ["pending", "assigned", "en_route", "completed"].indexOf(request.status);
                        const stepIndex = i;
                        const isActive = stepIndex <= currentIndex;
                        return (
                            <div key={step} className={`flex-1 h-1 rounded-full transition-colors ${isActive ? "bg-green-500" : "bg-slate-200"}`} />
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TaxiStatusCardView;
