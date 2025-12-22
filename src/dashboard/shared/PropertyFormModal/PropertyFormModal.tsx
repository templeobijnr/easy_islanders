/**
 * PropertyFormModal - Main composer
 *
 * Thin component that assembles extracted tab components.
 */
import React, { useState, useEffect, useRef } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { X, ArrowLeft, Loader2, Layers, Ruler, MapPin, List, Image as ImageIcon, Sparkles, Zap } from 'lucide-react';
import { importPropertyFromUrl } from '../../services/integrations/gemini/gemini.client';
import { usePropertyLocation } from './hooks/usePropertyLocation';
import { DEFAULT_FORM_DATA } from './constants';
import {
    OverviewView,
    EssentialsTab,
    DetailsTab,
    LocationTab,
    AmenitiesTab,
    MediaTab,
} from './components';
import type { PropertyFormModalProps, PropertyFormData, FormTab } from './types';

const PropertyFormModal: React.FC<PropertyFormModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    isEditMode,
    initialView = 'overview',
}) => {
    const [viewMode, setViewMode] = useState<'overview' | 'edit'>(!isEditMode ? 'edit' : initialView);
    const [activeFormTab, setActiveFormTab] = useState<FormTab>('essentials');

    const [importUrl, setImportUrl] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const [form, setForm] = useState<PropertyFormData>((initialData as PropertyFormData) || DEFAULT_FORM_DATA);

    // Location hook
    const location = usePropertyLocation({
        form,
        setForm,
        isOpen,
        activeFormTab,
    });

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setViewMode(!isEditMode ? 'edit' : initialView);
            setForm((initialData as PropertyFormData) || DEFAULT_FORM_DATA);
        }
    }, [isOpen, initialData, initialView, isEditMode]);

    if (!isOpen) return null;

    const handleImport = async () => {
        if (!importUrl) return;
        setIsImporting(true);
        try {
            const data = await importPropertyFromUrl(importUrl);
            if (data) {
                setForm((prev) => ({
                    ...prev,
                    ...data,
                    images: [...(prev.images || []), ...((data as Partial<PropertyFormData>).images || [])],
                    imageUrl:
                        (data as Partial<PropertyFormData>).images?.length
                            ? (data as Partial<PropertyFormData>).images![0]
                            : prev.imageUrl || '',
                }));
                if (data.images?.length) {
                    setActiveFormTab('media');
                }
            } else {
                alert('Could not automatically extract details. Please verify the URL or enter details manually.');
            }
        } catch (error) {
            console.error('Import error:', error);
            alert('An error occurred during import. Please try again.');
        } finally {
            setIsImporting(false);
        }
    };

    const handleDownloadImage = async (e: React.MouseEvent, url: string) => {
        e.stopPropagation();
        try {
            const response = await fetch(url, { mode: 'cors' });
            if (!response.ok) throw new Error('Network response was not ok');
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = `property-image-${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(objectUrl);
        } catch (error) {
            window.open(url, '_blank');
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIsUploading(true);
            const files = Array.from<File>(e.target.files);
            setTimeout(() => {
                const newUrls = files.map((f) => URL.createObjectURL(f));
                setForm((prev) => ({
                    ...prev,
                    images: [...(prev.images || []), ...newUrls],
                    imageUrl: prev.imageUrl || newUrls[0],
                }));
                setIsUploading(false);
            }, 1000);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(form);
        setIsSaving(false);
    };

    const renderEditForm = () => (
        <div className="flex flex-col h-full">
            {/* Edit Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => setViewMode('overview')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Edit Details</h3>
                        <p className="text-xs text-slate-500">Update specifications and media</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-slate-900 text-white px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-slate-800 shadow-lg"
                >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
                </button>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-2 bg-white border-b border-slate-100 flex items-end gap-1 overflow-x-auto scrollbar-hide">
                {[
                    { id: 'essentials', label: 'Essentials', icon: Layers },
                    { id: 'details', label: 'Property Details', icon: Ruler },
                    { id: 'location', label: 'Location', icon: MapPin },
                    { id: 'amenities', label: 'Amenities', icon: List },
                    { id: 'media', label: 'Photos', icon: ImageIcon },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveFormTab(tab.id as FormTab)}
                        className={`flex items-center gap-2 px-5 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeFormTab === tab.id
                                ? 'border-slate-900 text-slate-900 bg-slate-50'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        <tab.icon size={16} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Import Bar */}
            {!isEditMode && (
                <div className="bg-teal-50 p-3 border-b border-teal-100 flex gap-3 items-center px-6">
                    <div className="flex items-center gap-2 text-teal-800 font-bold text-xs uppercase">
                        <Sparkles size={14} /> Quick Import
                    </div>
                    <div className="flex-1 flex gap-2">
                        <input
                            type="text"
                            placeholder="Paste URL..."
                            className="flex-1 bg-white border border-teal-200 rounded-lg px-3 py-2 text-sm outline-none"
                            value={importUrl}
                            onChange={(e) => setImportUrl(e.target.value)}
                        />
                        <button
                            onClick={handleImport}
                            disabled={isImporting}
                            className="px-4 py-2 bg-teal-600 text-white font-bold rounded-lg text-sm flex items-center gap-2 shadow-sm"
                        >
                            {isImporting ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} Auto-Fill
                        </button>
                    </div>
                    {importError && <div className="text-xs text-red-600 font-semibold ml-4">{importError}</div>}
                </div>
            )}

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
                <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    {activeFormTab === 'essentials' && <EssentialsTab form={form} setForm={setForm} />}
                    {activeFormTab === 'details' && <DetailsTab form={form} setForm={setForm} />}
                    {activeFormTab === 'location' && (
                        <LocationTab
                            form={form}
                            mapContainerRef={location.mapContainerRef}
                            searchQuery={location.searchQuery}
                            locationLoading={location.locationLoading}
                            locationSuggestions={location.locationSuggestions}
                            locationError={location.locationError}
                            onSearchChange={location.setSearchQuery}
                            onSuggestionSelect={location.handleSuggestionSelect}
                            onUseMyLocation={location.useMyLocation}
                        />
                    )}
                    {activeFormTab === 'amenities' && <AmenitiesTab form={form} setForm={setForm} />}
                    {activeFormTab === 'media' && (
                        <MediaTab
                            form={form}
                            setForm={setForm}
                            isUploading={isUploading}
                            onImageUpload={handleImageUpload}
                            onDownloadImage={handleDownloadImage}
                        />
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-5xl h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden">
                <button onClick={onClose} className="absolute top-4 right-4 z-30 p-2 bg-white/80 rounded-full hover:bg-white">
                    <X size={20} />
                </button>
                {viewMode === 'overview' && isEditMode ? (
                    <OverviewView form={form} onEditClick={() => setViewMode('edit')} />
                ) : (
                    renderEditForm()
                )}
            </div>
        </div>
    );
};

export default PropertyFormModal;
