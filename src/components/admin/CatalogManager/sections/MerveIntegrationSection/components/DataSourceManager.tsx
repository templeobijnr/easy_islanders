/**
 * DataSourceManager - Shows data source info with manage button
 */
import React from "react";
import { Package } from "lucide-react";
import type { MerveActionType, IngestKind } from "../types";
import { INGEST_KIND_OPTIONS } from "../constants";

interface DataSourceManagerProps {
    actionType: MerveActionType;
    dataKind: IngestKind;
    listingId: string;
    onManage: () => void;
}

export function DataSourceManager({
    actionType,
    dataKind,
    listingId,
    onManage,
}: DataSourceManagerProps) {
    const kindLabel = INGEST_KIND_OPTIONS.find(o => o.value === dataKind)?.label || dataKind;

    return (
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
                <Package size={16} className="text-emerald-600" />
                <span className="text-sm text-slate-700">{kindLabel}</span>
            </div>
            <button
                onClick={onManage}
                className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
            >
                Manage
            </button>
        </div>
    );
}

export default DataSourceManager;
