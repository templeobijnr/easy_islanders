import React, { useState, useEffect } from "react";
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Loader2,
  DollarSign,
  Tag,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { StorageService } from "../../services/storageService";
import { formatFixed } from "../../utils/formatters";
import { v1ApiUrl } from "../../config/api";

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  category: string;
  available: boolean;
}

const CATEGORIES = [
  { value: "food", label: "🍽️ Food" },
  { value: "drink", label: "🍷 Drinks" },
  { value: "service", label: "✨ Services" },
  { value: "room", label: "🛏️ Rooms" },
  { value: "experience", label: "🎯 Experiences" },
  { value: "rental", label: "🚗 Rentals" },
  { value: "other", label: "📦 Other" },
];

const ProductsModule = () => {
  const { firebaseUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    currency: "EUR",
    category: "service",
    available: true,
  });

  useEffect(() => {
    loadBusinessAndProducts();
  }, []);

  const getAuthToken = async (): Promise<string | null> => {
    if (!firebaseUser) return null;
    return firebaseUser.getIdToken();
  };

  const loadBusinessAndProducts = async () => {
    setIsLoading(true);
    try {
      const config = await StorageService.getBusinessConfig();
      if (config?.id) {
        setBusinessId(config.id);
        await loadProducts(config.id);
      }
    } catch (error) {
      console.error("Failed to load products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProducts = async (bizId: string) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(v1ApiUrl(`/products/${bizId}`), {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  const handleSave = async () => {
    if (!businessId || !formData.name || !formData.price) return;

    try {
      const token = await getAuthToken();
      const url = editingId
        ? v1ApiUrl(`/products/${businessId}/${editingId}`)
        : v1ApiUrl(`/products/${businessId}`);

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
        }),
      });

      if (response.ok) {
        await loadProducts(businessId);
        resetForm();
      }
    } catch (error) {
      console.error("Failed to save product:", error);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!businessId || !confirm("Delete this product?")) return;

    try {
      const token = await getAuthToken();
      await fetch(v1ApiUrl(`/products/${businessId}/${productId}`), {
        method: "DELETE",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      await loadProducts(businessId);
    } catch (error) {
      console.error("Failed to delete product:", error);
    }
  };

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      currency: product.currency,
      category: product.category,
      available: product.available,
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      currency: "EUR",
      category: "service",
      available: true,
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const groupedProducts = products.reduce(
    (acc, product) => {
      const cat = product.category || "other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(product);
      return acc;
    },
    {} as Record<string, Product[]>,
  );

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="text-slate-400" /> Products & Services
          </h2>
          <p className="text-slate-500 mt-1">
            Define what your business offers. The agent uses this to quote
            prices.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800"
        >
          <Plus size={18} /> Add Product
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-lg mb-4">
            {editingId ? "Edit Product" : "New Product"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., VIP Sunbed, Mojito, Massage"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Price *
                </label>
                <div className="relative">
                  <DollarSign
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    placeholder="0.00"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="w-24">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value })
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="EUR">€ EUR</option>
                  <option value="USD">$ USD</option>
                  <option value="GBP">£ GBP</option>
                  <option value="TRY">₺ TRY</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optional details"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              checked={formData.available}
              onChange={(e) =>
                setFormData({ ...formData, available: e.target.checked })
              }
              className="w-4 h-4 accent-blue-600"
            />
            <label className="text-sm text-slate-700">
              Available for booking
            </label>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              disabled={!formData.name || !formData.price}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={18} /> {editingId ? "Update" : "Save"}
            </button>
            <button
              onClick={resetForm}
              className="bg-slate-100 text-slate-700 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-200"
            >
              <X size={18} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Products List */}
      {products.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
          <Package size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700 mb-2">
            No Products Yet
          </h3>
          <p className="text-slate-500 mb-4">
            Add your products and services so the AI agent can quote accurate
            prices.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold"
          >
            Add First Product
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedProducts).map(([category, items]) => (
            <div
              key={category}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
            >
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <Tag size={16} />
                  {CATEGORIES.find((c) => c.value === category)?.label ||
                    category}
                  <span className="text-slate-400 font-normal text-sm">
                    ({items.length})
                  </span>
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {items.map((product) => (
                  <div
                    key={product.id}
                    className="px-6 py-4 flex items-center justify-between group hover:bg-slate-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-bold ${!product.available ? "text-slate-400 line-through" : "text-slate-900"}`}
                        >
                          {product.name}
                        </span>
                        {!product.available && (
                          <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                            Unavailable
                          </span>
                        )}
                      </div>
                      {product.description && (
                        <p className="text-sm text-slate-500 mt-0.5">
                          {product.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-slate-900">
                        {product.currency}{" "}
                        {formatFixed(
                          typeof product.price === "number"
                            ? product.price
                            : null,
                          2,
                        )}
                      </span>
                      <div className="opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
                        <button
                          onClick={() => startEdit(product)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductsModule;
