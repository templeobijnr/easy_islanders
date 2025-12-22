import { IngestKind } from '../types/merve';
import { db } from '../config/firebase';

export type ListingDataItem = {
    id: string;
    name: string;
    description?: string;
    price?: number;
    currency?: string;
    category?: string;
    available?: boolean;
    sortOrder?: number;
};

export const listingDataRepository = {
    async listItems(listingId: string, kind: IngestKind): Promise<ListingDataItem[]> {
        const snap = await db.collection('listings').doc(listingId).collection(kind).get();
        const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as ListingDataItem[];
        items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || (a.name || '').localeCompare(b.name || ''));
        return items;
    }
};
