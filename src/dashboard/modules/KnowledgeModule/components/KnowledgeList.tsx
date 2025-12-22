/**
 * KnowledgeList - Assets list display
 */
import React from "react";
import { BookOpen, Loader2, Trash2, ChevronDown, ChevronRight, CheckCircle, AlertCircle, FileText, Image as ImageIcon, Link2 } from "lucide-react";
import { formatDate } from "../../../../utils/formatters";
import type { KnowledgeAsset } from "../types";

interface KnowledgeListProps {
    assets: KnowledgeAsset[];
    isLoading: boolean;
    expandedAssets: Set<string>;
    onToggleExpand: (id: string) => void;
    onRemove: (id: string) => void;
}

const KnowledgeList: React.FC<KnowledgeListProps> = ({
    assets,
    isLoading,
    expandedAssets,
    onToggleExpand,
    onRemove,
}) => {
    const getStatusBadge = (status: KnowledgeAsset["status"], chunks?: number) => {
        switch (status) {
            case "uploading": return <span className="flex items-center gap-1 text-xs text-blue-600"><Loader2 size={12} className="animate-spin" /> Uploading</span>;
            case "processing": return <span className="flex items-center gap-1 text-xs text-amber-600"><Loader2 size={12} className="animate-spin" /> Processing</span>;
            case "ready": return <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle size={12} /> Ready {chunks && `(${chunks} chunks)`}</span>;
            case "error": return <span className="flex items-center gap-1 text-xs text-red-600"><AlertCircle size={12} /> Error</span>;
            default: return null;
        }
    };

    const getFileIcon = (fileType: KnowledgeAsset["fileType"]) => {
        switch (fileType) {
            case "image": return <ImageIcon size={16} className="text-blue-500" />;
            case "pdf": return <FileText size={16} className="text-red-500" />;
            case "url": return <Link2 size={16} className="text-purple-500" />;
            default: return <FileText size={16} className="text-slate-500" />;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-emerald-500" size={32} />
            </div>
        );
    }

    if (assets.length === 0) {
        return (
            <div className="text-center py-12 text-slate-400">
                <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                <p>No knowledge assets yet</p>
                <p className="text-sm">Upload files, import URLs, or add text to get started</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {assets.map((asset) => (
                <div key={asset.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="flex items-center gap-3 p-4">
                        {/* Expand/Collapse */}
                        {asset.chunkData && asset.chunkData.length > 0 && (
                            <button onClick={() => onToggleExpand(asset.id)} className="text-slate-400 hover:text-slate-600">
                                {expandedAssets.has(asset.id) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                            </button>
                        )}

                        {/* Icon */}
                        {getFileIcon(asset.fileType)}

                        {/* Preview */}
                        {asset.preview && asset.fileType === "image" && (
                            <img src={asset.preview} alt="" className="w-10 h-10 rounded object-cover" />
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 truncate">{asset.name}</p>
                            <p className="text-xs text-slate-400">{formatDate(asset.uploadedAt)}</p>
                        </div>

                        {/* Status */}
                        {getStatusBadge(asset.status, asset.chunks)}

                        {/* Remove */}
                        <button onClick={() => onRemove(asset.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                        </button>
                    </div>

                    {/* Expanded Chunks */}
                    {expandedAssets.has(asset.id) && asset.chunkData && (
                        <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-2">
                            {asset.chunkData.map((chunk, i) => (
                                <div key={chunk.id} className="text-xs bg-white p-3 rounded-lg border border-slate-100">
                                    <p className="font-medium text-slate-500 mb-1">Chunk {i + 1}</p>
                                    <p className="text-slate-600 line-clamp-3">{chunk.preview || chunk.text}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default KnowledgeList;
