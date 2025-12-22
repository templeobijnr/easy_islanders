/**
 * PlaceDetailsSection - Category, region, import, title, description
 */
import React from 'react';
import { Loader2, Search } from 'lucide-react';
import { PLACE_CATEGORIES } from '../constants';
import type { PlaceFormState, ImportSuggestion } from '../types';
import type { RegionConfig, NormalizationResult } from '@/types/adminConfig';

interface PlaceDetailsSectionProps {
    form: PlaceFormState;
    setForm: React.Dispatch<React.SetStateAction<PlaceFormState>>;
    regions: RegionConfig[];
    regionsLoading: boolean;
    normalizationResult: NormalizationResult | null;
    setNormalizationResult: (result: NormalizationResult | null) => void;
    importSearchQuery: string;
    importSuggestions: ImportSuggestion[];
    isImporting: boolean;
    onImportSearch: (query: string) => void;
    onImportPlace: (placeId: string) => void;
    onBrowseCategory: () => void;
}

const PlaceDetailsSection: React.FC<PlaceDetailsSectionProps> = ({
    form,
    setForm,
    regions,
    regionsLoading,
    normalizationResult,
    setNormalizationResult,
    importSearchQuery,
    importSuggestions,
    isImporting,
    onImportSearch,
    onImportPlace,
    onBrowseCategory,
}) => {
    const currentRegion = regions.find((r) => r.label === form.region);
    const subRegions = currentRegion?.subRegions || [];

    return (
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-4">
            <h3 className="text-white font-bold text-lg">📍 Place Details</h3>

            {/* Category & Region */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Category</label>
                    <select
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white"
                        value={form.category}
                        onChange={(e) =>
                            setForm((prev) => ({ ...prev, category: e.target.value }))
                        }
                    >
                        {PLACE_CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                                {cat.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm text-slate-400 mb-1">
                        Region
                        {normalizationResult?.match && (
                            <span
                                className={`ml-2 text-xs px-2 py-0.5 rounded ${normalizationResult.match.confidence >= 80
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-yellow-500/20 text-yellow-400'
                                    }`}
                            >
                                {normalizationResult.match.method === 'spatial' ? '🛰️' : '📝'}{' '}
                                {normalizationResult.match.confidence}%
                            </span>
                        )}
                    </label>
                    {regionsLoading ? (
                        <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-500">
                            Loading regions...
                        </div>
                    ) : (
                        <select
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white"
                            value={form.region}
                            onChange={(e) => {
                                setForm((prev) => ({
                                    ...prev,
                                    region: e.target.value,
                                    subregion: '',
                                }));
                                setNormalizationResult(null);
                            }}
                        >
                            {regions.map((r) => (
                                <option key={r.id} value={r.label}>
                                    {r.label}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* Sub-region */}
            {subRegions.length > 0 && (
                <div>
                    <label className="block text-sm text-slate-400 mb-1">
                        Sub-region / Area
                    </label>
                    <select
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white"
                        value={form.subregion}
                        onChange={(e) =>
                            setForm((prev) => ({
                                ...prev,
                                subregion: e.target.value,
                            }))
                        }
                    >
                        <option value="">All areas in {form.region}</option>
                        {subRegions.map((sub) => (
                            <option key={sub.id} value={sub.label}>
                                {sub.label}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* 1-Click Import Search */}
            <div className="space-y-2">
                <label className="block text-sm text-slate-400">
                    🔍 1-Click Import from Google
                </label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-10 focus:border-cyan-500 focus:outline-none text-white"
                            placeholder="Search businesses..."
                            value={importSearchQuery}
                            onChange={(e) => onImportSearch(e.target.value)}
                        />
                        <Search
                            className="absolute left-3 top-3.5 text-slate-500"
                            size={18}
                        />

                        {importSuggestions.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                {importSuggestions.map((s) => (
                                    <div
                                        key={s.id}
                                        className="px-4 py-3 hover:bg-slate-800 cursor-pointer"
                                        onClick={() => onImportPlace(s.id)}
                                    >
                                        <p className="text-white text-sm font-medium">{s.primary}</p>
                                        <p className="text-slate-400 text-xs">{s.secondary}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onBrowseCategory}
                        disabled={isImporting}
                        className="px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                        {isImporting ? (
                            <Loader2 className="animate-spin" size={18} />
                        ) : (
                            'Browse'
                        )}
                    </button>
                </div>
            </div>

            {/* Title & Description */}
            <input
                type="text"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white"
                placeholder="Business Name"
                value={form.title}
                onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                }
            />
            <textarea
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white h-24 resize-none"
                placeholder="Business description..."
                value={form.description}
                onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                }
            />

            {/* Subcategory */}
            <input
                type="text"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white"
                placeholder="Subcategory (e.g., Italian, Thai, Cocktails...)"
                value={form.subcategory}
                onChange={(e) =>
                    setForm((prev) => ({ ...prev, subcategory: e.target.value }))
                }
            />
        </div>
    );
};

export default PlaceDetailsSection;
