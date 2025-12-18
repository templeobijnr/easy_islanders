/**
 * Offerings Manager - Listing Data CRUD
 *
 * Manages listing data subcollections for Merve actions:
 * - listings/{listingId}/{kind}/{itemId}
 */

import { logger } from "@/utils/logger";
import React, { useEffect, useMemo, useState } from "react";
import { Plus, X, Loader2, Upload, FileText } from "lucide-react";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  deleteDoc,
  Timestamp,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../../../../services/firebaseConfig";
import { v1Url } from "../../../../services/v1Api";
import ProposalReviewModal from "./ProposalReviewModal";
import ImportModal, { ImportMode } from "./ImportModal";
import ItemForm, {
  ItemFormData,
  DEFAULT_FORM_DATA,
  CURRENCY_OPTIONS,
} from "./ItemForm";
import ItemsList, { ListingDataItem } from "./ItemsList";

export type IngestKind =
  | "menuItems"
  | "services"
  | "offerings"
  | "tickets"
  | "roomTypes";

type IngestProposal = {
  id: string;
  kind: IngestKind;
  status: "proposed" | "applied" | "rejected" | string;
  extractedItems?: Array<{
    id?: string;
    name: string;
    description?: string | null;
    price?: number | null;
    currency?: string | null;
    category?: string | null;
  }>;
  warnings?: string[];
  createdAt?: any;
};

interface OfferingsManagerProps {
  listingId: string;
  listingTitle: string;
  marketId: string;
  kinds: IngestKind[];
  /** 'standalone' = full UI with tabs, 'inline' = compact for embedding in action panels */
  variant?: "standalone" | "inline";
  /** Label for inline mode header */
  actionLabel?: string;
}

const CATEGORY_PRESETS: Record<IngestKind, string[]> = {
  menuItems: [
    "Starters",
    "Main Courses",
    "Kebabs",
    "Grills",
    "Seafood",
    "Salads",
    "Desserts",
    "Drinks",
    "Specials",
  ],
  services: [
    "Basic",
    "Standard",
    "Premium",
    "Emergency",
    "Installation",
    "Repair",
    "Maintenance",
  ],
  offerings: ["General"],
  tickets: ["General"],
  roomTypes: ["Standard Room", "Deluxe Room", "Suite", "Villa", "Add-ons"],
};

// CURRENCY_OPTIONS is now imported from ItemForm

const getKindLabel = (kind: IngestKind) => {
  switch (kind) {
    case "menuItems":
      return "Menu Items";
    case "services":
      return "Services";
    case "offerings":
      return "Offerings";
    case "tickets":
      return "Tickets";
    case "roomTypes":
      return "Room Types";
  }
};

const getItemLabel = (kind: IngestKind) => {
  switch (kind) {
    case "menuItems":
      return "Menu Item";
    case "services":
      return "Service";
    case "offerings":
      return "Offering";
    case "tickets":
      return "Ticket";
    case "roomTypes":
      return "Room Type";
  }
};

const OfferingsManager: React.FC<OfferingsManagerProps> = ({
  listingId,
  listingTitle,
  marketId,
  kinds,
  variant = "standalone",
  actionLabel,
}) => {
  const [selectedKind, setSelectedKind] = useState<IngestKind>(
    kinds[0] || "offerings",
  );
  const [items, setItems] = useState<ListingDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [proposal, setProposal] = useState<IngestProposal | null>(null);
  const [showProposalPreview, setShowProposalPreview] = useState(false);

  // Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFilePreview, setImportFilePreview] = useState<string | null>(
    null,
  );
  const [importMode, setImportMode] = useState<"url" | "file">("url");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // Extraction Status
  const [extractionStatus, setExtractionStatus] = useState<
    "idle" | "processing" | "complete" | "error"
  >("idle");
  const [extractionMessage, setExtractionMessage] = useState("");

  // Proposal Review Modal
  const [showProposalModal, setShowProposalModal] = useState(false);

  const categories = useMemo(
    () => CATEGORY_PRESETS[selectedKind] || ["General"],
    [selectedKind],
  );

  useEffect(() => {
    if (!kinds.length) return;
    if (kinds.includes(selectedKind)) return;
    setSelectedKind(kinds[0]);
  }, [kinds.join("|")]);

  const [formData, setFormData] = useState<ItemFormData>(DEFAULT_FORM_DATA);

  const loadItems = async () => {
    setLoading(true);
    try {
      const ref = collection(db, `listings/${listingId}/${selectedKind}`);
      const snapshot = await getDocs(ref);
      const loaded = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ListingDataItem[];
      loaded.sort(
        (a, b) =>
          (a.sortOrder || 0) - (b.sortOrder || 0) ||
          a.name.localeCompare(b.name),
      );
      setItems(loaded);
    } catch (error) {
      console.error("Failed to load listing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadLatestProposal = async (): Promise<IngestProposal | null> => {
    setProposalLoading(true);
    logger.debug("[OfferingsManager] Loading proposals for:", {
      listingId,
      selectedKind,
    });
    try {
      const proposalsRef = collection(
        db,
        `listings/${listingId}/ingestProposals`,
      );
      const snap = await getDocs(
        query(proposalsRef, orderBy("createdAt", "desc"), limit(20)),
      );
      const proposals = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as IngestProposal[];
      logger.debug(
        "[OfferingsManager] Found proposals:",
        proposals.map((p) => ({
          id: p.id,
          kind: p.kind,
          status: p.status,
          items: p.extractedItems?.length || 0,
        })),
      );
      const latest =
        proposals.find(
          (p) => p.kind === selectedKind && p.status === "proposed",
        ) || null;
      logger.debug(
        "[OfferingsManager] Selected proposal:",
        latest
          ? { id: latest.id, items: latest.extractedItems?.length || 0 }
          : null,
      );
      setProposal(latest);
      return latest;
    } catch (error) {
      console.error("Failed to load ingest proposals:", error);
      setProposal(null);
      return null;
    } finally {
      setProposalLoading(false);
    }
  };

  const loadProposalById = async (
    proposalId: string,
  ): Promise<IngestProposal | null> => {
    setProposalLoading(true);
    try {
      const proposalRef = doc(
        db,
        `listings/${listingId}/ingestProposals`,
        proposalId,
      );
      const snap = await getDoc(proposalRef);
      if (!snap.exists()) {
        setProposal(null);
        return null;
      }
      const data = { id: snap.id, ...(snap.data() as any) } as IngestProposal;
      setProposal(data);
      return data;
    } catch (error) {
      console.error("Failed to load ingest proposal:", error);
      setProposal(null);
      return null;
    } finally {
      setProposalLoading(false);
    }
  };

  const pollJobUntilDone = async (jobId: string) => {
    setActiveJobId(jobId);
    setExtractionStatus("processing");
    setExtractionMessage("Starting extraction job...");

    const jobRef = doc(db, `markets/${marketId}/catalogIngestJobs`, jobId);

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const snap = await getDoc(jobRef);
        if (!snap.exists()) return;
        const job = snap.data() as any;

        const status = String(job.status || "");
        const error = typeof job.error === "string" ? job.error : "";
        const proposalId =
          typeof job.proposalId === "string" ? job.proposalId : "";

        if (status === "failed") {
          clearInterval(interval);
          setExtractionStatus("error");
          setExtractionMessage(
            error || "Extraction job failed (no error provided).",
          );
          return;
        }

        if (status === "needs_review" && proposalId) {
          clearInterval(interval);
          await loadProposalById(proposalId);
          setExtractionStatus("complete");
          setExtractionMessage(
            "Extraction finished — proposal ready for review.",
          );
          setShowImportModal(false); // Close import modal
          setShowProposalModal(true); // Show proposal review modal
          return;
        }

        if (status === "processing") {
          setExtractionMessage("Extracting items...");
        } else if (status === "queued") {
          setExtractionMessage("Queued...");
        } else if (status === "applied") {
          clearInterval(interval);
          setExtractionStatus("complete");
          setExtractionMessage("Proposal already applied.");
        }

        if (attempts >= 60) {
          clearInterval(interval);
          setExtractionStatus("complete");
          setExtractionMessage(
            "Processing timed out in UI. Check job status in Firestore / logs.",
          );
        }
      } catch (e: any) {
        clearInterval(interval);
        setExtractionStatus("error");
        setExtractionMessage(e?.message || "Failed to check job status.");
      }
    }, 2000);
  };

  useEffect(() => {
    if (!listingId) return;
    loadItems();
    loadLatestProposal();
  }, [listingId, selectedKind]);

  const resetForm = () => {
    setFormData({ ...DEFAULT_FORM_DATA, category: categories[0] || "" });
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      const itemId = editingId || `item_${Date.now()}`;
      const itemRef = doc(db, `listings/${listingId}/${selectedKind}`, itemId);

      const existing = editingId
        ? items.find((i) => i.id === editingId)
        : undefined;
      const sortOrder = existing?.sortOrder ?? items.length;

      await setDoc(
        itemRef,
        {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          price: Number(formData.price) || 0,
          currency: formData.currency,
          category: formData.category || null,
          available: formData.available,
          sortOrder,
          updatedAt: Timestamp.now(),
          ...(editingId ? {} : { createdAt: Timestamp.now() }),
        },
        { merge: true },
      );

      await loadItems();
      resetForm();
    } catch (error) {
      console.error("Failed to save item:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: ListingDataItem) => {
    setFormData({
      name: item.name,
      description: item.description || "",
      price: item.price,
      currency: item.currency,
      category: item.category || "",
      available: item.available,
    });
    setEditingId(item.id);
    setShowAddForm(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm("Delete this item?")) return;
    try {
      await deleteDoc(doc(db, `listings/${listingId}/${selectedKind}`, itemId));
      await loadItems();
    } catch (error) {
      console.error("Failed to delete item:", error);
    }
  };

  const getCurrencySymbol = (code: string) =>
    CURRENCY_OPTIONS.find((c) => c.value === code)?.symbol || code;

  const createIngestJobFromUrl = async (url: string) => {
    const { getAuth } = await import("firebase/auth");
    const token = await getAuth().currentUser?.getIdToken();

    const normalizedUrl = url.trim();
    const res = await fetch(v1Url("/admin/catalog-ingest/jobs"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        marketId,
        listingId,
        kind: selectedKind,
        sources: [{ type: "url", url: normalizedUrl }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to create ingest job");
    }

    return res.json();
  };

  // Upload a file to Firebase Storage and create ingest job
  const createIngestJobFromFile = async (file: File) => {
    const { getAuth } = await import("firebase/auth");
    const { getStorage, ref, uploadBytes } = await import("firebase/storage");

    const token = await getAuth().currentUser?.getIdToken();
    const storage = getStorage();

    // Upload to storage
    const path = `catalog-imports/${listingId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(
      storageRef,
      file,
      file.type ? { contentType: file.type } : undefined,
    );

    // Determine source type
    const sourceType = file.type.startsWith("image/")
      ? "image"
      : file.type === "application/pdf"
        ? "pdf"
        : "image";

    const res = await fetch(v1Url("/admin/catalog-ingest/jobs"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        marketId,
        listingId,
        kind: selectedKind,
        sources: [{ type: sourceType, storagePath: path }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to create ingest job");
    }

    return res.json();
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setImportFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImportFilePreview(null);
    }
  };

  // Handle paste from clipboard
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Find first image in clipboard
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          // Create a File from the blob with a name
          const file = new File([blob], `pasted-image-${Date.now()}.png`, {
            type: blob.type,
          });
          setImportFile(file);

          // Create preview
          const reader = new FileReader();
          reader.onloadend = () =>
            setImportFilePreview(reader.result as string);
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  };

  const applyProposal = async (proposalId: string) => {
    const { getAuth } = await import("firebase/auth");
    const token = await getAuth().currentUser?.getIdToken();

    const res = await fetch(
      v1Url(
        `/admin/catalog-ingest/listings/${listingId}/proposals/${proposalId}/apply`,
      ),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to apply proposal");
    }
  };

  const rejectProposal = async (proposalId: string) => {
    const { getAuth } = await import("firebase/auth");
    const token = await getAuth().currentUser?.getIdToken();

    const res = await fetch(
      v1Url(
        `/admin/catalog-ingest/listings/${listingId}/proposals/${proposalId}/reject`,
      ),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to reject proposal");
    }
  };

  const grouped = useMemo(
    () =>
      items.reduce(
        (acc, item) => {
          const cat = item.category || "Uncategorized";
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(item);
          return acc;
        },
        {} as Record<string, ListingDataItem[]>,
      ),
    [items],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
      </div>
    );
  }

  const kindLabel = getKindLabel(selectedKind);
  const itemLabel = getItemLabel(selectedKind);

  // =========================================================================
  // INLINE VARIANT - Compact UI for embedding in action panels
  // =========================================================================
  if (variant === "inline") {
    return (
      <div className="space-y-2">
        {/* Compact header */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {items.length} {items.length === 1 ? itemLabel : kindLabel}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center gap-1"
            >
              <Upload size={12} /> Import
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="text-xs px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1"
            >
              <Plus size={12} /> Add
            </button>
          </div>
        </div>

        {/* Extraction Status Banner */}
        {extractionStatus !== "idle" && (
          <div
            className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
              extractionStatus === "processing"
                ? "bg-amber-900/30 border border-amber-500/30 text-amber-300"
                : extractionStatus === "complete"
                  ? "bg-emerald-900/30 border border-emerald-500/30 text-emerald-300"
                  : "bg-red-900/30 border border-red-500/30 text-red-300"
            }`}
          >
            {extractionStatus === "processing" && (
              <Loader2 size={12} className="animate-spin" />
            )}
            {extractionStatus === "complete" && <span>✅</span>}
            {extractionStatus === "error" && <span>❌</span>}
            <span>{extractionMessage}</span>
            {extractionStatus !== "processing" && (
              <button
                type="button"
                onClick={() => setExtractionStatus("idle")}
                className="ml-auto text-slate-400 hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}

        {/* Items list - compact */}
        {!showAddForm && (
          <ItemsList
            items={items}
            onEdit={handleEdit}
            onDelete={handleDelete}
            variant="compact"
            emptyMessage={`No ${kindLabel.toLowerCase()} yet. Add or import.`}
          />
        )}

        {/* Inline add form */}
        {showAddForm && (
          <ItemForm
            formData={formData}
            onFormChange={setFormData}
            onSave={handleSave}
            onCancel={resetForm}
            saving={saving}
            editingId={editingId}
            itemLabel={itemLabel}
            categories={categories}
            variant="compact"
          />
        )}

        {/* Import Modal */}
        {showImportModal && (
          <ImportModal
            kindLabel={kindLabel}
            variant="compact"
            onImport={async (mode, urlOrFile) => {
              const result =
                mode === "url"
                  ? await createIngestJobFromUrl(urlOrFile as string)
                  : await createIngestJobFromFile(urlOrFile as File);
              const jobId = (result as any)?.jobId as string | undefined;
              setShowImportModal(false);
              setImportUrl("");
              setImportFile(null);
              setImportFilePreview(null);
              if (jobId) await pollJobUntilDone(jobId);
              return jobId || null;
            }}
            onClose={() => {
              setShowImportModal(false);
              setImportFile(null);
              setImportFilePreview(null);
              setImportMode("url");
            }}
          />
        )}

        {/* Proposal Review Modal */}
        {showProposalModal && proposal && (
          <ProposalReviewModal
            proposal={proposal}
            onClose={() => setShowProposalModal(false)}
            onApply={async () => {
              await applyProposal(proposal.id);
              await loadItems();
              setShowProposalModal(false);
              setProposal(null);
              setExtractionStatus("idle");
            }}
            onReject={async () => {
              await rejectProposal(proposal.id);
              setShowProposalModal(false);
              setProposal(null);
              setExtractionStatus("idle");
            }}
          />
        )}
      </div>
    );
  }

  // =========================================================================
  // STANDALONE VARIANT - Full UI with tabs and proposal review
  // =========================================================================
  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Package className="text-emerald-500" size={20} />
              {kindLabel}
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              {items.length} items for "{listingTitle}"
            </p>
          </div>

          <div className="flex items-center gap-2">
            {kinds.length > 1 && (
              <select
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                value={selectedKind}
                onChange={(e) => setSelectedKind(e.target.value as IngestKind)}
              >
                {kinds.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => {
                setImportUrl("");
                setImportError("");
                setShowImportModal(true);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
              title="Import from URL or file"
            >
              <Upload size={16} /> Import
            </button>
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
              >
                <Plus size={18} /> Add {itemLabel}
              </button>
            )}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-slate-400" />
              <div className="text-sm text-slate-300">
                Extraction proposal
                {proposalLoading ? " (loading...)" : proposal ? "" : " (none)"}
              </div>
            </div>
            {proposal && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowProposalPreview((p) => !p)}
                  className="text-xs text-slate-300 hover:text-white"
                >
                  {showProposalPreview ? "Hide" : "Preview"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await applyProposal(proposal.id);
                      await Promise.all([loadItems(), loadLatestProposal()]);
                      setShowProposalPreview(false);
                    } catch (e: any) {
                      alert(e?.message || "Failed to apply");
                    }
                  }}
                  className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded"
                >
                  Publish
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm("Reject this proposal?")) return;
                    try {
                      await rejectProposal(proposal.id);
                      await loadLatestProposal();
                      setShowProposalPreview(false);
                    } catch (e: any) {
                      alert(e?.message || "Failed to reject");
                    }
                  }}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1 rounded"
                >
                  Reject
                </button>
              </div>
            )}
          </div>

          {proposal && (
            <div className="text-xs text-slate-500 mt-2">
              {proposal.extractedItems?.length || 0} item(s) extracted
              {proposal.warnings?.length
                ? ` • ${proposal.warnings.join(" • ")}`
                : ""}
            </div>
          )}

          {proposal && showProposalPreview && (
            <div className="mt-3 max-h-72 overflow-auto border border-slate-800 rounded-lg">
              <div className="bg-slate-950 px-3 py-2 text-xs text-slate-400 border-b border-slate-800">
                Preview (first 25)
              </div>
              <div className="p-3 space-y-2">
                {(proposal.extractedItems || []).slice(0, 25).map((it, idx) => (
                  <div
                    key={`proposal-item-${idx}-${it.id || ""}`}
                    className="text-sm text-slate-200"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{it.name}</div>
                      <div className="text-xs text-slate-400">
                        {it.currency || ""} {it.price ?? ""}
                      </div>
                    </div>
                    {(it.category || it.description) && (
                      <div className="text-xs text-slate-500">
                        {it.category ? `[${it.category}] ` : ""}
                        {it.description || ""}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {showAddForm && (
          <ItemForm
            formData={formData}
            onFormChange={setFormData}
            onSave={handleSave}
            onCancel={resetForm}
            saving={saving}
            editingId={editingId}
            itemLabel={itemLabel}
            categories={categories}
            variant="full"
          />
        )}

        <ItemsList
          items={items}
          grouped={grouped}
          onEdit={handleEdit}
          onDelete={handleDelete}
          getCurrencySymbol={getCurrencySymbol}
          variant="full"
          emptyMessage="No items yet. Add one above, or use Import."
        />
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          kindLabel={getKindLabel(selectedKind)}
          variant="full"
          onImport={async (mode, urlOrFile) => {
            const result =
              mode === "url"
                ? await createIngestJobFromUrl(urlOrFile as string)
                : await createIngestJobFromFile(urlOrFile as File);
            const jobId = (result as any)?.jobId as string | undefined;
            setShowImportModal(false);
            setImportUrl("");
            setImportFile(null);
            setImportFilePreview(null);
            setImportMode("url");
            if (jobId) await pollJobUntilDone(jobId);
            return jobId || null;
          }}
          onClose={() => {
            setShowImportModal(false);
            setImportFile(null);
            setImportFilePreview(null);
            setImportMode("url");
          }}
        />
      )}

      {/* Proposal Review Modal */}
      {showProposalModal && proposal && (
        <ProposalReviewModal
          proposal={proposal}
          onClose={() => setShowProposalModal(false)}
          onApply={async () => {
            await applyProposal(proposal.id);
            await loadItems();
            setShowProposalModal(false);
            setProposal(null);
            setExtractionStatus("idle");
          }}
          onReject={async () => {
            await rejectProposal(proposal.id);
            setShowProposalModal(false);
            setProposal(null);
            setExtractionStatus("idle");
          }}
        />
      )}
    </>
  );
};

export default OfferingsManager;
