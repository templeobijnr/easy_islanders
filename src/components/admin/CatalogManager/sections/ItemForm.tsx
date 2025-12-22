/**
 * Item Form - Form for adding/editing catalog items (menu items, services, etc.)
 * 
 * Extracted from OfferingsManager to reduce component size.
 * Supports both compact (inline) and full (standalone) variants.
 */

import React from 'react';
import { X, Save, Loader2, DollarSign } from 'lucide-react';

/** Currency options for pricing */
export const CURRENCY_OPTIONS = [
    { value: 'TRY', symbol: '₺', label: 'TRY (₺)' },
    { value: 'USD', symbol: '$', label: 'USD ($)' },
    { value: 'EUR', symbol: '€', label: 'EUR (€)' },
    { value: 'GBP', symbol: '£', label: 'GBP (£)' },
];

export interface ItemFormData {
    name: string;
    description: string;
    price: number;
    currency: string;
    category: string;
    available: boolean;
}

export const DEFAULT_FORM_DATA: ItemFormData = {
    name: '',
    description: '',
    price: 0,
    currency: 'TRY',
    category: '',
    available: true,
};

interface ItemFormProps {
    /** Form data */
    formData: ItemFormData;
    /** Callback to update form data */
    onFormChange: (data: ItemFormData) => void;
    /** Callback when save button is clicked */
    onSave: () => void;
    /** Callback when cancel/close button is clicked */
    onCancel: () => void;
    /** Whether currently saving */
    saving?: boolean;
    /** ID of item being edited (null for new items) */
    editingId?: string | null;
    /** Label for the item type (e.g., "Menu Item", "Service") */
    itemLabel?: string;
    /** Available categories for selection */
    categories?: string[];
    /** Variant: compact (inline) or full (standalone) */
    variant?: 'compact' | 'full';
}

const ItemForm: React.FC<ItemFormProps> = ({
    formData,
    onFormChange,
    onSave,
    onCancel,
    saving = false,
    editingId = null,
    itemLabel = 'Item',
    categories = [],
    variant = 'full',
}) => {
    const isCompact = variant === 'compact';
    const isEditing = !!editingId;

    const handleChange = <K extends keyof ItemFormData>(key: K, value: ItemFormData[K]) => {
        onFormChange({ ...formData, [key]: value });
    };

    // Compact variant - inline form
    if (isCompact) {
        return (
            <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{isEditing ? 'Edit' : 'New'} {itemLabel}</span>
                    <button type="button" onClick={onCancel} className="text-slate-400 hover:text-white">
                        <X size={12} />
                    </button>
                </div>
                <input
                    type="text"
                    placeholder={`${itemLabel} name`}
                    value={formData.name}
                    onChange={e => handleChange('name', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500"
                />
                <div className="flex gap-2">
                    <input
                        type="number"
                        placeholder="Price"
                        value={formData.price || ''}
                        onChange={e => handleChange('price', parseFloat(e.target.value) || 0)}
                        className="flex-1 bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500"
                    />
                    <select
                        value={formData.currency}
                        onChange={e => handleChange('currency', e.target.value)}
                        className="w-16 bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-1 py-1 focus:outline-none focus:border-emerald-500"
                    >
                        {CURRENCY_OPTIONS.map(c => (
                            <option key={c.value} value={c.value}>{c.symbol}</option>
                        ))}
                    </select>
                </div>
                <button
                    type="button"
                    onClick={onSave}
                    disabled={saving || !formData.name.trim()}
                    className="w-full flex items-center justify-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg"
                >
                    {saving ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />}
                    {isEditing ? 'Update' : 'Save'}
                </button>
            </div>
        );
    }

    // Full variant - standalone form
    return (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-white font-medium">
                    {isEditing ? `Edit ${itemLabel}` : `New ${itemLabel}`}
                </h4>
                <button onClick={onCancel} className="text-slate-400 hover:text-white">
                    <X size={16} />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="block text-sm text-slate-400 mb-1">Name *</label>
                    <input
                        type="text"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
                        placeholder="Name"
                        value={formData.name}
                        onChange={e => handleChange('name', e.target.value)}
                    />
                </div>

                <div className="col-span-2">
                    <label className="block text-sm text-slate-400 mb-1">Description</label>
                    <input
                        type="text"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
                        placeholder="Short description..."
                        value={formData.description}
                        onChange={e => handleChange('description', e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm text-slate-400 mb-1">Price</label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 text-slate-500" size={16} />
                        <input
                            type="number"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
                            value={formData.price}
                            onChange={e => handleChange('price', Number(e.target.value))}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-slate-400 mb-1">Currency</label>
                    <select
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
                        value={formData.currency}
                        onChange={e => handleChange('currency', e.target.value)}
                    >
                        {CURRENCY_OPTIONS.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>

                <div className="col-span-2">
                    <label className="block text-sm text-slate-400 mb-1">Category</label>
                    <select
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
                        value={formData.category}
                        onChange={e => handleChange('category', e.target.value)}
                    >
                        <option value="">Uncategorized</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                <div className="col-span-2 flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={formData.available}
                        onChange={e => handleChange('available', e.target.checked)}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500"
                    />
                    <span className="text-sm text-slate-300">Available</span>
                </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
                <button
                    onClick={onSave}
                    disabled={saving || !formData.name.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    Save
                </button>
                <button
                    onClick={onCancel}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default ItemForm;
