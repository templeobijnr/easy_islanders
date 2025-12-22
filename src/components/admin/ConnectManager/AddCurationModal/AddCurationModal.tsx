/**
 * AddCurationModal - Main implementation
 *
 * Thin composer that assembles extracted subcomponents.
 * All handlers in useCurationHandlers, all state in useCurationForm.
 */
import React, { useEffect, useRef } from "react";
import { X, Plus } from "lucide-react";
import { useCurationForm } from "../hooks/useCurationForm";
import { useCurationHandlers } from "./hooks/useCurationHandlers";
import {
    LocationSection,
    EventFormSection,
    ImageUploadSection,
    ActionsSection,
    DistributionSection,
} from "./components";
import type { AddCurationModalProps } from "./types";
import { MAPBOX_TOKEN } from "./constants";

const AddCurationModal: React.FC<AddCurationModalProps> = ({
    isOpen,
    onClose,
    activeSection,
    onSuccess,
}) => {
    const form = useCurationForm(activeSection);
    const { state, setSearchQuery, setFilteredVenues, setSelectedVenue, setGeoSearchQuery, setGeoResults, setIsGeoSearching, setSelectedLocation, setLocationMode, setMode, resetSelectedSections, setEnabledActions, setSelectedSections, setActionUrls, setEventTitle, setEventDesc, setEventCategory, setStartDate, setStartTime, setEndDate, setEndTime, setRegion, setManualAddress, setManualLat, setManualLng, setVenues, setIsLoading, setUploadedImages, setUploadingImages } = form;

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlers = useCurationHandlers({
        state,
        setVenues,
        setIsLoading,
        setManualLat,
        setManualLng,
        setManualAddress,
        setUploadedImages,
        setUploadingImages,
        onSuccess,
        onClose,
    });

    // Load venues on open
    useEffect(() => {
        if (isOpen) {
            handlers.loadVenues();
            resetSelectedSections();
        }
    }, [isOpen, activeSection]);

    // Venue search filtering
    useEffect(() => {
        if (state.searchQuery && state.locationMode === "venue") {
            setFilteredVenues(
                state.venues
                    .filter(
                        (v) =>
                            v.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                            v.category.toLowerCase().includes(state.searchQuery.toLowerCase())
                    )
                    .slice(0, 10)
            );
        } else {
            setFilteredVenues([]);
        }
    }, [state.searchQuery, state.venues, state.locationMode]);

    // Geocoding search with debounce
    useEffect(() => {
        if (state.geoSearchQuery.length < 3 || state.locationMode !== "search") {
            setGeoResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsGeoSearching(true);
            try {
                const response = await fetch(
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(state.geoSearchQuery)}.json?access_token=${MAPBOX_TOKEN}&types=poi,address,place&limit=8`
                );
                const data = await response.json();
                setGeoResults(data.features || []);
            } catch (err) {
                console.error("Geocoding failed:", err);
            } finally {
                setIsGeoSearching(false);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [state.geoSearchQuery, state.locationMode]);

    const toggleSection = (sectionId: string) => {
        setSelectedSections((prev: string[]) =>
            prev.includes(sectionId)
                ? prev.filter((id: string) => id !== sectionId)
                : [...prev, sectionId]
        );
    };

    const toggleAction = (actionId: string) => {
        setEnabledActions((prev: Record<string, boolean>) => ({
            ...prev,
            [actionId]: !prev[actionId],
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-2xl border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* HEADER */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50 backdrop-blur-md">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Plus className="text-cyan-400" /> Add to Feed
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* SIDEBAR TABS */}
                    <div className="w-48 border-r border-white/5 p-4 space-y-2 bg-slate-950/30">
                        <button
                            onClick={() => setMode("quick")}
                            className={`w-full text-left px-4 py-3 rounded-xl transition-all ${state.mode === "quick"
                                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                                    : "text-slate-400 hover:bg-white/5"
                                }`}
                        >
                            <div className="font-bold text-sm">Quick Link</div>
                            <div className="text-xs opacity-70">Existing Venue</div>
                        </button>
                        <button
                            onClick={() => setMode("create")}
                            className={`w-full text-left px-4 py-3 rounded-xl transition-all ${state.mode === "create"
                                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                                    : "text-slate-400 hover:bg-white/5"
                                }`}
                        >
                            <div className="font-bold text-sm">Create Event</div>
                            <div className="text-xs opacity-70">Robust Builder</div>
                        </button>
                    </div>

                    {/* CONTENT AREA */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <LocationSection
                            mode={state.mode}
                            locationMode={state.locationMode}
                            setLocationMode={setLocationMode}
                            searchQuery={state.searchQuery}
                            setSearchQuery={setSearchQuery}
                            filteredVenues={state.filteredVenues}
                            selectedVenue={state.selectedVenue}
                            setSelectedVenue={setSelectedVenue}
                            geoSearchQuery={state.geoSearchQuery}
                            setGeoSearchQuery={setGeoSearchQuery}
                            geoResults={state.geoResults}
                            isGeoSearching={state.isGeoSearching}
                            selectedLocation={state.selectedLocation}
                            setSelectedLocation={setSelectedLocation}
                            manualAddress={state.manualAddress}
                            setManualAddress={setManualAddress}
                            manualLat={state.manualLat}
                            setManualLat={setManualLat}
                            manualLng={state.manualLng}
                            setManualLng={setManualLng}
                            onGetCurrentLocation={handlers.handleGetCurrentLocation}
                        />

                        {state.mode === "create" && (
                            <>
                                <EventFormSection
                                    eventTitle={state.eventTitle}
                                    setEventTitle={setEventTitle}
                                    eventDesc={state.eventDesc}
                                    setEventDesc={setEventDesc}
                                    eventCategory={state.eventCategory}
                                    setEventCategory={setEventCategory}
                                    startDate={state.startDate}
                                    setStartDate={setStartDate}
                                    startTime={state.startTime}
                                    setStartTime={setStartTime}
                                    endDate={state.endDate}
                                    setEndDate={setEndDate}
                                    endTime={state.endTime}
                                    setEndTime={setEndTime}
                                    region={state.region}
                                    setRegion={setRegion}
                                />

                                <ImageUploadSection
                                    uploadedImages={state.uploadedImages}
                                    uploadingImages={state.uploadingImages}
                                    fileInputRef={fileInputRef}
                                    onImageUpload={handlers.handleImageUpload}
                                    onRemoveImage={handlers.removeImage}
                                />

                                <ActionsSection
                                    enabledActions={state.enabledActions}
                                    onToggleAction={toggleAction}
                                    actionUrls={state.actionUrls}
                                    setActionUrls={setActionUrls}
                                />
                            </>
                        )}

                        <div className="h-px bg-white/10 my-4" />

                        <DistributionSection
                            selectedSections={state.selectedSections}
                            onToggleSection={toggleSection}
                        />
                    </div>
                </div>

                {/* FOOTER */}
                <div className="p-6 border-t border-white/5 bg-slate-900/50 flex justify-end gap-3 backdrop-blur-md">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-slate-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handlers.handleSave}
                        disabled={state.isLoading || !handlers.canSave()}
                        className="px-8 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-cyan-500/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
                    >
                        {state.isLoading
                            ? "Saving..."
                            : state.mode === "create"
                                ? "Create & Publish"
                                : "Add Item"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddCurationModal;
