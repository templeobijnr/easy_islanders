import { logger } from "@/utils/logger";
import React, { useState, useEffect } from "react";
import {
  MapPin,
  User,
  Phone,
  Navigation,
  Star,
  Loader2,
  Clock,
} from "lucide-react";
import { db } from "../../../services/firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";
import { formatFixed } from "../../../utils/formatters";

interface TaxiRequest {
  id: string;
  status: "pending" | "assigned" | "en_route" | "completed" | "cancelled";
  pickup: {
    address: string;
    location: {
      lat: number;
      lng: number;
      district: string;
    };
  };
  dropoff: {
    address: string;
  };
  customerName: string;
  customerPhone: string;
  assignedDriverId?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleType?: string;
  rating?: number;
  createdAt: any;
  assignedAt?: any;
}

const TaxiStatusCard: React.FC<{ requestId: string }> = ({ requestId }) => {
  const [request, setRequest] = useState<TaxiRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!requestId) return;

    logger.debug(`🚕 [TaxiStatusCard] Listening to request: ${requestId}`);

    // Real-time listener for taxi request
    const unsubscribe = onSnapshot(
      doc(db, "taxi_requests", requestId),
      (doc) => {
        if (doc.exists()) {
          const data = { id: doc.id, ...doc.data() } as TaxiRequest;
          logger.debug(`🚕 [TaxiStatusCard] Request update:`, data.status);
          setRequest(data);
        } else {
          console.warn(`🚕 [TaxiStatusCard] Request not found: ${requestId}`);
        }
        setLoading(false);
      },
      (error) => {
        console.error("🚕 [TaxiStatusCard] Error listening to request:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [requestId]);

  if (loading) {
    return (
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-lg my-4 overflow-hidden animate-in fade-in">
        <div className="p-8 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-500 mb-3" />
          <p className="text-sm text-slate-500">Loading taxi status...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return null;
  }

  // PENDING STATE - Waiting for driver
  if (request.status === "pending") {
    return (
      <div className="w-full max-w-sm bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200 shadow-lg my-4 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
        {/* Animated Header */}
        <div className="h-32 bg-gradient-to-br from-amber-400 to-orange-500 relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {/* Pulsing circles */}
              <div className="absolute inset-0 animate-ping">
                <div className="w-16 h-16 rounded-full bg-white/30"></div>
              </div>
              <div className="relative z-10 w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                <Clock className="w-8 h-8 text-amber-600 animate-pulse" />
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
            <div className="flex items-center gap-2 text-white">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-bold">Searching for driver...</span>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="mb-4">
            <h3 className="font-bold text-lg text-slate-900 mb-1">
              📡 Broadcasting Request
            </h3>
            <p className="text-sm text-slate-600">
              We've sent your request to nearby drivers
            </p>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-amber-100">
              <MapPin className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500 mb-1">Pickup</div>
                <div className="text-sm font-medium text-slate-900 truncate">
                  {request.pickup.address}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-amber-100">
              <Navigation className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500 mb-1">Destination</div>
                <div className="text-sm font-medium text-slate-900 truncate">
                  {request.dropoff.address}
                </div>
              </div>
            </div>
          </div>

          {/* Animated waiting indicator */}
          <div className="flex items-center justify-center gap-2 py-3 px-4 bg-white rounded-xl border border-amber-200">
            <div className="flex gap-1">
              <div
                className="w-2 h-2 rounded-full bg-amber-500 animate-bounce"
                style={{ animationDelay: "0ms" }}
              ></div>
              <div
                className="w-2 h-2 rounded-full bg-amber-500 animate-bounce"
                style={{ animationDelay: "150ms" }}
              ></div>
              <div
                className="w-2 h-2 rounded-full bg-amber-500 animate-bounce"
                style={{ animationDelay: "300ms" }}
              ></div>
            </div>
            <span className="text-sm text-slate-600 font-medium">
              Waiting for driver to accept...
            </span>
          </div>

          <div className="mt-4 text-center text-xs text-slate-400">
            Request #{request.id.slice(-6).toUpperCase()}
          </div>
        </div>
      </div>
    );
  }

  // ASSIGNED STATE - Driver accepted
  const mapsUrl = `https://www.google.com/maps?q=${request.pickup.location.lat},${request.pickup.location.lng}`;

  return (
    <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-lg my-4 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
      {/* Map Header */}
      <div className="h-32 bg-gradient-to-br from-teal-400 to-blue-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2674&auto=format&fit=crop')] bg-cover bg-center opacity-30"></div>
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
          <div className="flex items-center gap-2 text-white">
            <div className="animate-bounce">
              <MapPin
                size={24}
                className="fill-green-400 text-green-400 drop-shadow-md"
              />
            </div>
            <span className="text-sm font-bold">✅ Driver Assigned</span>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-lg text-slate-900">
              {request.vehicleType || "Taxi"}
            </h3>
            <p className="text-sm text-slate-500">On the way to you</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-teal-600">~5 min</div>
            <div className="text-xs text-slate-400">ETA</div>
          </div>
        </div>

        {/* Driver Info */}
        <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-100 to-blue-100 flex items-center justify-center">
            <User size={20} className="text-teal-600" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm text-slate-900">
              {request.driverName || "Unknown"}
            </div>
            <div className="flex items-center gap-1 text-xs text-yellow-500">
              <Star size={10} className="fill-yellow-500" />
              {typeof request.rating === "number"
                ? `${formatFixed(request.rating, 1)} Rating`
                : "N/A"}
            </div>
          </div>
          {request.driverPhone && (
            <a
              href={`tel:${request.driverPhone}`}
              className="p-2 bg-white rounded-full shadow-sm hover:bg-green-50 text-green-600 transition-colors"
            >
              <Phone size={18} />
            </a>
          )}
        </div>

        {/* Trip Details */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
            <span className="text-slate-500">Passenger</span>
            <span className="font-medium">{request.customerName}</span>
          </div>
          <div className="flex justify-between text-sm pb-2">
            <span className="text-slate-500">Contact</span>
            <span className="font-medium">{request.customerPhone}</span>
          </div>
        </div>

        {/* Route Info */}
        <div className="space-y-2 mb-4 p-3 bg-slate-50 rounded-xl">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-500">From</div>
              <div className="text-sm font-medium text-slate-900 truncate">
                {request.pickup.address}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Navigation className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-500">To</div>
              <div className="text-sm font-medium text-slate-900 truncate">
                {request.dropoff.address}
              </div>
            </div>
          </div>
        </div>

        {/* Track Button */}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <Navigation size={18} /> Track on Google Maps
        </a>

        <div className="mt-3 text-center text-xs text-slate-400">
          Request #{request.id.slice(-6).toUpperCase()}
        </div>
      </div>
    </div>
  );
};

export default TaxiStatusCard;
