/**
 * Ingest API Functions
 *
 * API calls for catalog ingest jobs and proposals.
 */
import { v1Url } from "../../../../../../services/integrations/backend/v1.api";

/**
 * Create ingest job from URL
 */
export async function createIngestJobFromUrl(
    marketId: string,
    listingId: string,
    selectedKind: string,
    url: string
): Promise<{ jobId?: string }> {
    const { getAuth } = await import("firebase/auth");
    const token = await getAuth().currentUser?.getIdToken();

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
            sources: [{ type: "url", url: url.trim() }],
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to create ingest job");
    }

    return res.json();
}

/**
 * Create ingest job from file
 */
export async function createIngestJobFromFile(
    marketId: string,
    listingId: string,
    selectedKind: string,
    file: File
): Promise<{ jobId?: string }> {
    const { getAuth } = await import("firebase/auth");
    const { getStorage, ref, uploadBytes } = await import("firebase/storage");

    const token = await getAuth().currentUser?.getIdToken();
    const storage = getStorage();

    const path = `catalog-imports/${listingId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file, file.type ? { contentType: file.type } : undefined);

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
}

/**
 * Apply proposal
 */
export async function applyProposal(listingId: string, proposalId: string): Promise<void> {
    const { getAuth } = await import("firebase/auth");
    const token = await getAuth().currentUser?.getIdToken();

    const res = await fetch(
        v1Url(`/admin/catalog-ingest/listings/${listingId}/proposals/${proposalId}/apply`),
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        }
    );

    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to apply proposal");
    }
}

/**
 * Reject proposal
 */
export async function rejectProposal(listingId: string, proposalId: string): Promise<void> {
    const { getAuth } = await import("firebase/auth");
    const token = await getAuth().currentUser?.getIdToken();

    const res = await fetch(
        v1Url(`/admin/catalog-ingest/listings/${listingId}/proposals/${proposalId}/reject`),
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        }
    );

    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to reject proposal");
    }
}
