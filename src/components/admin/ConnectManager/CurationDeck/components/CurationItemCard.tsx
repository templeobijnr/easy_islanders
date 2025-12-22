/**
 * CurationItemCard - Single curated item display
 */
import React from "react";
import { Trash2, CheckCircle, Clock, MapPin, ExternalLink } from "lucide-react";
import type { CuratedItem } from "../types";

interface CurationItemCardProps {
    item: CuratedItem;
    onRemove: () => void;
    onToggleActive: () => void;
}

const CurationItemCard: React.FC<CurationItemCardProps> = ({ item, onRemove, onToggleActive }) => {
    return (
        <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${item.isActive ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-60"}`}>
            {/* Thumbnail */}
            {item.itemImage ? (
                <img src={item.itemImage} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
            ) : (
                <div className="w-14 h-14 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <MapPin size={20} className="text-slate-400" />
                </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 truncate">{item.itemTitle || item.eventTitle}</div>
                <div className="text-xs text-slate-500 truncate">{item.itemType} {item.region && `• ${item.region}`}</div>
                {item.expiresAt && (
                    <div className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                        <Clock size={12} /> Expires {item.expiresAt.toLocaleDateString()}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
                {/* External Links */}
                {item.ticketUrl && (
                    <a href={item.ticketUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-blue-500 hover:bg-blue-50 rounded">
                        <ExternalLink size={16} />
                    </a>
                )}

                {/* Toggle Active */}
                <button onClick={onToggleActive} className={`p-1.5 rounded transition-colors ${item.isActive ? "text-green-500 hover:bg-green-50" : "text-slate-400 hover:bg-slate-100"}`}>
                    <CheckCircle size={18} />
                </button>

                {/* Remove */}
                <button onClick={onRemove} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
};

export default CurationItemCard;
