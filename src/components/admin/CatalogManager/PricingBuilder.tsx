import React, { useState, useEffect } from 'react';
import { Plus, Trash2, HelpCircle, DollarSign, Clock, Users, Package } from 'lucide-react';
import { ActivityPricing, PricingModel, PricingOption } from '../../../types/catalog';

interface PricingBuilderProps {
    value?: ActivityPricing;
    onChange: (pricing: ActivityPricing) => void;
    currency: string;
}

const MODEL_OPTIONS: { value: PricingModel; label: string; icon: any; desc: string }[] = [
    { value: 'fixed', label: 'Fixed Price', icon: DollarSign, desc: 'One simple price for everyone.' },
    { value: 'per_person', label: 'Per Person', icon: Users, desc: 'Different prices for Adults, Children, etc.' },
    { value: 'duration', label: 'Duration Based', icon: Clock, desc: 'Charged by time (e.g. 30 mins, 1 hour).' },
    { value: 'per_unit', label: 'Per Unit / Game', icon: Package, desc: 'Charged per item (e.g. 100 Paintballs).' },
    { value: 'tiered', label: 'Tiered Packages', icon: HelpCircle, desc: 'Basic vs Pro packages.' },
];

const PricingBuilder: React.FC<PricingBuilderProps> = ({ value, onChange, currency }) => {
    // Initialize state with default or provided value
    const [model, setModel] = useState<PricingModel>(value?.model || 'fixed');
    const [basePrice, setBasePrice] = useState<string>(value?.basePrice?.toString() || '');
    const [options, setOptions] = useState<PricingOption[]>(value?.options || []);

    // Sync internal state when props change (e.g. loading a saved activity)
    useEffect(() => {
        if (value) {
            setModel(value.model);
            setBasePrice(value.basePrice?.toString() || '');
            setOptions(value.options || []);
        }
    }, [value]);

    // Notify parent of changes
    const updateParent = (newModel: PricingModel, newBase: string, newOptions: PricingOption[]) => {
        onChange({
            model: newModel,
            currency: currency,
            basePrice: newBase ? parseFloat(newBase) : undefined,
            options: newOptions
        });
    };

    const handleModelChange = (newModel: PricingModel) => {
        setModel(newModel);
        // Reset options if switching to fixed (optional, but cleaner)
        if (newModel === 'fixed') {
            setOptions([]);
        }
        updateParent(newModel, basePrice, newModel === 'fixed' ? [] : options);
    };

    const handleBasePriceChange = (val: string) => {
        setBasePrice(val);
        updateParent(model, val, options);
    };

    const addOption = () => {
        const newOption: PricingOption = {
            id: crypto.randomUUID(),
            label: '',
            price: 0,
            currency: currency,
            description: ''
        };
        const newOptions = [...options, newOption];
        setOptions(newOptions);
        updateParent(model, basePrice, newOptions);
    };

    const updateOption = (id: string, field: keyof PricingOption, val: any) => {
        const newOptions = options.map(opt =>
            opt.id === id ? { ...opt, [field]: val } : opt
        );
        setOptions(newOptions);
        updateParent(model, basePrice, newOptions);
    };

    const removeOption = (id: string) => {
        const newOptions = options.filter(opt => opt.id !== id);
        setOptions(newOptions);
        updateParent(model, basePrice, newOptions);
    };

    return (
        <div className="space-y-6">
            {/* Model Selection */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {MODEL_OPTIONS.map(opt => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleModelChange(opt.value)}
                        className={`p-3 rounded-xl border text-left transition-all ${model === opt.value
                                ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
                            }`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <opt.icon size={16} />
                            <span className="font-semibold text-sm">{opt.label}</span>
                        </div>
                        <p className="text-[10px] opacity-70">{opt.desc}</p>
                    </button>
                ))}
            </div>

            {/* Base Price (Optional for some models) */}
            {model !== 'fixed' && (
                <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5">
                    <label className="text-xs text-slate-400 mb-1 block">Base Fee (Optional Entry Fee)</label>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-sm">{currency}</span>
                        <input
                            type="number"
                            className="bg-transparent border-none focus:ring-0 text-white p-0 w-full"
                            placeholder="0.00"
                            value={basePrice}
                            onChange={e => handleBasePriceChange(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* Options Builder */}
            {model !== 'fixed' && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-slate-300">Pricing Options</h4>
                        <button
                            type="button"
                            onClick={addOption}
                            className="text-xs flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                        >
                            <Plus size={14} /> Add Option
                        </button>
                    </div>

                    {options.length === 0 && (
                        <div className="text-center p-6 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                            No options added yet. Click "Add Option" to configure prices.
                        </div>
                    )}

                    <div className="space-y-3">
                        {options.map((opt, index) => (
                            <div key={opt.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 relative group">
                                <button
                                    type="button"
                                    onClick={() => removeOption(opt.id)}
                                    className="absolute top-2 right-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={14} />
                                </button>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 uppercase tracking-wider">Label</label>
                                        <input
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                                            placeholder={model === 'duration' ? 'e.g. 1 Hour' : 'e.g. Adult'}
                                            value={opt.label}
                                            onChange={e => updateOption(opt.id, 'label', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 uppercase tracking-wider">Price ({currency})</label>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                                            placeholder="0.00"
                                            value={opt.price}
                                            onChange={e => updateOption(opt.id, 'price', parseFloat(e.target.value))}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {model === 'duration' && (
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-slate-500 uppercase tracking-wider">Duration (Mins)</label>
                                            <input
                                                type="number"
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                                                placeholder="60"
                                                value={opt.durationMinutes || ''}
                                                onChange={e => updateOption(opt.id, 'durationMinutes', parseFloat(e.target.value))}
                                            />
                                        </div>
                                    )}
                                    {(model === 'per_unit' || model === 'tiered') && (
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-slate-500 uppercase tracking-wider">Unit Label</label>
                                            <input
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                                                placeholder="e.g. balls, laps"
                                                value={opt.unit || ''}
                                                onChange={e => updateOption(opt.id, 'unit', e.target.value)}
                                            />
                                        </div>
                                    )}
                                    <div className="col-span-2 space-y-1">
                                        <label className="text-[10px] text-slate-500 uppercase tracking-wider">Description (Optional)</label>
                                        <input
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                                            placeholder="Details about this option..."
                                            value={opt.description || ''}
                                            onChange={e => updateOption(opt.id, 'description', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PricingBuilder;
