import React, { useState } from "react";
import { Loader2, Save } from "lucide-react";
import type { UnifiedListing } from "../../../types/UnifiedListing";
import { UnifiedListingsService } from "../../../services/unifiedListingsService";
import { useListingForm } from "./hooks/useListingForm";
import { validateListingForm } from "./hooks/useListingValidation";
import BasicInfoSection from "./sections/BasicInfoSection";
import ContactSection from "./sections/ContactSection";
import StayDetailsSection from "./sections/StayDetailsSection";
import PricingSection from "./sections/PricingSection";
import MediaSection from "./sections/MediaSection";
import LocationSection from "./sections/LocationSection";
import HoursSection from "./sections/HoursSection";
import BookingOptionsSection from "./sections/BookingOptionsSection";
import ActionsSection from "./sections/ActionsSection";
import MerveToolIntegrationSection from "./sections/MerveToolIntegrationSection";

interface UnifiedListingFormProps {
  onSuccess?: (listing: UnifiedListing) => void;
  onCancel?: () => void;
  editingListing?: UnifiedListing | null;
}

const UnifiedListingForm: React.FC<UnifiedListingFormProps> = ({
  onSuccess,
  onCancel,
  editingListing,
}) => {
  const { form, setForm, handleCategoryChange } =
    useListingForm(editingListing);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const validationError = validateListingForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const merveData = form.merveEnabled
        ? {
            enabled: true,
            toolType: form.merveToolType as
              | "restaurant"
              | "provider"
              | "activity"
              | "stay",
            whatsappE164: form.merveWhatsappE164.trim(),
            dispatchTemplate: form.merveDispatchTemplate.trim() || undefined,
            coverageAreas: form.merveCoverageAreas
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            tags: form.merveTags
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            geo: { lat: form.lat, lng: form.lng },
          }
        : { enabled: false };

      const listingData: Omit<
        UnifiedListing,
        "id" | "createdAt" | "updatedAt"
      > = {
        type: form.type,
        category: form.category,
        subcategory: form.subcategory || undefined,
        title: form.title,
        description: form.description,
        address: form.address,
        lat: form.lat,
        lng: form.lng,
        region: form.region,
        cityId: form.cityId,
        phone: form.phone || undefined,
        email: form.email || undefined,
        website: form.website || undefined,
        images: form.images,
        rating: form.rating || undefined,
        priceLevel: form.priceLevel || undefined,
        displayPrice: form.displayPrice || undefined,
        openingHours:
          form.openingHours.length > 0 ? form.openingHours : undefined,
        bookingEnabled: form.bookingEnabled,
        bookingOptions: form.bookingOptions,
        actions: form.actions,
        googlePlaceId: form.googlePlaceId || undefined,
        showOnMap: form.showOnMap,
        approved: true,
        merve: merveData,
      } as any;

      if (editingListing?.id)
        await UnifiedListingsService.update(editingListing.id, listingData);
      else await UnifiedListingsService.create(listingData);

      setSuccess(true);
      setError("");

      setTimeout(() => {
        onSuccess?.(listingData as UnifiedListing);
      }, 1500);
    } catch (err: any) {
      console.error("Failed to save listing:", err);
      setError(err.message || "Failed to save listing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {success && (
        <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 text-green-400 flex items-center gap-2">
          ✅ Listing saved successfully!
        </div>
      )}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-400">
          ❌ {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <BasicInfoSection
            form={form}
            setForm={setForm}
            onCategoryChange={handleCategoryChange}
            setError={setError}
          />
          <ContactSection form={form} setForm={setForm} />
          <StayDetailsSection form={form} setForm={setForm} />
          <PricingSection form={form} setForm={setForm} />
          <MediaSection form={form} setForm={setForm} />
        </div>

        <div className="space-y-6">
          <LocationSection form={form} setForm={setForm} />
          <HoursSection form={form} />
          <BookingOptionsSection form={form} setForm={setForm} />
          <ActionsSection form={form} setForm={setForm} />
          <MerveToolIntegrationSection form={form} setForm={setForm} />

          <button
            onClick={handleSubmit}
            disabled={loading || !form.title}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-4 rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Save size={20} />
            )}
            {editingListing ? "Update Listing" : "Create Listing"}
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
    </div>
  );
};

export default UnifiedListingForm;
