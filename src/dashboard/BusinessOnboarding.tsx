import { logger } from "@/utils/logger";
import React, { useState, useEffect, useCallback } from "react";
import {
  Building2,
  ArrowLeft,
  Search,
  MapPin,
  Check,
  Loader2,
  Store,
  Phone,
  Globe,
} from "lucide-react";
import { BusinessConfig } from "../../types";
import { useAuth } from "../context/AuthContext";
import {
  collection,
  query,
  getDocs,
  limit,
  orderBy,
  startAt,
  endAt,
} from "firebase/firestore";
import { auth, db } from "../services/firebaseConfig";
import {
  PhoneAuthProvider,
  RecaptchaVerifier,
  linkWithCredential,
} from "firebase/auth";
import { v1ApiUrl } from "@/config/api";

interface BusinessOnboardingProps {
  onComplete: (config: BusinessConfig) => void;
  onExit: () => void;
}

type Step = "intro" | "search" | "confirm" | "verify" | "success";

interface PlaceResult {
  id: string;
  title: string;
  category: string;
  address?: string;
  region?: string;
  images?: string[];
  ownerId?: string; // If already claimed
}

const BusinessOnboarding: React.FC<BusinessOnboardingProps> = ({
  onComplete,
  onExit,
}) => {
  const [step, setStep] = useState<Step>("intro");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const { user, firebaseUser, forceRefreshToken } = useAuth();
  const [businessPhoneE164, setBusinessPhoneE164] = useState<string | null>(
    null,
  );
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [claimError, setClaimError] = useState<string | null>(null);

  // Debounced search
  const searchPlaces = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Search Firestore listings collection
      // We capitalize the first letter to match standard titles since Firestore is case-sensitive
      const searchTerm = q.charAt(0).toUpperCase() + q.slice(1);
      const endTerm = searchTerm + "\uf8ff";

      const listingsRef = collection(db, "listings");
      // Simple prefix search
      const qry = query(
        listingsRef,
        orderBy("title"),
        startAt(searchTerm),
        endAt(endTerm),
        limit(20),
      );

      const snapshot = await getDocs(qry);

      // Map to PlaceResult
      const results = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || data.name,
          category: data.category,
          address: data.address || data.location,
          region: data.region,
          images: data.images,
          ownerId: data.ownerUid, // Map ownerUid to ownerId for this component
        } as PlaceResult;
      });

      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
      // Fallback: fetch general batch and filter (if index missing for orderBy title)
      try {
        const listingsRef = collection(db, "listings");
        const snapshot = await getDocs(query(listingsRef, limit(50)));
        const results = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data.title || data.name,
              category: data.category,
              address: data.address || data.location,
              region: data.region,
              images: data.images,
              ownerId: data.ownerUid,
            } as PlaceResult;
          })
          .filter((p) => p.title?.toLowerCase().includes(q.toLowerCase()));
        setSearchResults(results);
      } catch (fallbackError) {
        console.error("Fallback search failed", fallbackError);
      }
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchPlaces(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchPlaces]);

  const handleSelectPlace = (place: PlaceResult) => {
    setSelectedPlace(place);
    setStep("confirm");
  };

  const getAuthToken = async () => {
    if (!firebaseUser) return null;
    return firebaseUser.getIdToken();
  };

  const handleClaimBusiness = async () => {
    if (!selectedPlace || !user?.id) return;
    setClaimError(null);

    setIsClaiming(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("AUTH_REQUIRED");

      // 1) Start claim on server (pending) and get the phone to verify.
      const startRes = await fetch(v1ApiUrl("/claim/start"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ businessId: selectedPlace.id }),
      });

      const startJson = await startRes.json().catch(() => ({}));
      if (!startRes.ok) {
        throw new Error(
          startJson?.message || startJson?.error || "Failed to start claim",
        );
      }

      const phone = startJson?.businessPhoneE164 as string | undefined;
      if (!phone) {
        throw new Error(
          "This business has no phone number available for verification.",
        );
      }

      setBusinessPhoneE164(phone);

      // DEV MODE: Skip phone verification entirely
      const isDevMode =
        import.meta.env.VITE_DEV_MODE === "true" || import.meta.env.DEV;
      if (isDevMode) {
        logger.debug(
          "[DEV MODE] Skipping phone verification, using dev bypass",
        );
        // Use dev bypass endpoint instead of phone verification
        const bypassRes = await fetch(v1ApiUrl("/claim/dev-bypass"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ businessId: selectedPlace.id }),
        });

        const bypassJson = await bypassRes.json().catch(() => ({}));
        if (!bypassRes.ok) {
          throw new Error(
            bypassJson?.message || bypassJson?.error || "Dev bypass failed",
          );
        }

        await forceRefreshToken();

        const config: BusinessConfig = {
          id: selectedPlace.id,
          businessName: selectedPlace.title,
          domain: selectedPlace.category || "Services",
          subType: null,
          ownerUid: user?.id,
          placeId: selectedPlace.id,
        };

        setStep("success");
        setTimeout(() => onComplete(config), 1200);
        return;
      }

      // PRODUCTION: Send OTP via Firebase Phone Auth and link phoneNumber to the current user.
      const recaptcha = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });
      const provider = new PhoneAuthProvider(auth);
      const id = await provider.verifyPhoneNumber(phone, recaptcha);
      setVerificationId(id);
      setOtpCode("");
      setStep("verify");
    } catch (error: any) {
      console.error("Claim failed:", error);
      setClaimError(
        error?.message || "Failed to start claim. Please try again.",
      );
    } finally {
      setIsClaiming(false);
    }
  };

  const handleConfirmOtp = async () => {
    if (!selectedPlace || !verificationId) return;
    setIsClaiming(true);
    setClaimError(null);

    try {
      if (!auth.currentUser) throw new Error("AUTH_REQUIRED");
      const credential = PhoneAuthProvider.credential(
        verificationId,
        otpCode.trim(),
      );
      await linkWithCredential(auth.currentUser, credential);

      const token = await getAuthToken();
      if (!token) throw new Error("AUTH_REQUIRED");

      const confirmRes = await fetch(v1ApiUrl("/claim/confirm"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ businessId: selectedPlace.id }),
      });

      const confirmJson = await confirmRes.json().catch(() => ({}));
      if (!confirmRes.ok) {
        throw new Error(
          confirmJson?.message ||
            confirmJson?.error ||
            "Claim confirmation failed",
        );
      }

      await forceRefreshToken();

      const config: BusinessConfig = {
        id: selectedPlace.id,
        businessName: selectedPlace.title,
        domain: selectedPlace.category || "Services",
        subType: null,
        ownerUid: user?.id,
        placeId: selectedPlace.id,
      };

      setStep("success");
      setTimeout(() => onComplete(config), 1200);
    } catch (error: any) {
      console.error("OTP confirm failed:", error);
      setClaimError(error?.message || "Verification failed. Please try again.");
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="p-6">
        <button
          onClick={onExit}
          className="text-slate-500 hover:text-slate-900 flex items-center gap-2 font-medium transition-colors"
        >
          <ArrowLeft size={20} /> Back to App
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden relative min-h-[500px] flex flex-col">
          {/* INTRO STEP */}
          {step === "intro" && (
            <div className="p-12 text-center flex flex-col items-center justify-center flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-24 h-24 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl shadow-slate-200">
                <Store size={48} />
              </div>
              <h2 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">
                Claim Your Business
              </h2>
              <p className="text-xl text-slate-500 mb-10 max-w-lg leading-relaxed">
                Get your own AI agent that handles customer inquiries 24/7.
                Search for your business to get started.
              </p>
              <button
                onClick={() => setStep("search")}
                className="px-10 py-4 bg-slate-900 text-white font-bold rounded-full hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center gap-2 text-lg"
              >
                <Search size={20} />
                Find My Business
              </button>
            </div>
          )}

          {/* SEARCH STEP */}
          {step === "search" && (
            <div className="p-8 flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-3xl font-bold text-slate-900 mb-2 text-center">
                Find Your Business
              </h2>
              <p className="text-slate-500 text-center mb-8">
                Search by business name or category
              </p>

              {/* Search Input */}
              <div className="relative mb-6">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g., Snaz Beach, Gym, Restaurant..."
                  className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/10 focus:border-slate-900 outline-none text-lg transition-all"
                  autoFocus
                />
                {isSearching && (
                  <Loader2
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 animate-spin"
                    size={20}
                  />
                )}
              </div>

              {/* Results */}
              <div className="flex-1 overflow-y-auto space-y-3 max-h-[300px]">
                {searchResults.length === 0 &&
                  searchQuery.length >= 2 &&
                  !isSearching && (
                    <div className="text-center py-8 text-slate-400">
                      No businesses found matching "{searchQuery}"
                    </div>
                  )}

                {searchResults.map((place) => (
                  <button
                    key={place.id}
                    onClick={() => handleSelectPlace(place)}
                    disabled={!!place.ownerId}
                    className={`w-full p-4 border rounded-2xl text-left flex items-center gap-4 transition-all ${
                      place.ownerId
                        ? "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed"
                        : "border-slate-200 hover:border-slate-900 hover:shadow-md"
                    }`}
                  >
                    {/* Image */}
                    <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                      {place.images?.[0] ? (
                        <img
                          src={place.images[0]}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Building2 size={24} />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 truncate">
                        {place.title}
                      </div>
                      <div className="text-sm text-slate-500 flex items-center gap-1">
                        <MapPin size={12} />
                        {place.address || place.region || "North Cyprus"}
                      </div>
                      <div className="text-xs text-slate-400 capitalize">
                        {place.category}
                      </div>
                    </div>

                    {/* Status */}
                    {place.ownerId ? (
                      <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full">
                        Claimed
                      </span>
                    ) : (
                      <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
                        Available
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setStep("intro")}
                  className="text-slate-400 hover:text-slate-600 text-sm font-medium"
                >
                  ← Back
                </button>
              </div>
            </div>
          )}

          {/* CONFIRM STEP */}
          {step === "confirm" && selectedPlace && (
            <div className="p-12 flex flex-col items-center justify-center flex-1 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Business Card */}
              <div className="w-full max-w-sm bg-slate-50 rounded-2xl p-6 mb-8">
                <div className="w-20 h-20 rounded-2xl bg-slate-200 overflow-hidden mx-auto mb-4">
                  {selectedPlace.images?.[0] ? (
                    <img
                      src={selectedPlace.images[0]}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Building2 size={32} />
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold text-slate-900 text-center mb-1">
                  {selectedPlace.title}
                </h3>
                <p className="text-slate-500 text-center text-sm">
                  {selectedPlace.category}
                </p>
                <p className="text-slate-400 text-center text-xs mt-1">
                  {selectedPlace.address || selectedPlace.region}
                </p>
              </div>

              <h2 className="text-2xl font-bold text-slate-900 mb-4 text-center">
                Claim This Business?
              </h2>
              <p className="text-slate-500 text-center mb-8 max-w-md">
                We'll send a verification code to the business phone number on
                file to confirm you own this listing.
              </p>

              {claimError && (
                <div className="w-full max-w-md mb-6 p-4 rounded-2xl border border-red-200 bg-red-50 text-red-700 text-sm">
                  {claimError}
                </div>
              )}

              {/* Invisible reCAPTCHA container required by Firebase Phone Auth */}
              <div id="recaptcha-container" />

              <div className="flex gap-4">
                <button
                  onClick={() => setStep("search")}
                  className="px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleClaimBusiness}
                  disabled={isClaiming}
                  className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {isClaiming ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Sending code...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      Send Verification Code
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* VERIFY STEP */}
          {step === "verify" && selectedPlace && (
            <div className="p-12 flex flex-col items-center justify-center flex-1 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-2xl font-bold text-slate-900 mb-3 text-center">
                Enter Verification Code
              </h2>
              <p className="text-slate-500 text-center mb-6 max-w-md">
                We sent a code to{" "}
                {businessPhoneE164 || "the business phone number"}. Enter it to
                finish claiming your business.
              </p>

              {claimError && (
                <div className="w-full max-w-md mb-6 p-4 rounded-2xl border border-red-200 bg-red-50 text-red-700 text-sm">
                  {claimError}
                </div>
              )}

              <div className="w-full max-w-sm">
                <input
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  inputMode="numeric"
                  className="w-full px-4 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/10 focus:border-slate-900 outline-none text-lg tracking-widest text-center"
                />
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setStep("confirm")}
                  disabled={isClaiming}
                  className="px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmOtp}
                  disabled={isClaiming || otpCode.trim().length < 4}
                  className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {isClaiming ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      Verify & Claim
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* SUCCESS STEP */}
          {step === "success" && (
            <div className="p-12 flex flex-col items-center justify-center flex-1 animate-in fade-in zoom-in duration-500">
              <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center mb-8 shadow-lg">
                <Check size={48} />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4 text-center">
                Business Claimed!
              </h2>
              <p className="text-slate-500 text-center mb-4">
                Welcome to your AI-powered business dashboard.
              </p>
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 size={16} className="animate-spin" />
                Loading your dashboard...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessOnboarding;
