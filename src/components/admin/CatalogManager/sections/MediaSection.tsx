import React from "react";
import ImageUploader from "../../Shared/ImageUploader";
import type {
  ListingFormSetState,
  ListingFormState,
} from "../hooks/useListingForm";

interface MediaSectionProps {
  form: ListingFormState;
  setForm: ListingFormSetState;
}

const MediaSection: React.FC<MediaSectionProps> = ({ form, setForm }) => {
  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6">
      <h3 className="text-white font-bold text-lg mb-4">🖼️ Images</h3>
      <ImageUploader
        images={form.images}
        onImagesChange={(imgs) =>
          setForm((prev) => ({ ...prev, images: imgs }))
        }
        storagePath="catalog/listings"
      />
    </div>
  );
};

export default MediaSection;
