import type { ListingFormState } from "./useListingForm";

export function validateListingForm(form: ListingFormState): string | null {
  if (!form.title.trim()) return "Title is required";
  if (form.merveEnabled && !form.merveWhatsappE164.trim()) {
    return "Merve Integration requires a WhatsApp number (E.164 format)";
  }
  return null;
}
