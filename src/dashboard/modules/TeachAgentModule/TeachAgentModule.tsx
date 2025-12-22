/**
 * TeachAgentModule - Main Composer
 *
 * Teaches the agent using uploaded documents, URLs, or manual items.
 * Thin composer using useTeachAgentModule hook and view components.
 */
import React from "react";
import { Loader2 } from "lucide-react";
import { useTeachAgentModule } from "./hooks/useTeachAgentModule";
import {
    OptionsView,
    UploadView,
    UrlView,
    ManualView,
    ReviewView,
} from "./components";

const TeachAgentModule: React.FC = () => {
    const vm = useTeachAgentModule();

    if (vm.isLoading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-slate-400" size={32} />
            </div>
        );
    }

    if (vm.activeView === "options") {
        return (
            <OptionsView
                docs={vm.docs}
                error={vm.error}
                hasKnowledge={vm.hasKnowledge}
                setActiveView={vm.setActiveView}
                setError={vm.setError}
                setLoaded={vm.setLoaded}
                logout={vm.logout}
            />
        );
    }

    if (vm.activeView === "upload") {
        return (
            <UploadView
                uploadedFiles={vm.uploadedFiles}
                setUploadedFiles={vm.setUploadedFiles}
                fileInputRef={vm.fileInputRef}
                isSubmitting={vm.isSubmitting}
                handleFileUpload={vm.handleFileUpload}
                setActiveView={vm.setActiveView}
            />
        );
    }

    if (vm.activeView === "url") {
        return (
            <UrlView
                urlInput={vm.urlInput}
                setUrlInput={vm.setUrlInput}
                isSubmitting={vm.isSubmitting}
                handleUrlImport={vm.handleUrlImport}
                setActiveView={vm.setActiveView}
            />
        );
    }

    if (vm.activeView === "manual") {
        return (
            <ManualView
                manualItems={vm.manualItems}
                addManualItem={vm.addManualItem}
                updateManualItem={vm.updateManualItem}
                isSubmitting={vm.isSubmitting}
                handleSaveManualItems={vm.handleSaveManualItems}
                setActiveView={vm.setActiveView}
            />
        );
    }

    if (vm.activeView === "review") {
        return (
            <ReviewView
                extractedCount={vm.extractedCount}
                setActiveView={vm.setActiveView}
            />
        );
    }

    return null;
};

export default TeachAgentModule;
