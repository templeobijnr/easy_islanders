/**
 * UrlView - URL import view
 */
import React from "react";
import { ChevronRight, Loader2, Link2 } from "lucide-react";
import type { TeachAgentView } from "../types";

interface UrlViewProps {
    urlInput: string;
    setUrlInput: (url: string) => void;
    isSubmitting: boolean;
    handleUrlImport: () => void;
    setActiveView: (view: TeachAgentView) => void;
}

const UrlView: React.FC<UrlViewProps> = ({ urlInput, setUrlInput, isSubmitting, handleUrlImport, setActiveView }) => {
    return (
        <div className="p-6 max-w-2xl mx-auto">
            <button onClick={() => setActiveView("options")} className="text-slate-500 hover:text-slate-700 mb-6 flex items-center gap-1">
                ← Back to options
            </button>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">Import from Website</h2>
            <p className="text-slate-600 mb-6">Paste your website URL, Yemek Sepeti link, or FeedMe Cyprus page.</p>

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
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">Your website</span>
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">Yemek Sepeti</span>
                    <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">FeedMe Cyprus</span>
                </div>
            </div>

            <button
                onClick={handleUrlImport}
                disabled={!urlInput.trim() || isSubmitting}
                className="w-full mt-6 bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {isSubmitting ? <><Loader2 className="animate-spin" size={20} /> Extracting...</> : <>Import & Extract <ChevronRight size={20} /></>}
            </button>
        </div>
    );
};

export default UrlView;
