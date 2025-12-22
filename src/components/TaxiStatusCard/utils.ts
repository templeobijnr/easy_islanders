/**
 * formatTaxiStatus - Pure utility functions for taxi status formatting
 */
import type { TaxiStatus } from "./types";

export interface StatusDisplay {
    icon: string;
    text: string;
    color: string;
    bgColor: string;
}

export function getStatusDisplay(status: TaxiStatus): StatusDisplay {
    switch (status) {
        case "pending":
            return { icon: "⏳", text: "Finding driver...", color: "text-amber-600", bgColor: "bg-amber-50" };
        case "assigned":
            return { icon: "✅", text: "Driver assigned", color: "text-blue-600", bgColor: "bg-blue-50" };
        case "en_route":
            return { icon: "🚗", text: "On the way", color: "text-green-600", bgColor: "bg-green-50" };
        case "completed":
            return { icon: "🎉", text: "Trip completed", color: "text-emerald-600", bgColor: "bg-emerald-50" };
        case "cancelled":
            return { icon: "❌", text: "Cancelled", color: "text-red-600", bgColor: "bg-red-50" };
        default:
            return { icon: "❓", text: "Unknown", color: "text-slate-600", bgColor: "bg-slate-50" };
    }
}

export function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}
