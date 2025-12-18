/**
 * Merchant Jobs Page
 *
 * Displays jobs for the merchant to accept/decline.
 * Mobile-first, minimal UI.
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getMerchantSession,
  getMerchantJobs,
  acceptJob,
  declineJob,
  type MerchantJob,
} from "../../services/merchantApi";
import { formatDate } from "../../utils/formatters";

// Inline helper to avoid @askmerve/shared dependency in frontend
function createGoogleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

// =============================================================================
// ACTION TYPE ICONS
// =============================================================================

const ACTION_ICONS: Record<string, string> = {
  taxi: "🚕",
  order_food: "🍔",
  order_water_gas: "💧",
  order_grocery: "🛒",
  reserve_table: "🍽️",
  book_service: "💆",
  request_service: "🔧",
  book_activity: "🎯",
  book_stay: "🏨",
  inquire: "❓",
};

const ACTION_LABELS: Record<string, string> = {
  taxi: "Taxi Request",
  order_food: "Food Order",
  order_water_gas: "Water/Gas Order",
  order_grocery: "Grocery Order",
  reserve_table: "Table Reservation",
  book_service: "Service Booking",
  request_service: "Service Request",
  book_activity: "Activity Booking",
  book_stay: "Stay Booking",
  inquire: "Inquiry",
};

// =============================================================================
// JOB CARD COMPONENT
// =============================================================================

interface JobCardProps {
  job: MerchantJob;
  onAccept: () => void;
  onDecline: () => void;
  loading: boolean;
}

const JobCard: React.FC<JobCardProps> = ({
  job,
  onAccept,
  onDecline,
  loading,
}) => {
  const icon = ACTION_ICONS[job.actionType] || "📋";
  const label = ACTION_LABELS[job.actionType] || job.actionType;

  // Extract location if available
  const location =
    job.actionData?.pickupLocation ||
    job.actionData?.deliveryLocation ||
    job.actionData?.location;
  const coords = location?.coordinates;
  const mapLink = coords ? createGoogleMapsLink(coords.lat, coords.lng) : null;

  // Format time
  const createdAt = new Date(job.createdAt);
  const timeAgo = getTimeAgo(createdAt);

  // Build summary based on action type
  const summary = buildSummary(job);

  return (
    <div className="bg-slate-800 rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{icon}</span>
          <div>
            <h3 className="font-semibold text-white">{label}</h3>
            <p className="text-sm text-slate-400">
              #{job.jobCode} · {timeAgo}
            </p>
          </div>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${getStatusStyle(job.status)}`}
        >
          {job.status}
        </span>
      </div>

      {/* Summary */}
      <div className="text-slate-300 text-sm space-y-1">
        {summary.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>

      {/* Map Link */}
      {mapLink && (
        <a
          href={mapLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          View on Google Maps
        </a>
      )}

      {/* Action Buttons */}
      {job.status === "dispatched" && (
        <div className="flex gap-3 pt-2">
          <button
            onClick={onDecline}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors disabled:opacity-50"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50"
          >
            Accept
          </button>
        </div>
      )}

      {/* Confirmed/Cancelled State */}
      {job.status === "confirmed" && (
        <div className="text-center py-2 rounded-lg bg-emerald-500/20 text-emerald-400 font-medium">
          ✓ Accepted
        </div>
      )}
      {job.status === "cancelled" && (
        <div className="text-center py-2 rounded-lg bg-red-500/20 text-red-400 font-medium">
          ✗ Declined
        </div>
      )}
    </div>
  );
};

// =============================================================================
// HELPERS
// =============================================================================

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getStatusStyle(status: string): string {
  switch (status) {
    case "dispatched":
      return "bg-amber-500/20 text-amber-400";
    case "confirmed":
      return "bg-emerald-500/20 text-emerald-400";
    case "cancelled":
      return "bg-red-500/20 text-red-400";
    default:
      return "bg-slate-600 text-slate-300";
  }
}

function buildSummary(job: MerchantJob): string[] {
  const lines: string[] = [];
  const data = job.actionData;

  if (data.items && Array.isArray(data.items)) {
    const itemList = data.items
      .map((i: any) => `${i.quantity}x ${i.name}`)
      .join(", ");
    lines.push(`📦 ${itemList}`);
  }

  if (data.passengerCount) {
    lines.push(`👥 ${data.passengerCount} passengers`);
  }

  if (data.guestCount) {
    lines.push(`👥 ${data.guestCount} guests`);
  }

  if (data.dateTime) {
    lines.push(`📅 ${formatDate(data.dateTime)}`);
  }

  if (data.pickupLocation?.address) {
    lines.push(`📍 From: ${data.pickupLocation.address}`);
  }

  if (data.dropoffLocation?.address) {
    lines.push(`📍 To: ${data.dropoffLocation.address}`);
  }

  if (data.deliveryLocation?.address) {
    lines.push(`📍 Deliver to: ${data.deliveryLocation.address}`);
  }

  if (data.message) {
    lines.push(`💬 "${data.message}"`);
  }

  if (data.notes) {
    lines.push(`📝 ${data.notes}`);
  }

  return lines.length > 0 ? lines : ["No additional details"];
}

// =============================================================================
// MAIN PAGE
// =============================================================================

const MerchantJobs: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<MerchantJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const session = getMerchantSession();

  useEffect(() => {
    if (!session) {
      navigate("/m", { replace: true });
      return;
    }

    getMerchantJobs()
      .then(setJobs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [navigate, session]);

  const handleAccept = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      const updated = await acceptJob(jobId);
      setJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)));
    } catch (err: any) {
      alert(err.message || "Failed to accept job");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      const updated = await declineJob(jobId);
      setJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)));
    } catch (err: any) {
      alert(err.message || "Failed to decline job");
    } finally {
      setActionLoading(null);
    }
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Your Jobs</h1>
            <p className="text-sm text-slate-400">Merchant Portal</p>
          </div>
          <div className="text-right text-xs text-slate-500">
            Listing: {session.listingId.slice(0, 8)}...
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto p-4 space-y-4">
        {loading && (
          <div className="text-center py-12 text-slate-400">
            <div className="animate-pulse">Loading jobs...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 text-red-400 rounded-lg p-4 text-center">
            {error}
          </div>
        )}

        {!loading && !error && jobs.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p className="text-4xl mb-4">📭</p>
            <p>No jobs yet</p>
            <p className="text-sm">New requests will appear here</p>
          </div>
        )}

        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onAccept={() => handleAccept(job.id)}
            onDecline={() => handleDecline(job.id)}
            loading={actionLoading === job.id}
          />
        ))}
      </main>
    </div>
  );
};

export default MerchantJobs;
