/**
 * TeachAgentModule — Redesigned "Upload First" Experience
 *
 * Core principle: Never ask to "describe your business"
 * Let them show what they have. They confirm, not invent.
 *
 * Options clearly presented:
 * 1. Upload menu photos/PDFs
 * 2. Import from website/Yemek Sepeti/FeedMe Cyprus
 * 3. Add items manually (one by one)
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload,
  Globe,
  Plus,
  ChevronRight,
  Loader2,
  CheckCircle,
  AlertCircle,
  Image,
  FileText,
  Link2,
  X,
  Sparkles,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getStorage, ref, uploadBytes } from "firebase/storage";
import { logger } from "../../utils/logger";
import { v1ApiUrl } from "../../config/api";

// Types
interface KnowledgeDoc {
  id: string;
  sourceName: string;
  sourceType: string;
  status: "processing" | "active" | "failed" | "disabled";
  chunkCount: number;
}

interface ManualItem {
  name: string;
  type: "product" | "service";
  price: string;
  note: string;
}

const TeachAgentModule = () => {
  const {
    firebaseUser,
    claims,
    logout,
    forceRefreshToken,
    isLoading: authLoading,
  } = useAuth();
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false); // Prevent duplicate fetches

  // Error state with structured info
  const [error, setError] = useState<{
    title: string;
    detail: string;
    action?: string;
    code?: string;
  } | null>(null);

  // View states
  const [activeView, setActiveView] = useState<
    "options" | "upload" | "url" | "manual" | "review"
  >("options");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [manualItems, setManualItems] = useState<ManualItem[]>([
    { name: "", type: "product", price: "", note: "" },
  ]);
  const [extractedCount, setExtractedCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const businessId = claims?.businessId ?? null;

  const ownerApiUrl = (path: string) => {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return v1ApiUrl(`/owner${normalized}`);
  };

  const getAuthToken = async () => {
    if (!firebaseUser) return null;
    return firebaseUser.getIdToken();
  };

  // Wait for auth/claims and enforce V1 requirements
  useEffect(() => {
    if (authLoading) return;

    if (!firebaseUser) {
      setError({
        title: "Session expired",
        detail: "Please log in again.",
        action: "Login",
        code: "UNAUTHORIZED",
      });
      setIsLoading(false);
      return;
    }

    if (claims?.role !== "owner" || !businessId) {
      setError({
        title: "Business not claimed",
        detail:
          "This account is not a claimed business owner. Complete the claim flow to get access.",
        action: "Retry",
        code: "NO_BUSINESS_CLAIM",
      });
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsLoading(false);
  }, [authLoading, firebaseUser, claims, businessId]);

  // Load docs only after businessId is set (and only once)
  useEffect(() => {
    if (!businessId || loaded) return;
    setLoaded(true);
    loadDocs();
  }, [businessId, loaded]);

  // Poll for processing docs
  useEffect(() => {
    const processingDocs = docs.filter((d) => d.status === "processing");
    if (processingDocs.length === 0) return;
    const interval = setInterval(loadDocs, 3000);
    return () => clearInterval(interval);
  }, [docs]);

  const loadDocs = useCallback(async () => {
    if (!businessId) return;
    try {
      const token = await getAuthToken();
      logger.debug("[TeachAgent] Loading knowledge docs", {
        hasToken: !!token,
      });

      const response = await fetch(ownerApiUrl("/knowledge-docs"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setDocs(data.docs || []);
        setError(null);
      } else if (response.status === 401) {
        // Not logged in
        setError({
          title: "Session expired",
          detail: "Please log in again.",
          action: "Login",
          code: "UNAUTHORIZED",
        });
      } else if (response.status === 403) {
        // Try auto-refresh once
        logger.debug("[TeachAgent] Got 403, attempting token refresh");
        await forceRefreshToken();
        const retryToken = await getAuthToken();
        const retryResponse = await fetch(ownerApiUrl("/knowledge-docs"), {
          headers: { Authorization: `Bearer ${retryToken}` },
        });
        if (retryResponse.ok) {
          const data = await retryResponse.json();
          setDocs(data.docs || []);
          setError(null);
        } else {
          const err = await retryResponse.json();
          setError({
            title: "Access denied",
            detail:
              err.hint ||
              err.error ||
              "You may need to re-claim this business.",
            action: "Retry",
            code: err.code,
          });
        }
      } else if (response.status === 400) {
        const err = await response.json();
        setError({
          title: "Request error",
          detail: err.hint || err.error,
          action: "Retry",
        });
      }
    } catch (err: any) {
      logger.error("[TeachAgent] Failed to load docs", {
        message: err?.message,
      });
      setError({
        title: "Couldn't load knowledge",
        detail: err?.message || "Network error. Check your connection.",
        action: "Retry",
      });
    }
  }, [firebaseUser, businessId]);

  // Handle file upload
  const handleFileUpload = async (files: File[]) => {
    if (!businessId || files.length === 0) return;
    setIsSubmitting(true);
    let successCount = 0;

    try {
      const token = await getAuthToken();
      const storage = getStorage();

      for (const file of files) {
        // Determine source type
        const isImage = file.type.startsWith("image/");
        const isPdf = file.type === "application/pdf";
        const isText =
          file.type.startsWith("text/") ||
          (file.name.split(".").pop() || "").toLowerCase() === "txt";

        if (!isImage && !isPdf && !isText) {
          setError({
            title: "Unsupported file type",
            detail: `Please upload an image, PDF, or text file. (${file.name})`,
          });
          continue;
        }

        let response: Response;

        if (isText) {
          const text = await file.text();
          response = await fetch(ownerApiUrl("/knowledge-docs"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              sourceType: "text",
              sourceName: file.name,
              text,
            }),
          });
        } else {
          const docId = crypto.randomUUID();
          const ext = file.name.split(".").pop() || "bin";
          const filePath = `businesses/${businessId}/knowledge/${docId}/original.${ext}`;

          // Upload to Storage
          const storageRef = ref(storage, filePath);
          await uploadBytes(storageRef, file);

          response = await fetch(ownerApiUrl("/knowledge-docs"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              sourceType: isImage ? "image" : "pdf",
              sourceName: file.name,
              filePath,
              mimeType: file.type,
            }),
          });
        }

        if (response.ok) successCount++;
      }

      setExtractedCount(successCount);
      setActiveView("review");
      await loadDocs();
    } catch (error) {
      logger.error("[TeachAgent] Upload failed", {
        message: (error as any)?.message,
      });
      alert("Upload failed. Please try again.");
    } finally {
      setIsSubmitting(false);
      setUploadedFiles([]);
    }
  };

  // Handle URL import
  const handleUrlImport = async () => {
    if (!urlInput.trim()) return;
    setIsSubmitting(true);

    try {
      const token = await getAuthToken();
      let hostname = "Website";
      try {
        hostname = new URL(urlInput).hostname.replace("www.", "");
      } catch {}

      const response = await fetch(ownerApiUrl("/knowledge-docs"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sourceType: "url",
          sourceName: hostname,
          sourceUrl: urlInput,
        }),
      });

      if (response.ok) {
        setExtractedCount(1);
        setActiveView("review");
        setUrlInput("");
        await loadDocs();
      } else {
        const err = await response.json();
        alert(err.error || "Failed to import from URL");
      }
    } catch (error) {
      logger.error("[TeachAgent] URL import failed", {
        message: (error as any)?.message,
      });
      alert("Invalid URL format");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle manual items save
  const handleSaveManualItems = async () => {
    const validItems = manualItems.filter((i) => i.name.trim());
    if (validItems.length === 0) return;
    setIsSubmitting(true);

    try {
      const token = await getAuthToken();
      const text = validItems
        .map((item) => {
          let line = `${item.type === "service" ? "Service" : "Product"}: ${item.name}`;
          if (item.price) line += ` — ${item.price}`;
          if (item.note) line += ` (${item.note})`;
          return line;
        })
        .join("\n");

      const response = await fetch(ownerApiUrl("/knowledge-docs"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sourceType: "text",
          sourceName: "Products & Services",
          text,
        }),
      });

      if (response.ok) {
        setExtractedCount(validItems.length);
        setActiveView("review");
        setManualItems([{ name: "", type: "product", price: "", note: "" }]);
        await loadDocs();
      }
    } catch (error) {
      logger.error("[TeachAgent] Save failed", {
        message: (error as any)?.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add manual item
  const addManualItem = () => {
    setManualItems([
      ...manualItems,
      { name: "", type: "product", price: "", note: "" },
    ]);
  };

  const updateManualItem = (
    index: number,
    field: keyof ManualItem,
    value: string,
  ) => {
    const updated = [...manualItems];
    updated[index] = { ...updated[index], [field]: value };
    setManualItems(updated);
  };

  // Stats
  const activeDocsCount = docs.filter((d) => d.status === "active").length;
  const processingCount = docs.filter((d) => d.status === "processing").length;
  const hasKnowledge = docs.length > 0;

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  // =====================
  // MAIN OPTIONS VIEW
  // =====================
  if (activeView === "options") {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle
                className="text-red-500 flex-shrink-0 mt-0.5"
                size={20}
              />
              <div className="flex-1">
                <h3 className="font-bold text-red-800">{error.title}</h3>
                <p className="text-red-700 text-sm">{error.detail}</p>
                <div className="flex gap-3 mt-3">
                  {error.action === "Retry" && (
                    <button
                      onClick={() => {
                        setError(null);
                        setLoaded(false); // Allow refetch
                      }}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
                    >
                      Try Again
                    </button>
                  )}
                  {error.action === "Login" && (
                    <button
                      onClick={logout}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                    >
                      Login
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Teach your agent using what you already have
          </h1>
          <p className="text-slate-600">
            You don't need to write anything from scratch. Upload a menu, paste
            a link, or add items one by one.
          </p>
        </div>

        {/* Option Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {/* Upload */}
          <button
            onClick={() => setActiveView("upload")}
            className="p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-purple-400 hover:shadow-lg transition-all text-left group"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
              <Upload className="text-purple-600" size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Upload Menu or Price List
            </h3>
            <p className="text-slate-500 text-sm">
              Photos, PDFs, or any document with your offerings
            </p>
          </button>

          {/* URL Import */}
          <button
            onClick={() => setActiveView("url")}
            className="p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-purple-400 hover:shadow-lg transition-all text-left group"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
              <Globe className="text-blue-600" size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Import from Website
            </h3>
            <p className="text-slate-500 text-sm">
              Your website, Yemek Sepeti, or FeedMe Cyprus
            </p>
          </button>

          {/* Manual Entry */}
          <button
            onClick={() => setActiveView("manual")}
            className="p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-purple-400 hover:shadow-lg transition-all text-left group"
          >
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
              <Plus className="text-green-600" size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Add Items Manually
            </h3>
            <p className="text-slate-500 text-sm">
              Type your products or services one by one
            </p>
          </button>

          {/* Skip */}
          <div className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-100 text-left">
            <h3 className="text-lg font-medium text-slate-600 mb-1">
              Not ready yet?
            </h3>
            <p className="text-slate-400 text-sm mb-3">
              Your agent will still work — it'll capture customer contact
              details when it can't answer.
            </p>
            <span className="text-purple-600 text-sm font-medium">
              You can always come back later →
            </span>
          </div>
        </div>

        {/* What's Already Uploaded */}
        {hasKnowledge && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <CheckCircle className="text-green-500" size={20} />
              What Your Agent Already Knows
            </h3>
            <div className="space-y-2">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    {doc.status === "processing" && (
                      <Loader2
                        className="animate-spin text-amber-500"
                        size={16}
                      />
                    )}
                    {doc.status === "active" && (
                      <CheckCircle className="text-green-500" size={16} />
                    )}
                    {doc.status === "failed" && (
                      <AlertCircle className="text-red-500" size={16} />
                    )}
                    <span className="text-slate-700">{doc.sourceName}</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {doc.status === "processing"
                      ? "Processing..."
                      : `${doc.chunkCount} items`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reassurance */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>
            💡 Your agent doesn't need to be perfect. When it's unsure, it asks
            customers for their contact details.
          </p>
        </div>
      </div>
    );
  }

  // =====================
  // UPLOAD VIEW
  // =====================
  if (activeView === "upload") {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <button
          onClick={() => setActiveView("options")}
          className="text-slate-500 hover:text-slate-700 mb-6 flex items-center gap-1"
        >
          ← Back to options
        </button>

        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Upload Menu or Price List
        </h2>
        <p className="text-slate-600 mb-6">
          Take a photo of your menu, or upload a PDF. We'll extract the items
          automatically.
        </p>

        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
            uploadedFiles.length > 0
              ? "border-purple-400 bg-purple-50"
              : "border-slate-200 hover:border-slate-300 bg-white"
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.txt"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              setUploadedFiles(files);
            }}
          />
          {uploadedFiles.length > 0 ? (
            <div>
              <CheckCircle className="mx-auto text-purple-600 mb-4" size={48} />
              <p className="text-lg font-medium text-slate-800">
                {uploadedFiles.length} file(s) selected
              </p>
              <p className="text-slate-500 text-sm mt-1">
                {uploadedFiles.map((f) => f.name).join(", ")}
              </p>
            </div>
          ) : (
            <div>
              <div className="flex justify-center gap-4 mb-4">
                <Image className="text-slate-300" size={40} />
                <FileText className="text-slate-300" size={40} />
              </div>
              <p className="text-lg font-medium text-slate-700">
                Drop files here or click to upload
              </p>
              <p className="text-slate-400 text-sm mt-1">
                Photos, PDFs, or documents
              </p>
            </div>
          )}
        </div>

        {/* Upload Button */}
        {uploadedFiles.length > 0 && (
          <button
            onClick={() => handleFileUpload(uploadedFiles)}
            disabled={isSubmitting}
            className="w-full mt-6 bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Uploading...
              </>
            ) : (
              <>
                Upload & Extract Items
                <ChevronRight size={20} />
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  // =====================
  // URL IMPORT VIEW
  // =====================
  if (activeView === "url") {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <button
          onClick={() => setActiveView("options")}
          className="text-slate-500 hover:text-slate-700 mb-6 flex items-center gap-1"
        >
          ← Back to options
        </button>

        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Import from Website
        </h2>
        <p className="text-slate-600 mb-6">
          Paste your website URL, Yemek Sepeti link, or FeedMe Cyprus page.
          We'll extract your menu and prices.
        </p>

        {/* URL Input */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Link2 className="text-slate-400" size={24} />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://yourwebsite.com or yemeksepeti.com/..."
              className="flex-1 text-lg outline-none"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">
              Your website
            </span>
            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">
              Yemek Sepeti
            </span>
            <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">
              FeedMe Cyprus
            </span>
          </div>
        </div>

        {/* Import Button */}
        <button
          onClick={handleUrlImport}
          disabled={!urlInput.trim() || isSubmitting}
          className="w-full mt-6 bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Extracting...
            </>
          ) : (
            <>
              Import & Extract
              <ChevronRight size={20} />
            </>
          )}
        </button>
      </div>
    );
  }

  // =====================
  // MANUAL ENTRY VIEW
  // =====================
  if (activeView === "manual") {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <button
          onClick={() => setActiveView("options")}
          className="text-slate-500 hover:text-slate-700 mb-6 flex items-center gap-1"
        >
          ← Back to options
        </button>

        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Add Products & Services
        </h2>
        <p className="text-slate-600 mb-6">
          Add items one by one. You can always add more later.
        </p>

        {/* Item Forms */}
        <div className="space-y-4">
          {manualItems.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl border border-slate-200 p-4"
            >
              <div className="flex gap-3 mb-3">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) =>
                    updateManualItem(index, "name", e.target.value)
                  }
                  placeholder="Item name (e.g., Haircut, Kebab Plate)"
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-purple-400"
                />
                <input
                  type="text"
                  value={item.price}
                  onChange={(e) =>
                    updateManualItem(index, "price", e.target.value)
                  }
                  placeholder="Price"
                  className="w-24 px-4 py-2 rounded-xl border border-slate-200 outline-none focus:border-purple-400"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={item.type === "product"}
                    onChange={() => updateManualItem(index, "type", "product")}
                    className="accent-purple-600"
                  />
                  <span className="text-sm text-slate-600">Product</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={item.type === "service"}
                    onChange={() => updateManualItem(index, "type", "service")}
                    className="accent-purple-600"
                  />
                  <span className="text-sm text-slate-600">Service</span>
                </label>
              </div>
            </div>
          ))}
        </div>

        {/* Add Another */}
        <button
          onClick={addManualItem}
          className="w-full mt-4 py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:border-purple-400 hover:text-purple-600 flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          Add Another Item
        </button>

        {/* Save Button */}
        <button
          onClick={handleSaveManualItems}
          disabled={!manualItems.some((i) => i.name.trim()) || isSubmitting}
          className="w-full mt-6 bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Saving...
            </>
          ) : (
            <>
              Save Items
              <ChevronRight size={20} />
            </>
          )}
        </button>
      </div>
    );
  }

  // =====================
  // REVIEW/SUCCESS VIEW
  // =====================
  if (activeView === "review") {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Sparkles className="text-green-600" size={40} />
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {processingCount > 0
            ? "Processing your upload..."
            : "Your agent is learning!"}
        </h2>
        <p className="text-slate-600 mb-8">
          {processingCount > 0
            ? "We're extracting items from your upload. This usually takes a minute."
            : `We've added ${extractedCount} source${extractedCount !== 1 ? "s" : ""} to your agent's knowledge.`}
        </p>

        {/* Status */}
        {processingCount > 0 && (
          <div className="flex items-center justify-center gap-3 mb-8">
            <Loader2 className="animate-spin text-purple-600" size={24} />
            <span className="text-slate-600">
              {processingCount} item(s) processing...
            </span>
          </div>
        )}

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => setActiveView("options")}
            className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700"
          >
            Add More
          </button>
          <button
            onClick={() => (window.location.href = "/dashboard")}
            className="px-6 py-3 border border-slate-200 rounded-xl font-medium hover:bg-slate-50"
          >
            Done for Now
          </button>
        </div>

        {/* Reassurance */}
        <p className="mt-8 text-sm text-slate-500">
          💡 Your agent will start answering questions based on this info. When
          it's unsure, it captures contact details.
        </p>
      </div>
    );
  }

  return null;
};

export default TeachAgentModule;
