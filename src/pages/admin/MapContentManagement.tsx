import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  MapPin,
  Eye,
  EyeOff,
  Star,
  Search,
  RefreshCw,
  Filter,
  X,
  Check,
  Phone,
  Globe,
  Instagram,
  ChevronDown,
  Upload,
} from "lucide-react";
import { formatFixed } from "../../utils/formatters";
import { v1ApiUrl } from "../../config/api";

interface Place {
  id: string;
  cityId: string;
  name: string;
  category: string;
  coordinates: { lat: number; lng: number };
  address?: string;
  areaName?: string;
  descriptionShort?: string;
  descriptionLong?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  instagram?: string;
  tags?: string[];
  bookingType?: string;
  bookingTarget?: string;
  actions?: {
    taxiEnabled: boolean;
    reservationsEnabled: boolean;
    activityBookingEnabled: boolean;
    serviceTypes?: string[];
  };
  isFeatured?: boolean;
  isActive: boolean;
  createdAt?: string;
  createdBy?: string;
}

const CATEGORIES = [
  { value: "food", label: "Food & Restaurants" },
  { value: "nightlife", label: "Nightlife & Bars" },
  { value: "cafe", label: "Cafes" },
  { value: "sight", label: "Sights & Attractions" },
  { value: "co_working", label: "Co-Working Spaces" },
  { value: "shopping", label: "Shopping" },
  { value: "service", label: "Services" },
  { value: "housing_project", label: "Housing Projects" },
  { value: "other", label: "Other" },
];

const MapContentManagement: React.FC = () => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [showModal, setShowModal] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);

  const fetchPlaces = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ cityId: "north-cyprus" });
      if (filterCategory !== "all") params.append("category", filterCategory);

      const res = await fetch(v1ApiUrl(`/places?${params}`));
      const data = await res.json();

      if (data.success && data.places) {
        let filtered = data.places;

        // Apply status filter
        if (filterStatus === "active") {
          filtered = filtered.filter((p: Place) => p.isActive);
        } else if (filterStatus === "inactive") {
          filtered = filtered.filter((p: Place) => !p.isActive);
        }

        // Apply search
        if (searchQuery) {
          filtered = filtered.filter(
            (p: Place) =>
              p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.areaName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.address?.toLowerCase().includes(searchQuery.toLowerCase()),
          );
        }

        setPlaces(filtered);
      }
    } catch (error) {
      console.error("Failed to fetch places:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaces();
  }, [filterCategory, filterStatus]);

  const handleSearch = () => {
    fetchPlaces();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this place?")) return;

    try {
      const res = await fetch(v1ApiUrl(`/places/${id}`), {
        method: "DELETE",
      });

      if (res.ok) {
        setPlaces(places.filter((p) => p.id !== id));
      } else {
        alert("Failed to delete place");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete place");
    }
  };

  const handleToggleFeatured = async (place: Place) => {
    try {
      const res = await fetch(v1ApiUrl(`/places/${place.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !place.isFeatured }),
      });

      if (res.ok) {
        setPlaces(
          places.map((p) =>
            p.id === place.id ? { ...p, isFeatured: !p.isFeatured } : p,
          ),
        );
      }
    } catch (error) {
      console.error("Toggle featured error:", error);
    }
  };

  const handleToggleActive = async (place: Place) => {
    try {
      const res = await fetch(v1ApiUrl(`/places/${place.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !place.isActive }),
      });

      if (res.ok) {
        setPlaces(
          places.map((p) =>
            p.id === place.id ? { ...p, isActive: !p.isActive } : p,
          ),
        );
      }
    } catch (error) {
      console.error("Toggle active error:", error);
    }
  };

  const openEditModal = (place?: Place) => {
    setEditingPlace(place || null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPlace(null);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      food: "bg-orange-500/10 text-orange-400 border-orange-500/20",
      nightlife: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      cafe: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      sight: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      shopping: "bg-pink-500/10 text-pink-400 border-pink-500/20",
      service: "bg-green-500/10 text-green-400 border-green-500/20",
      co_working: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      housing_project: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
      other: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    };
    return colors[category] || colors["other"];
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Controls */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <MapPin className="text-cyan-400" size={24} />
              Map Content Management
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Manage places, businesses, and activities on the interactive map
            </p>
          </div>
          <button
            onClick={() => openEditModal()}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            Add New Place
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-3 text-slate-500"
              size={18}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search places..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
          <p className="text-sm text-slate-500">
            Showing{" "}
            <span className="text-white font-bold">{places.length}</span> places
          </p>
          <button
            onClick={fetchPlaces}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Places Table */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Place
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    <RefreshCw
                      className="animate-spin mx-auto mb-2"
                      size={24}
                    />
                    Loading places...
                  </td>
                </tr>
              ) : places.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No places found
                  </td>
                </tr>
              ) : (
                places.map((place) => (
                  <tr
                    key={place.id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {place.isFeatured && (
                          <Star
                            size={16}
                            className="text-yellow-400 fill-yellow-400"
                          />
                        )}
                        <div>
                          <div className="font-medium text-white">
                            {place.name}
                          </div>
                          {place.descriptionShort && (
                            <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                              {place.descriptionShort}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold uppercase border ${getCategoryColor(place.category)}`}
                      >
                        {place.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-300">
                        {place.areaName || "N/A"}
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        {typeof place.coordinates?.lat === "number" &&
                        typeof place.coordinates?.lng === "number"
                          ? `${formatFixed(place.coordinates.lat, 4)}, ${formatFixed(place.coordinates.lng, 4)}`
                          : "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {place.phone && (
                          <div
                            className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center"
                            title={place.phone}
                          >
                            <Phone size={12} className="text-slate-400" />
                          </div>
                        )}
                        {place.website && (
                          <div
                            className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center"
                            title={place.website}
                          >
                            <Globe size={12} className="text-slate-400" />
                          </div>
                        )}
                        {place.instagram && (
                          <div
                            className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center"
                            title={place.instagram}
                          >
                            <Instagram size={12} className="text-slate-400" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleToggleActive(place)}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-colors ${
                            place.isActive
                              ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                              : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                          }`}
                        >
                          {place.isActive ? (
                            <Eye size={12} />
                          ) : (
                            <EyeOff size={12} />
                          )}
                          {place.isActive ? "Active" : "Inactive"}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleFeatured(place)}
                          className={`p-2 rounded-lg transition-colors ${
                            place.isFeatured
                              ? "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                          }`}
                          title={
                            place.isFeatured
                              ? "Remove from featured"
                              : "Mark as featured"
                          }
                        >
                          <Star
                            size={16}
                            className={
                              place.isFeatured ? "fill-yellow-400" : ""
                            }
                          />
                        </button>
                        <button
                          onClick={() => openEditModal(place)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                          title="Edit place"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(place.id)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                          title="Delete place"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/Add Modal - Placeholder for now */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={closeModal}
          ></div>
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl p-6 relative z-10 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {editingPlace ? "Edit Place" : "Add New Place"}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="text-center py-12 text-slate-400">
              <p>Place editing form coming soon...</p>
              <p className="text-sm mt-2">
                This will include all fields for creating/editing places
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
              >
                Save Place
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapContentManagement;
