import React, { useState } from "react";
import { DayPicker, DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import { format } from "date-fns";
import {
  X,
  MapPin,
  Camera,
  ArrowLeft,
  ShieldCheck,
  Minus,
  Plus,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import MapMini from "../../components/admin/Shared/MapMini";
import { BusinessChatButton } from "../../components/business/BusinessChatWidget";

interface PinBookingModuleProps {
  typeLabel: string;
  title: string;
  subtitle?: string;
  categoryLabel?: string;
  durationLabel?: string;
  images?: string[];
  description?: string;
  coordinates?: { lat: number; lng: number };
  address?: string;
  price?: number;
  currency?: string;
  pricingUnitLabel: string; // e.g. "/person", "/ticket", "/trip"
  countLabel: string; // e.g. "Guests", "Tickets"
  fixedDate?: Date; // for fixed-date events
  businessId?: string; // for business chat
  onClose: () => void;
  onBook: (
    range: DateRange,
    count: number,
    total: number,
    guestDetails: any,
  ) => void;
}

const PinBookingModule: React.FC<PinBookingModuleProps> = ({
  typeLabel,
  title,
  subtitle,
  categoryLabel,
  durationLabel,
  images,
  description,
  coordinates,
  address,
  price,
  currency,
  pricingUnitLabel,
  countLabel,
  fixedDate,
  businessId,
  onClose,
  onBook,
}) => {
  const { user } = useAuth();
  const [showGallery, setShowGallery] = useState(false);
  const [step, setStep] = useState<"search" | "details" | "success">("search");
  const [range, setRange] = useState<DateRange | undefined>(() =>
    fixedDate ? { from: fixedDate, to: fixedDate } : undefined,
  );
  const [count, setCount] = useState(2);
  const [guestDetails, setGuestDetails] = useState({
    firstName: user?.name?.split(" ")[0] || "",
    lastName: user?.name?.split(" ")[1] || "",
    email: user?.email || "",
    phone: "",
    message: "",
  });

  const normalizedCurrency = currency || "GBP";
  const basePrice = price || 0;
  const serviceFee =
    basePrice > 0 ? Math.max(10, Math.round(basePrice * 0.1)) : 0;
  const subtotal = basePrice * count;
  const total = subtotal + serviceFee;

  const handleCheckAvailability = () => {
    if (!fixedDate && !range?.from) {
      alert("Please select a date.");
      return;
    }
    setStep("details");
  };

  const handleConfirm = () => {
    const from = range?.from || fixedDate || new Date();
    const to = range?.to || from;

    onBook({ from, to }, count, total, guestDetails);
    setStep("success");
  };

  if (showGallery) {
    return (
      <div className="fixed inset-0 z-[60] bg-black text-white flex flex-col">
        <div className="p-4 flex justify-between items-center">
          <button
            onClick={() => setShowGallery(false)}
            className="p-2 hover:bg-white/10 rounded-full"
          >
            <X />
          </button>
          <span className="font-bold">{title}</span>
          <div className="w-8" />
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {images && images.length > 0 ? (
            images.map((img, i) => (
              <img
                key={i}
                src={img}
                className="w-full h-64 object-cover rounded-lg"
                alt={`Gallery ${i}`}
              />
            ))
          ) : (
            <div className="col-span-full h-96 flex items-center justify-center bg-slate-900 rounded-lg">
              No images available
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full md:w-[1000px] md:h-[90vh] h-[95vh] md:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
        {/* Close buttons */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-50 bg-white/90 p-2 rounded-full shadow-md hover:bg-white transition-colors md:hidden"
        >
          <X size={20} />
        </button>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 bg-white/90 p-2 rounded-full shadow-md hover:bg-white transition-colors hidden md:block"
        >
          <X size={20} />
        </button>

        {/* Left: content */}
        <div className="w-full md:w-3/5 h-full overflow-y-auto scrollbar-hide bg-white">
          {step === "success" ? (
            <div className="h-full flex flex-col items-center justify-center px-6 py-12 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
                <ShieldCheck size={32} className="text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                Booking request sent for your {typeLabel.toLowerCase()}!
              </h2>
              <p className="text-slate-600 max-w-md">
                We’ve received your request. You’ll get a confirmation once the
                host reviews availability and finalizes your booking.
              </p>
              <button
                onClick={onClose}
                className="mt-2 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold shadow-lg hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Hero image */}
              <div
                className="h-64 md:h-80 relative group cursor-pointer"
                onClick={() => setShowGallery(true)}
              >
                <img
                  src={
                    images && images[0]
                      ? images[0]
                      : "https://source.unsplash.com/random/800x600/?north-cyprus"
                  }
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  alt={title}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                <button className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center gap-2 hover:bg-white">
                  <Camera size={14} /> View Photos
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-8">
                {/* Header */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase text-teal-600">
                    {typeLabel}
                  </p>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                    {title}
                  </h2>
                  {(subtitle || categoryLabel || durationLabel) && (
                    <div className="text-sm text-slate-500 flex flex-wrap gap-2">
                      {subtitle && <span>{subtitle}</span>}
                      {categoryLabel && (
                        <>
                          <span>·</span>
                          <span className="capitalize">{categoryLabel}</span>
                        </>
                      )}
                      {durationLabel && (
                        <>
                          <span>·</span>
                          <span>{durationLabel}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Description */}
                {description && (
                  <>
                    <hr className="border-slate-100" />
                    <div>
                      <p className="text-slate-600 leading-relaxed">
                        {description}
                      </p>
                    </div>
                  </>
                )}

                {/* Location */}
                {coordinates && (
                  <>
                    <hr className="border-slate-100" />
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg mb-3">
                        Where it happens
                      </h3>
                      <div className="h-56 rounded-2xl overflow-hidden border border-slate-200">
                        <MapMini
                          lat={coordinates.lat}
                          lng={coordinates.lng}
                          onChange={() => {}}
                        />
                      </div>
                      {address && (
                        <p className="mt-3 text-sm text-slate-600 flex items-center gap-2">
                          <MapPin size={16} className="text-slate-500" />
                          <span>{address}</span>
                        </p>
                      )}
                    </div>
                  </>
                )}

                <div className="h-24 md:hidden" />
              </div>
            </>
          )}
        </div>

        {/* Right: booking card */}
        {step !== "success" && (
          <div className="w-full md:w-2/5 bg-slate-50 md:border-l border-slate-100 flex flex-col">
            <div className="p-6 md:p-8 flex-1 overflow-y-auto">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sticky top-6">
                {step === "search" ? (
                  <>
                    <div className="flex justify-between items-end mb-6">
                      <div>
                        <span className="text-2xl font-bold text-slate-900">
                          {basePrice > 0
                            ? `${normalizedCurrency} ${basePrice}`
                            : "Free"}
                        </span>
                        {basePrice > 0 && (
                          <span className="text-slate-500">
                            {" "}
                            {pricingUnitLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Date selection */}
                    <div className="border border-slate-300 rounded-xl overflow-hidden mb-4">
                      <div className="grid grid-cols-2 border-b border-slate-300">
                        <div className="p-3 border-r border-slate-300 bg-slate-50">
                          <div className="text-[10px] font-bold uppercase text-slate-500">
                            {fixedDate ? "Date" : "Start"}
                          </div>
                          <div className="text-sm font-medium text-slate-900">
                            {fixedDate
                              ? format(fixedDate, "MMM d, yyyy")
                              : range?.from
                                ? format(range.from, "MMM d")
                                : "Add date"}
                          </div>
                        </div>
                        {!fixedDate && (
                          <div className="p-3 bg-slate-50">
                            <div className="text-[10px] font-bold uppercase text-slate-500">
                              End
                            </div>
                            <div className="text-sm font-medium text-slate-900">
                              {range?.to
                                ? format(range.to, "MMM d")
                                : "Add date"}
                            </div>
                          </div>
                        )}
                      </div>
                      {!fixedDate && (
                        <div className="p-0 flex justify-center bg-white">
                          <DayPicker
                            mode="range"
                            selected={range}
                            onSelect={setRange}
                            numberOfMonths={1}
                            disabled={{ before: new Date() }}
                            modifiersClassNames={{
                              selected:
                                "bg-slate-900 text-white hover:bg-slate-800",
                              today: "font-bold text-teal-600",
                            }}
                            styles={{
                              caption: { color: "#0f172a" },
                              head_cell: { color: "#64748b" },
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Count */}
                    <div className="border border-slate-300 rounded-xl p-3 mb-6 flex items-center justify-between cursor-pointer hover:border-slate-900 transition-colors">
                      <div>
                        <div className="text-[10px] font-bold uppercase text-slate-500">
                          {countLabel}
                        </div>
                        <div className="text-sm font-medium text-slate-900">
                          {count} {countLabel.toLowerCase()}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setCount(Math.max(1, count - 1))}
                          className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center hover:border-slate-900 text-slate-600"
                        >
                          <Minus size={14} />
                        </button>
                        <button
                          onClick={() => setCount(Math.min(20, count + 1))}
                          className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center hover:border-slate-900 text-slate-600"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleCheckAvailability}
                      disabled={!fixedDate && !range?.from}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl text-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-3"
                    >
                      Check Availability
                    </button>

                    {/* Business Chat Button */}
                    {businessId && (
                      <BusinessChatButton
                        businessId={businessId}
                        businessName={title}
                        className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3.5 rounded-xl text-lg shadow-lg transition-all flex items-center justify-center gap-2 mb-4"
                      />
                    )}
                  </>
                ) : (
                  <div className="animate-in slide-in-from-right-4 duration-300">
                    <button
                      onClick={() => setStep("search")}
                      className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-4"
                    >
                      <ArrowLeft size={14} /> Back
                    </button>

                    <h3 className="text-xl font-bold text-slate-900 mb-6">
                      Confirm and pay
                    </h3>

                    {/* Trip details */}
                    <div className="mb-6 text-sm text-slate-600 space-y-1">
                      {fixedDate || range?.from ? (
                        <div className="flex justify-between">
                          <span>Date</span>
                          <span className="font-medium">
                            {format(fixedDate || range!.from!, "MMM d, yyyy")}
                          </span>
                        </div>
                      ) : null}
                      <div className="flex justify-between">
                        <span>{countLabel}</span>
                        <span className="font-medium">
                          {count} {countLabel.toLowerCase()}
                        </span>
                      </div>
                    </div>

                    <hr className="border-slate-100 mb-6" />

                    {/* Guest info */}
                    <div className="space-y-3 mb-6">
                      <h4 className="font-bold text-slate-900 mb-2">
                        Your details
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="First name"
                          className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                          value={guestDetails.firstName}
                          onChange={(e) =>
                            setGuestDetails({
                              ...guestDetails,
                              firstName: e.target.value,
                            })
                          }
                        />
                        <input
                          type="text"
                          placeholder="Last name"
                          className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                          value={guestDetails.lastName}
                          onChange={(e) =>
                            setGuestDetails({
                              ...guestDetails,
                              lastName: e.target.value,
                            })
                          }
                        />
                      </div>
                      <input
                        type="email"
                        placeholder="Email"
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                        value={guestDetails.email}
                        onChange={(e) =>
                          setGuestDetails({
                            ...guestDetails,
                            email: e.target.value,
                          })
                        }
                      />
                      <input
                        type="tel"
                        placeholder="Phone number"
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                        value={guestDetails.phone}
                        onChange={(e) =>
                          setGuestDetails({
                            ...guestDetails,
                            phone: e.target.value,
                          })
                        }
                      />
                      <textarea
                        placeholder={`Any notes for this ${typeLabel.toLowerCase()} (optional)`}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none resize-none"
                        rows={3}
                        value={guestDetails.message}
                        onChange={(e) =>
                          setGuestDetails({
                            ...guestDetails,
                            message: e.target.value,
                          })
                        }
                      />
                    </div>

                    {/* Price breakdown */}
                    {basePrice > 0 && (
                      <div className="space-y-3 text-slate-600 text-sm mb-6">
                        <h4 className="font-bold text-slate-900 mb-2">
                          Price details
                        </h4>
                        <div className="flex justify-between">
                          <span className="underline">
                            {normalizedCurrency} {basePrice} {pricingUnitLabel}{" "}
                            × {count} {countLabel.toLowerCase()}
                          </span>
                          <span>
                            {normalizedCurrency} {subtotal}
                          </span>
                        </div>
                        {serviceFee > 0 && (
                          <div className="flex justify-between">
                            <span className="underline">Service fee</span>
                            <span>
                              {normalizedCurrency} {serviceFee}
                            </span>
                          </div>
                        )}
                        <hr className="border-slate-200 my-2" />
                        <div className="flex justify-between font-bold text-slate-900 text-base">
                          <span>Total</span>
                          <span>
                            {normalizedCurrency} {total}
                          </span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleConfirm}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl text-lg shadow-lg transition-all mb-4 flex items-center justify-center gap-2"
                    >
                      <ShieldCheck size={18} /> Confirm & Pay
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PinBookingModule;
