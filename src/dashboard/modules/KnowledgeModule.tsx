import React, { useState, useRef, useEffect } from "react";
import {
  BookOpen,
  Upload,
  FileText,
  Image as ImageIcon,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Link2,
  FileInput,
  PenLine,
  ChevronDown,
  ChevronRight,
  Eye,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { StorageService } from "../../services/storageService";
import { formatDate } from "../../utils/formatters";
import { v1ApiUrl } from "../../config/api";

interface KnowledgeAsset {
  id: string;
  name: string;
  type: "menu" | "price_list" | "policy" | "other";
  fileType: "image" | "pdf" | "text" | "url";
  preview?: string;
  status: "uploading" | "processing" | "ready" | "error";
  chunks?: number;
  chunkData?: { id: string; text: string; preview: string }[];
  uploadedAt: Date;
}

type TabType = "files" | "links" | "text";

const KnowledgeModule = () => {
  const { user, firebaseUser } = useAuth();
  const [assets, setAssets] = useState<KnowledgeAsset[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("files");
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [textTitle, setTextTitle] = useState("");
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAuthToken = async (): Promise<string | null> => {
    if (!firebaseUser) return null;
    return firebaseUser.getIdToken();
  };

  const getBusinessId = async (): Promise<string | null> => {
    const config = await StorageService.getBusinessConfig();
    return config?.id || null;
  };

  // Load existing knowledge assets from Firestore
  const loadAssets = async () => {
    try {
      const businessId = await getBusinessId();
      if (!businessId) {
        setIsLoading(false);
        return;
      }

      const token = await getAuthToken();
      const response = await fetch(v1ApiUrl(`/knowledge/${businessId}`), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      if (!response.ok) {
        console.error("Failed to load knowledge assets");
        setIsLoading(false);
        return;
      }

      const data = await response.json();

      // Convert server assets to local format
      const loadedAssets: KnowledgeAsset[] = data.assets.map((asset: any) => ({
        id: `asset_${asset.source}`,
        name: asset.source,
        type: "other" as const,
        fileType: asset.sourceType as "image" | "pdf" | "text" | "url",
        status: "ready" as const,
        chunks: asset.chunks.length,
        chunkData: asset.chunks,
        uploadedAt: asset.createdAt
          ? new Date(asset.createdAt._seconds * 1000)
          : new Date(),
      }));

      setAssets(loadedAssets);
    } catch (error) {
      console.error("Error loading knowledge assets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load assets on mount
  useEffect(() => {
    loadAssets();
  }, []);

  // Toggle asset expansion to show/hide chunks
  const toggleAssetExpansion = (assetId: string) => {
    setExpandedAssets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(assetId)) {
        newSet.delete(assetId);
      } else {
        newSet.add(assetId);
      }
      return newSet;
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    const businessId = await getBusinessId();
    if (!businessId) {
      alert("Please claim a business first");
      return;
    }

    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";

      // Create preview for images
      let preview: string | undefined;
      if (isImage) {
        preview = URL.createObjectURL(file);
      }

      const newAsset: KnowledgeAsset = {
        id: `asset_${Date.now()}_${i}`,
        name: file.name,
        type: "other",
        fileType: isImage ? "image" : isPdf ? "pdf" : "text",
        preview,
        status: "uploading",
        uploadedAt: new Date(),
      };

      setAssets((prev) => [...prev, newAsset]);

      try {
        // For images, use the image endpoint with base64
        if (isImage) {
          const base64 = await fileToBase64(file);

          setAssets((prev) =>
            prev.map((a) =>
              a.id === newAsset.id
                ? { ...a, status: "processing" as const }
                : a,
            ),
          );

          const token = await getAuthToken();
          const response = await fetch(v1ApiUrl("/knowledge/ingest-image"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
            body: JSON.stringify({
              businessId,
              imageBase64: base64,
              mimeType: file.type,
              source: file.name,
            }),
          });

          const result = await response.json();

          setAssets((prev) =>
            prev.map((a) =>
              a.id === newAsset.id
                ? {
                    ...a,
                    status: result.success
                      ? ("ready" as const)
                      : ("error" as const),
                    chunks: result.chunks,
                  }
                : a,
            ),
          );
        } else {
          // For text/PDF, read as text and use text endpoint
          const text = await file.text();

          setAssets((prev) =>
            prev.map((a) =>
              a.id === newAsset.id
                ? { ...a, status: "processing" as const }
                : a,
            ),
          );

          const token = await getAuthToken();
          const response = await fetch(v1ApiUrl("/knowledge/ingest"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
            body: JSON.stringify({
              businessId,
              content: text,
              source: file.name,
              sourceType: isPdf ? "pdf" : "text",
            }),
          });

          const result = await response.json();

          setAssets((prev) =>
            prev.map((a) =>
              a.id === newAsset.id
                ? {
                    ...a,
                    status: result.success
                      ? ("ready" as const)
                      : ("error" as const),
                    chunks: result.chunks,
                  }
                : a,
            ),
          );
        }
      } catch (err) {
        console.error("Upload failed:", err);
        setAssets((prev) =>
          prev.map((a) =>
            a.id === newAsset.id ? { ...a, status: "error" as const } : a,
          ),
        );
      }
    }

    setIsUploading(false);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:image/xxx;base64, prefix
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
    });
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;

    const businessId = await getBusinessId();
    if (!businessId) {
      alert("Please claim a business first");
      return;
    }

    const newAsset: KnowledgeAsset = {
      id: `asset_${Date.now()}`,
      name: urlInput,
      type: "other",
      fileType: "url",
      status: "processing",
      uploadedAt: new Date(),
    };

    setAssets((prev) => [...prev, newAsset]);
    setUrlInput("");

    try {
      // For now, we'll just store the URL as text content
      // In production, we'd fetch and scrape the URL content
      const token = await getAuthToken();
      const response = await fetch(v1ApiUrl("/knowledge/ingest"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          businessId,
          content: `Website URL: ${urlInput}`,
          source: urlInput,
          sourceType: "url",
        }),
      });

      const result = await response.json();

      setAssets((prev) =>
        prev.map((a) =>
          a.id === newAsset.id
            ? {
                ...a,
                status: result.success
                  ? ("ready" as const)
                  : ("error" as const),
                chunks: result.chunks,
              }
            : a,
        ),
      );
    } catch (err) {
      console.error("URL ingestion failed:", err);
      setAssets((prev) =>
        prev.map((a) =>
          a.id === newAsset.id ? { ...a, status: "error" as const } : a,
        ),
      );
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;

    const businessId = await getBusinessId();
    if (!businessId) {
      alert("Please claim a business first");
      return;
    }

    const newAsset: KnowledgeAsset = {
      id: `asset_${Date.now()}`,
      name: textTitle || "Manual Entry",
      type: "other",
      fileType: "text",
      status: "processing",
      uploadedAt: new Date(),
    };

    setAssets((prev) => [...prev, newAsset]);
    setTextInput("");
    setTextTitle("");

    try {
      const token = await getAuthToken();
      const response = await fetch(v1ApiUrl("/knowledge/ingest"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          businessId,
          content: textInput,
          source: textTitle || "manual_entry",
          sourceType: "text",
        }),
      });

      const result = await response.json();

      setAssets((prev) =>
        prev.map((a) =>
          a.id === newAsset.id
            ? {
                ...a,
                status: result.success
                  ? ("ready" as const)
                  : ("error" as const),
                chunks: result.chunks,
              }
            : a,
        ),
      );
    } catch (err) {
      console.error("Text ingestion failed:", err);
      setAssets((prev) =>
        prev.map((a) =>
          a.id === newAsset.id ? { ...a, status: "error" as const } : a,
        ),
      );
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const removeAsset = (id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  };

  const getStatusBadge = (
    status: KnowledgeAsset["status"],
    chunks?: number,
  ) => {
    switch (status) {
      case "uploading":
        return (
          <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
            <Loader2 size={12} className="animate-spin" /> Uploading
          </span>
        );
      case "processing":
        return (
          <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
            <Loader2 size={12} className="animate-spin" /> Processing
          </span>
        );
      case "ready":
        return (
          <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
            <CheckCircle size={12} /> Ready {chunks ? `(${chunks} chunks)` : ""}
          </span>
        );
      case "error":
        return (
          <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
            <AlertCircle size={12} /> Error
          </span>
        );
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: "files", label: "Files", icon: FileInput },
    { id: "links", label: "Links", icon: Link2 },
    { id: "text", label: "Text", icon: PenLine },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Knowledge Base</h2>
          <p className="text-slate-500 mt-1">
            Train your AI Agent by uploading menus, links, or FAQs.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                activeTab === tab.id
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* File Upload Tab */}
      {activeTab === "files" && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all mb-8 ${
            dragActive
              ? "border-slate-900 bg-slate-50"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt"
            onChange={handleFileInput}
            className="hidden"
          />

          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload size={28} className="text-slate-400" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-2">
            {dragActive ? "Drop files here" : "Upload Knowledge Assets"}
          </h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Drag and drop menus, price lists, or policy documents. Our AI will
            extract the information automatically.
          </p>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors inline-flex items-center gap-2"
          >
            <Upload size={18} />
            Choose Files
          </button>

          <p className="text-xs text-slate-400 mt-4">
            Supports: JPG, PNG, PDF, TXT (max 10MB)
          </p>
        </div>
      )}

      {/* URL Tab */}
      {activeTab === "links" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Link2 size={20} className="text-slate-400" />
            Add Website or Social Link
          </h3>
          <div className="flex gap-3">
            <input
              type="url"
              placeholder="https://your-business.com or Instagram link..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900"
            />
            <button
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim()}
              className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add Link
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            We'll extract content from the page to train your agent.
          </p>
        </div>
      )}

      {/* Text Tab */}
      {activeTab === "text" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <PenLine size={20} className="text-slate-400" />
            Add Text Content Manually
          </h3>
          <input
            type="text"
            placeholder="Title (e.g., FAQs, Special Policies)"
            value={textTitle}
            onChange={(e) => setTextTitle(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 mb-3"
          />
          <textarea
            placeholder="Type or paste your business information here...&#10;&#10;Examples:&#10;- We are open Mon-Fri 9am-6pm&#10;- VIP membership costs 5000 TL/month&#10;- No outside food allowed"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            rows={6}
            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 mb-3"
          />
          <button
            onClick={handleTextSubmit}
            disabled={!textInput.trim()}
            className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save to Knowledge Base
          </button>
        </div>
      )}

      {/* Assets List */}
      {assets.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {assets.map((asset) => (
            <div key={asset.id}>
              <div className="p-4 flex items-center gap-4">
                {/* Preview */}
                <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {asset.preview ? (
                    <img
                      src={asset.preview}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : asset.fileType === "url" ? (
                    <Link2 size={20} className="text-slate-400" />
                  ) : asset.fileType === "pdf" ? (
                    <FileText size={20} className="text-slate-400" />
                  ) : (
                    <PenLine size={20} className="text-slate-400" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">
                    {asset.name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {formatDate(asset.uploadedAt, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    · {asset.fileType.toUpperCase()}
                  </div>
                </div>

                {/* Status & Expand Button */}
                <button
                  onClick={() =>
                    asset.status === "ready" &&
                    asset.chunkData &&
                    toggleAssetExpansion(asset.id)
                  }
                  className={`flex items-center gap-1 ${asset.status === "ready" && asset.chunkData ? "cursor-pointer hover:bg-slate-100 rounded-lg px-2 py-1" : ""}`}
                >
                  {getStatusBadge(asset.status, asset.chunks)}
                  {asset.status === "ready" &&
                    asset.chunkData &&
                    (expandedAssets.has(asset.id) ? (
                      <ChevronDown size={16} className="text-slate-400" />
                    ) : (
                      <ChevronRight size={16} className="text-slate-400" />
                    ))}
                </button>

                {/* Delete */}
                <button
                  onClick={() => removeAsset(asset.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              {/* Expanded Chunk Preview */}
              {expandedAssets.has(asset.id) && asset.chunkData && (
                <div className="px-4 pb-4 border-t border-slate-100 bg-slate-50">
                  <div className="pt-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2">
                      <Eye size={14} />
                      What the AI knows from this file:
                    </div>
                    {asset.chunkData.map((chunk, idx) => (
                      <div
                        key={chunk.id || idx}
                        className="bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-700"
                      >
                        <div className="text-xs font-medium text-teal-600 mb-1">
                          Chunk {idx + 1}
                        </div>
                        <p className="whitespace-pre-wrap text-slate-600">
                          {chunk.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {assets.length === 0 && !isLoading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            No Knowledge Assets Yet
          </h3>
          <p className="text-slate-500 max-w-md mx-auto">
            Your agent is currently using only basic business info. Upload a
            menu or add FAQs to make it smarter!
          </p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Loader2
            size={40}
            className="animate-spin text-teal-500 mx-auto mb-4"
          />
          <p className="text-slate-500">Loading knowledge base...</p>
        </div>
      )}
    </div>
  );
};

export default KnowledgeModule;
