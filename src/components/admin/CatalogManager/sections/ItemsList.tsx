/**
 * Items List - Displays catalog items with edit/delete actions
 * 
 * Extracted from OfferingsManager to reduce component size.
 * Supports both compact (inline) and full (standalone) variants.
 */

import React from 'react';
import { Edit2, Trash2, Package, DollarSign } from 'lucide-react';
import { CURRENCY_OPTIONS } from './ItemForm';

export interface ListingDataItem {
    id: string;
    name: string;
    description?: string;
    price: number;
    currency: string;
    imageUrl?: string;
    category?: string;
    available: boolean;
    sortOrder?: number;
}

interface ItemsListProps {
    /** Items to display */
    items: ListingDataItem[];
    /** Grouped items by category (for full variant) */
    grouped?: Record<string, ListingDataItem[]>;
    /** Called when edit button clicked */
    onEdit: (item: ListingDataItem) => void;
    /** Called when delete button clicked */
    onDelete: (id: string) => void;
    /** Get currency symbol helper */
    getCurrencySymbol?: (code: string) => string;
    /** Variant: compact (inline) or full (standalone) */
    variant?: 'compact' | 'full';
    /** Empty state message */
    emptyMessage?: string;
}

/** Helper to get currency symbol */
const defaultGetCurrencySymbol = (code: string): string => {
    return CURRENCY_OPTIONS.find(c => c.value === code)?.symbol || code;
};

const ItemsList: React.FC<ItemsListProps> = ({
    items,
    grouped = {},
    onEdit,
    onDelete,
    getCurrencySymbol = defaultGetCurrencySymbol,
    variant = 'full',
    emptyMessage = 'No items yet.',
}) => {
    const isCompact = variant === 'compact';

    // Empty state
    if (items.length === 0) {
        return (
            <div className={`text-center text-slate-500 ${isCompact ? 'py-3 text-xs' : 'py-8'}`}>
                {emptyMessage}
            </div>
        );
    }

    // Compact variant - simple flat list
    if (isCompact) {
        return (
            <div className="space-y-1 max-h-40 overflow-y-auto">
                {items.map(item => (
                    <div
                        key={item.id}
                        className="flex items-center justify-between p-2 bg-slate-900/50 border border-slate-800 rounded-lg group"
                    >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            {item.imageUrl ? (
                                <img src={item.imageUrl} alt="" className="w-8 h-8 rounded object-cover" />
                            ) : (
                                <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center">
                                    <Package size={14} className="text-slate-600" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="text-sm text-white truncate">{item.name}</div>
                                {item.price > 0 && (
                                    <div className="text-xs text-emerald-400">
                                        {getCurrencySymbol(item.currency)}{item.price}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                type="button"
                                onClick={() => onEdit(item)}
                                className="p-1 text-slate-400 hover:text-white"
                            >
                                <Edit2 size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={() => onDelete(item.id)}
                                className="p-1 text-slate-400 hover:text-red-400"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Full variant - grouped by category
    return (
        <div className="space-y-4">
            {(Object.entries(grouped) as [string, ListingDataItem[]][]).map(([category, entries]) => (
                <div key={category} className="space-y-2">
                    <div className="text-sm text-slate-400">{category}</div>
                    {entries.map(item => (
                        <div
                            key={item.id}
                            className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between"
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-white font-medium">{item.name}</h4>
                                    {!item.available && (
                                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
                                            Unavailable
                                        </span>
                                    )}
                                </div>
                                {item.description && (
                                    <p className="text-sm text-slate-400 mt-1">{item.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <DollarSign size={14} />
                                        {getCurrencySymbol(item.currency)} {item.price}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onEdit(item)}
                                    className="p-2 text-slate-400 hover:text-emerald-400 transition-colors"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => onDelete(item.id)}
                                    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default ItemsList;
