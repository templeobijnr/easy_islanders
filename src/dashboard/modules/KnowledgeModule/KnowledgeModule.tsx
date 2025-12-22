/**
 * KnowledgeModule - Composer
 *
 * Thin shell that composes hooks and components for knowledge management.
 */
import React, { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { StorageService } from "../../../services/infrastructure/storage/local-storage.service";
import { useKnowledgeAssets } from "./hooks/useKnowledgeAssets";
import { useKnowledgeUpload } from "./hooks/useKnowledgeUpload";
import { KnowledgeUploader, KnowledgeList } from "./components";

const KnowledgeModule: React.FC = () => {
    const { user } = useAuth();
    const [businessId, setBusinessId] = useState<string | null>(null);

    // Get business ID from storage
    useEffect(() => {
        const loadBusinessId = async () => {
            const config = await StorageService.getItem("business_config");
            if (config?.businessId) setBusinessId(config.businessId);
            else if (user?.id) setBusinessId(user.id);
        };
        loadBusinessId();
    }, [user]);

    const assetsHook = useKnowledgeAssets(businessId);
    const uploadHook = useKnowledgeUpload({
        businessId,
        onAssetAdd: assetsHook.addAsset,
        onAssetUpdate: assetsHook.updateAsset,
    });

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 rounded-xl">
                    <BookOpen className="text-emerald-600" size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Knowledge Base</h2>
                    <p className="text-sm text-slate-500">
                        Upload menus, policies, and other content for your AI agent
                    </p>
                </div>
            </div>

            {/* Uploader */}
            <KnowledgeUploader
                isUploading={uploadHook.isUploading}
                onFilesSelected={uploadHook.handleFiles}
                onUrlSubmit={uploadHook.handleUrlSubmit}
                onTextSubmit={uploadHook.handleTextSubmit}
            />

            {/* Assets List */}
            <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Knowledge Assets ({assetsHook.assets.length})
                </h3>
                <KnowledgeList
                    assets={assetsHook.assets}
                    isLoading={assetsHook.isLoading}
                    expandedAssets={assetsHook.expandedAssets}
                    onToggleExpand={assetsHook.toggleAssetExpansion}
                    onRemove={assetsHook.removeAsset}
                />
            </div>
        </div>
    );
};

export default KnowledgeModule;
