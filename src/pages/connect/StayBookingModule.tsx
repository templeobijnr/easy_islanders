import React, { useState, useEffect } from "react";
import { DayPicker, DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import {
  format,
  differenceInDays,
  addDays,
  isSameDay,
  isWithinInterval,
} from "date-fns";
import {
  X,
  Star,
  MapPin,
  User,
  Wifi,
  Coffee,
  Car,
  Wind,
  Check,
  ChevronRight,
  Minus,
  Plus,
  ArrowLeft,
  ShieldCheck,
  CreditCard,
  Camera,
} from "lucide-react";
import { Stay } from "../../types/connect";
import { BookingsService } from "../../services/domains/bookings/bookings.service";
import { useAuth } from "../../context/AuthContext";
import MapMini from "../../components/shared/MapMini";
import { BusinessChatButton } from "../../components/business/BusinessChatWidget";

interface StayBookingModuleProps {
  stay: Stay;
  onClose: () => void;
  onBook: (
    range: DateRange,
    guests: number,
    total: number,
    guestDetails: any,
  ) => void;
}

const StayBookingModule: React.FC<StayBookingModuleProps> = ({
  stay,
  onClose,
  onBook,
}) => {
  const { user } = useAuth();
  const [range, setRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(1);
  const [step, setStep] = useState<"search" | "details" | "success">("search");
  const [disabledDates, setDisabledDates] = useState<Date[]>([]);
  const [showGallery, setShowGallery] = useState(false);

  // Guest Details Form
  const [guestDetails, setGuestDetails] = useState({
    firstName: user?.name?.split(" ")[0] || "",
    lastName: user?.name?.split(" ")[1] || "",
    email: user?.email || "",
    phone: "",
    message: "",
  });

  useEffect(() => {
    const fetchAvailability = async () => {
      const bookedRanges = await BookingsService.getBookedDates(stay.id);
      const dates: Date[] = [];
      bookedRanges.forEach((range) => {
        let curr = range.from;
        while (curr <= range.to) {
          dates.push(new Date(curr));
          curr = addDays(curr, 1);
        }
      });
      setDisabledDates(dates);
    };
    fetchAvailability();
  }, [stay.id]);

  const pricePerNight = stay.price || 100;
  const currency = stay.currency || "GBP";
  const cleaningFee = 30;
  const serviceFee = 15;

  const nights =
    range?.from && range?.to ? differenceInDays(range.to, range.from) : 0;
  const subtotal = nights * pricePerNight;
  const total = subtotal + cleaningFee + serviceFee;

  const handleCheckAvailability = () => {
    if (range?.from && range?.to) {
      setStep("details");
    }
  };

  const handleConfirmBooking = async () => {
    if (!range?.from || !range?.to) return;

    // For now all stays are request-only; this will create a booking with status 'requested'
    try {
      await BookingsService.createBooking({
        userId: user?.id || "anonymous",
        catalogType: "stay",
        itemTitle: stay.title,
        stayId: stay.id,
        stayTitle: stay.title,
        stayHostName: stay.hostName || "Easy Islanders",
        stayHostPhone: (stay as any).hostPhone || null,
        stayHostEmail: (stay as any).hostEmail || null,
        startDate: range.from,
        endDate: range.to,
        guests,
        totalPrice: total,
        currency,
        guestDetails,
      });
      setStep("success");
    } catch (err) {
      console.error("Booking request failed", err);
      alert("Failed to send booking request. Please try again.");
    }
  };

  if (showGallery) {
    return (
      <div className="fixed inset-0 z-[60] bg-black text-white flex flex-col animate-in fade-in duration-300">
        <div className="p-4 flex justify-between items-center">
          <button
            onClick={() => setShowGallery(false)}
            className="p-2 hover:bg-white/10 rounded-full"
          >
            <X />
          </button>
          <span className="font-bold">{stay.title}</span>
          <div className="w-8" />
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stay.images?.map((img, i) => (
            <img
              key={i}
              src={img}
              className="w-full h-64 object-cover rounded-lg"
              alt={`Gallery ${i}`}
            />
          ))}
          {(!stay.images || stay.images.length === 0) && (
            <div className="col-span-full h-96 flex items-center justify-center bg-slate-900 rounded-lg">
              No images available
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full md:w-[1000px] md:h-[90vh] h-[95vh] md:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
        {/* Close Button */}
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

        {/* Left Side: Content */}
        <div className="w-full md:w-3/5 h-full overflow-y-auto scrollbar-hide bg-white">
          {step === "success" ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                <Check size={40} />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                Request sent!
              </h2>
              <p className="text-slate-600 mb-8 max-w-md">
                Your request to book this stay has been sent. We&apos;ll confirm
                availability with the host and get back to you at{" "}
                <b>{guestDetails.email || "your email"}</b>.
              </p>
              <div className="bg-slate-50 p-6 rounded-2xl w-full max-w-sm mb-8 text-left border border-slate-100">
                <div className="flex justify-between mb-2">
                  <span className="text-slate-500">Reference</span>
                  <span className="font-mono font-bold">
                    #
                    {String(Math.floor(Math.random() * 10000)).padStart(4, "0")}
                    XY
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-slate-500">Dates</span>
                  <span className="font-bold">
                    {range?.from && format(range.from, "MMM d")} -{" "}
                    {range?.to && format(range.to, "MMM d")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Estimated total</span>
                  <span className="font-bold text-emerald-600">
                    {currency} {total}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Hero Image */}
              <div
                className="h-64 md:h-80 relative group cursor-pointer"
                onClick={() => setShowGallery(true)}
              >
                <img
                  src={
                    stay.images?.[0] ||
                    "https://source.unsplash.com/random/800x600/?luxury-villa"
                  }
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  alt={stay.title}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                <button className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center gap-2 hover:bg-white">
                  <Camera size={14} /> View Photos
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-8">
                {/* Header */}
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight mb-2">
                    {stay.title}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <Star
                        size={16}
                        className="text-slate-900 fill-slate-900"
                      />
                      <span className="font-bold text-slate-900">4.92</span>
                      <span className="underline">(128 reviews)</span>
                    </div>
                    <span>·</span>
                    <div className="flex items-center gap-1">
                      <MapPin size={16} />
                      <span className="underline">
                        {stay.region}, North Cyprus
                      </span>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Host Info */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-200 rounded-full overflow-hidden">
                    <img
                      src="https://source.unsplash.com/random/100x100/?portrait"
                      alt="Host"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Hosted by {stay.hostName || "Easy Islanders"}
                    </h3>
                    <p className="text-slate-500 text-sm">
                      Your local island host partner
                    </p>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Description */}
                <div>
                  <p className="text-slate-600 leading-relaxed">
                    {stay.description ||
                      "Experience luxury living in this stunning property. Featuring modern amenities, breathtaking views, and a prime location close to local attractions. Perfect for families or groups looking for an unforgettable getaway."}
                  </p>
                </div>

                <hr className="border-slate-100" />

                {/* Amenities */}
                <div>
                  <h3 className="font-bold text-slate-900 text-lg mb-4">
                    What this place offers
                  </h3>

                  {Array.isArray(stay.amenities) &&
                    stay.amenities.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {stay.amenities.map((am, i) => (
                        <span
                          key={`${am}-${i}`}
                          className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold"
                        >
                          {am}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {Array.isArray(stay.amenities) &&
                    stay.amenities.length === 0 && (
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { icon: Wifi, label: "Fast Wifi" },
                          { icon: Car, label: "Free parking" },
                          { icon: Wind, label: "Air conditioning" },
                          { icon: Coffee, label: "Coffee maker" },
                          { icon: User, label: "Self check-in" },
                          { icon: Check, label: "Essentials" },
                        ].map((am, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 text-slate-600"
                          >
                            <am.icon size={20} className="text-slate-400" />
                            <span>{am.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                {/* Location Map */}
                {stay.coordinates && (
                  <>
                    <hr className="border-slate-100" />
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg mb-3">
                        Where you'll be
                      </h3>
                      <div className="h-56 rounded-2xl overflow-hidden border border-slate-200">
                        <MapMini
                          lat={stay.coordinates.lat}
                          lng={stay.coordinates.lng}
                          onChange={() => { }}
                        />
                      </div>
                      {stay.address && (
                        <p className="mt-3 text-sm text-slate-600 flex items-center gap-2">
                          <MapPin size={16} className="text-slate-500" />
                          <span>{stay.address}</span>
                        </p>
                      )}
                    </div>
                  </>
                )}

                <div className="h-24 md:hidden"></div>
              </div>
            </>
          )}
        </div>

        {/* Right Side: Booking Card (Sticky on Desktop) */}
        {step !== "success" && (
          <div className="w-full md:w-2/5 bg-slate-50 md:border-l border-slate-100 flex flex-col">
            <div className="p-6 md:p-8 flex-1 overflow-y-auto">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sticky top-6">
                {step === "search" ? (
                  <>
                    <div className="flex justify-between items-end mb-6">
                      <div>
                        <span className="text-2xl font-bold text-slate-900">
                          {currency} {pricePerNight}
                        </span>
                        <span className="text-slate-500"> / night</span>
                      </div>
                    </div>

                    {/* Date Picker */}
                    <div className="border border-slate-300 rounded-xl overflow-hidden mb-4">
                      <div className="grid grid-cols-2 border-b border-slate-300">
                        <div className="p-3 border-r border-slate-300 bg-slate-50">
                          <div className="text-[10px] font-bold uppercase text-slate-500">
                            Check-in
                          </div>
                          <div className="text-sm font-medium text-slate-900">
                            {range?.from
                              ? format(range.from, "MMM d")
                              : "Add date"}
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50">
                          <div className="text-[10px] font-bold uppercase text-slate-500">
                            Checkout
                          </div>
                          <div className="text-sm font-medium text-slate-900">
                            {range?.to ? format(range.to, "MMM d") : "Add date"}
                          </div>
                        </div>
                      </div>
                      <div className="p-0 flex justify-center bg-white">
                        <DayPicker
                          mode="range"
                          selected={range}
                          onSelect={setRange}
                          numberOfMonths={1}
                          disabled={[{ before: new Date() }, ...disabledDates]}
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
                    </div>

                    {/* Guests */}
                    <div className="border border-slate-300 rounded-xl p-3 mb-6 flex items-center justify-between cursor-pointer hover:border-slate-900 transition-colors">
                      <div>
                        <div className="text-[10px] font-bold uppercase text-slate-500">
                          Guests
                        </div>
                        <div className="text-sm font-medium text-slate-900">
                          {guests} guest{guests > 1 ? "s" : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setGuests(Math.max(1, guests - 1))}
                          className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center hover:border-slate-900 text-slate-600"
                        >
                          <Minus size={14} />
                        </button>
                        <button
                          onClick={() => setGuests(Math.min(10, guests + 1))}
                          className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center hover:border-slate-900 text-slate-600"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleCheckAvailability}
                      disabled={!range?.from || !range?.to}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl text-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-3"
                    >
                      Continue
                    </button>

                    {/* Business Chat Button */}
                    <BusinessChatButton
                      businessId={stay.id}
                      businessName={stay.title}
                      className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3.5 rounded-xl text-lg shadow-lg transition-all flex items-center justify-center gap-2 mb-4"
                    />
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
                      Request to book
                    </h3>

                    {/* Trip Details */}
                    <div className="mb-6">
                      <h4 className="font-bold text-slate-900 mb-2">
                        Your trip
                      </h4>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">Dates</span>
                        <span className="font-medium">
                          {range?.from && format(range.from, "MMM d")} -{" "}
                          {range?.to && format(range.to, "MMM d")}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Guests</span>
                        <span className="font-medium">
                          {guests} guest{guests > 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    <hr className="border-slate-100 mb-6" />

                    {/* Guest Info Form */}
                    <div className="mb-6 space-y-3">
                      <h4 className="font-bold text-slate-900 mb-2">
                        Contact Info
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="First Name"
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
                          placeholder="Last Name"
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
                        placeholder="Email Address"
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
                        placeholder="Phone Number"
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                        value={guestDetails.phone}
                        onChange={(e) =>
                          setGuestDetails({
                            ...guestDetails,
                            phone: e.target.value,
                          })
                        }
                      />
                    </div>

                    <hr className="border-slate-100 mb-6" />

                    {/* Price Breakdown */}
                    <div className="space-y-3 text-slate-600 text-sm mb-6">
                      <h4 className="font-bold text-slate-900 mb-2">
                        Price details
                      </h4>
                      <div className="flex justify-between">
                        <span className="underline">
                          {currency} {pricePerNight} x {nights} nights
                        </span>
                        <span>
                          {currency} {subtotal}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="underline">Cleaning fee</span>
                        <span>
                          {currency} {cleaningFee}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="underline">Service fee</span>
                        <span>
                          {currency} {serviceFee}
                        </span>
                      </div>
                      <hr className="border-slate-200 my-2" />
                      <div className="flex justify-between font-bold text-slate-900 text-base">
                        <span>Total (GBP)</span>
                        <span>
                          {currency} {total}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleConfirmBooking}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl text-lg shadow-lg transition-all mb-4 flex items-center justify-center gap-2"
                    >
                      <ShieldCheck size={18} /> Request to book
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Bottom Bar (Fixed) */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex items-center justify-between z-40">
          {step === "search" ? (
            <>
              <div>
                <div className="font-bold text-slate-900 text-lg">
                  {currency} {pricePerNight}{" "}
                  <span className="text-sm font-normal text-slate-500">
                    / night
                  </span>
                </div>
                <div className="text-xs text-slate-500 underline">
                  {range?.from && range?.to
                    ? `${format(range.from, "MMM d")} - ${format(range.to, "MMM d")}`
                    : "Select dates"}
                </div>
              </div>
              <button
                onClick={handleCheckAvailability}
                disabled={!range?.from || !range?.to}
                className="bg-slate-900 text-white font-bold px-6 py-3 rounded-xl shadow-lg disabled:opacity-50"
              >
                Continue
              </button>
            </>
          ) : step === "details" ? (
            <button
              onClick={handleConfirmBooking}
              className="w-full bg-slate-900 text-white font-bold px-6 py-3 rounded-xl shadow-lg"
            >
              Request to book
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full bg-slate-900 text-white font-bold px-6 py-3 rounded-xl"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StayBookingModule;
