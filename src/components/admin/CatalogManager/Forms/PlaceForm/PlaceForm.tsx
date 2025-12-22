/**
 * PlaceForm - Main composer
 *
 * Thin component that assembles extracted subcomponents.
 * State management and handlers delegated to hooks.
 */
import React, { useState, useEffect } from 'react';
import { Loader2, Save } from 'lucide-react';
import ImageUploader from '../../../Shared/ImageUploader';
import OfferingsManager from '../../sections/OfferingsManager';
import MerveIntegrationSection from '../../sections/MerveIntegrationSection';
import { getAllRegions } from '@/services/discoverConfigService';
import { usePlaceFormHandlers } from './hooks/usePlaceFormHandlers';
import { submitPlace } from './utils/submitPlace';
import { DEFAULT_FORM_STATE } from './constants';
import {
    PlaceDetailsSection,
    ContactSection,
    PricingSection,
    LocationSection,
    MapPinActionsSection,
    BookingOptionsSection,
} from './components';
import type { PlaceFormProps, PlaceFormState, ImportSuggestion } from './types';
import type { RegionConfig, NormalizationResult } from '@/types/adminConfig';

const PlaceForm: React.FC<PlaceFormProps> = ({
    initialValue,
    onSave,
    onCancel,
}) => {
    // Form state
    const [form, setForm] = useState<PlaceFormState>(DEFAULT_FORM_STATE as PlaceFormState);

    // UI state
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [showBookingOptions, setShowBookingOptions] = useState(false);

    // Dynamic regions from config
    const [regions, setRegions] = useState<RegionConfig[]>([]);
    const [regionsLoading, setRegionsLoading] = useState(true);

    // Location normalization state
    const [normalizationResult, setNormalizationResult] = useState<NormalizationResult | null>(null);

    // Google import state
    const [importSearchQuery, setImportSearchQuery] = useState('');
    const [importSuggestions, setImportSuggestions] = useState<ImportSuggestion[]>([]);
    const [isImporting, setIsImporting] = useState(false);

    // Handlers
    const handlers = usePlaceFormHandlers({
        form,
        setForm,
        setNormalizationResult,
        setImportSuggestions,
        setIsImporting,
        setImportSearchQuery,
    });

    // Load regions from config on mount
    useEffect(() => {
        const loadRegions = async () => {
            try {
                const allRegions = await getAllRegions();
                setRegions(allRegions);
                if (!form.region && allRegions.length > 0) {
                    setForm((prev) => ({ ...prev, region: allRegions[0].label }));
                }
            } catch (err) {
                console.error('Failed to load regions:', err);
            } finally {
                setRegionsLoading(false);
            }
        };
        loadRegions();
    }, []);

    // Initialize form from initialValue (editing mode)
    useEffect(() => {
        if (initialValue) {
            const actions = (initialValue as any).actions || {};
            setForm({
                category: initialValue.category,
                subcategory: initialValue.subcategory || '',
                title: initialValue.title,
                description: initialValue.description,
                address: initialValue.address,
                lat: initialValue.lat,
                lng: initialValue.lng,
                region: initialValue.region,
                subregion: (initialValue as any).subregion || '',
                cityId: initialValue.cityId,
                phone: initialValue.phone || '',
                email: initialValue.email || '',
                website: initialValue.website || '',
                images: initialValue.images,
                rating: initialValue.rating || 0,
                priceLevel: initialValue.priceLevel || 0,
                displayPrice: initialValue.displayPrice || '',
                openingHours: initialValue.openingHours || [],
                googlePlaceId: initialValue.googlePlaceId || '',
                showOnMap: (initialValue as any).showOnMap ?? true,
                bookingEnabled: initialValue.bookingEnabled,
                allowCheckIn: actions.allowCheckIn ?? true,
                allowJoin: actions.allowJoin ?? false,
                allowWave: actions.allowWave ?? true,
                allowTaxi: actions.allowTaxi ?? true,
                allowNavigate: actions.allowNavigate ?? true,
                merveConfig: {
                    enabled: (initialValue as any).merve?.enabled || false,
                    actions: (initialValue as any).merve?.actions || [],
                    whatsappE164: (initialValue as any).merve?.whatsappE164 || '',
                    coverageAreas: (initialValue as any).merve?.coverageAreas || [],
                    tags: (initialValue as any).merve?.tags || [],
                    geo: (initialValue as any).merve?.geo,
                },
            });
        }
    }, [initialValue]);

    const handleSubmit = async () => {
        setLoading(true);
        setError('');

        const result = await submitPlace(form, initialValue);

        if (result.error) {
            setError(result.error);
            setLoading(false);
            return;
        }

        setSuccess(true);
        setLoading(false);
        setTimeout(() => {
            onSave(form as any);
        }, 1000);
    };

    // Merve data kinds for offerings manager
    const merveDataKinds = form.merveConfig.enabled
        ? Array.from(
            new Set(
                (form.merveConfig.actions || [])
                    .filter((a) => a.enabled && a.data?.kind)
                    .map((a) => a.data!.kind!)
            )
        )
        : [];

    return (
        <div className="space-y-6">
            {/* Success/Error Messages */}
            {success && (
                <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 text-green-400 flex items-center gap-2">
                    ✅ Place saved successfully!
                </div>
            )}
            {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-400">
                    ❌ {error}
                </div>
            )}

            {/* Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                    <PlaceDetailsSection
                        form={form}
                        setForm={setForm}
                        regions={regions}
                        regionsLoading={regionsLoading}
                        normalizationResult={normalizationResult}
                        setNormalizationResult={setNormalizationResult}
                        importSearchQuery={importSearchQuery}
                        importSuggestions={importSuggestions}
                        isImporting={isImporting}
                        onImportSearch={handlers.handleImportSearch}
                        onImportPlace={handlers.handleImportPlace}
                        onBrowseCategory={handlers.handleBrowseCategory}
                    />

                    <ContactSection form={form} setForm={setForm} />

                    <PricingSection form={form} setForm={setForm} />

                    {/* Images */}
                    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6">
                        <h3 className="text-white font-bold text-lg mb-4">🖼️ Images</h3>
                        <ImageUploader
                            images={form.images}
                            onImagesChange={(imgs) =>
                                setForm((prev) => ({ ...prev, images: imgs }))
                            }
                            storagePath="catalog/places"
                        />
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    <LocationSection
                        form={form}
                        setForm={setForm}
                        onLocationChange={handlers.handleLocationChange}
                    />

                    {/* Opening Hours */}
                    {form.openingHours.length > 0 && (
                        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-2">
                            <h3 className="text-white font-bold text-lg">🕐 Opening Hours</h3>
                            {form.openingHours.map((line, i) => (
                                <p key={i} className="text-sm text-slate-400">
                                    {line}
                                </p>
                            ))}
                        </div>
                    )}

                    <MapPinActionsSection form={form} setForm={setForm} />

                    <BookingOptionsSection
                        form={form}
                        setForm={setForm}
                        showBookingOptions={showBookingOptions}
                        setShowBookingOptions={setShowBookingOptions}
                    />

                    {/* Merve Tool Integration */}
                    <div className="mt-6">
                        <MerveIntegrationSection
                            placeType="restaurant"
                            value={form.merveConfig}
                            onChange={(config) =>
                                setForm((prev) => ({ ...prev, merveConfig: config }))
                            }
                            lat={form.lat}
                            lng={form.lng}
                            listingId={initialValue?.id}
                            marketId={form.cityId}
                        />

                        {/* Data Manager */}
                        {form.merveConfig.enabled && merveDataKinds.length > 0 && (
                            initialValue?.id ? (
                                <div className="border-t border-emerald-500/20 pt-6 mt-6">
                                    <OfferingsManager
                                        listingId={initialValue.id}
                                        listingTitle={form.title}
                                        marketId={form.cityId}
                                        kinds={merveDataKinds as any}
                                    />
                                </div>
                            ) : (
                                <div className="border-t border-emerald-500/20 pt-6 mt-6">
                                    <div className="bg-slate-900/60 border border-amber-500/30 rounded-xl p-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">💾</span>
                                            <div>
                                                <p className="text-amber-400 font-medium">
                                                    Save listing to add menu items
                                                </p>
                                                <p className="text-slate-400 text-sm mt-1">
                                                    Click "Create Place" below first, then you can import
                                                    menu items, prices, and services.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* Submit Buttons */}
                <button
                    onClick={handleSubmit}
                    disabled={loading || !form.title}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-4 rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                    {initialValue ? 'Update Place' : 'Create Place'}
                </button>

                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
};

export default PlaceForm;
