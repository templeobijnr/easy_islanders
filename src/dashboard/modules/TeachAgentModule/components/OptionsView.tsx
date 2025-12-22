/**
 * OptionsView - Main options grid view
 */
import React from "react";
import { Upload, Globe, Plus, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import type { KnowledgeDoc, TeachAgentView, TeachAgentError } from "../types";

interface OptionsViewProps {
    docs: KnowledgeDoc[];
    error: TeachAgentError | null;
    hasKnowledge: boolean;
    setActiveView: (view: TeachAgentView) => void;
    setError: (err: TeachAgentError | null) => void;
    setLoaded: (loaded: boolean) => void;
    logout: () => void;
}

const OptionsView: React.FC<OptionsViewProps> = ({
    docs,
    error,
    hasKnowledge,
    setActiveView,
    setError,
    setLoaded,
    logout,
}) => {
    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Error Banner */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                        <div className="flex-1">
                            <h3 className="font-bold text-red-800">{error.title}</h3>
                            <p className="text-red-700 text-sm">{error.detail}</p>
                            <div className="flex gap-3 mt-3">
                                {error.action === "Retry" && (
                                    <button
                                        onClick={() => { setError(null); setLoaded(false); }}
                                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
                                    >
                                        Try Again
                                    </button>
                                )}
                                {error.action === "Login" && (
                                    <button onClick={logout} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
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
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Teach your agent using what you already have</h1>
                <p className="text-slate-600">Upload a menu, paste a link, or add items one by one.</p>
            </div>

            {/* Option Cards */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
                <button onClick={() => setActiveView("upload")} className="p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-purple-400 hover:shadow-lg transition-all text-left group">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
                        <Upload className="text-purple-600" size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Upload Menu or Price List</h3>
                    <p className="text-slate-500 text-sm">Photos, PDFs, or any document with your offerings</p>
                </button>

                <button onClick={() => setActiveView("url")} className="p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-purple-400 hover:shadow-lg transition-all text-left group">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                        <Globe className="text-blue-600" size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Import from Website</h3>
                    <p className="text-slate-500 text-sm">Your website, Yemek Sepeti, or FeedMe Cyprus</p>
                </button>

                <button onClick={() => setActiveView("manual")} className="p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-purple-400 hover:shadow-lg transition-all text-left group">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                        <Plus className="text-green-600" size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Add Items Manually</h3>
                    <p className="text-slate-500 text-sm">Type your products or services one by one</p>
                </button>

                <div className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-100 text-left">
                    <h3 className="text-lg font-medium text-slate-600 mb-1">Not ready yet?</h3>
                    <p className="text-slate-400 text-sm mb-3">Your agent will still work — it'll capture contact details when it can't answer.</p>
                    <span className="text-purple-600 text-sm font-medium">You can always come back later →</span>
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
                            <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    {doc.status === "processing" && <Loader2 className="animate-spin text-amber-500" size={16} />}
                                    {doc.status === "active" && <CheckCircle className="text-green-500" size={16} />}
                                    {doc.status === "failed" && <AlertCircle className="text-red-500" size={16} />}
                                    <span className="text-slate-700">{doc.sourceName}</span>
                                </div>
                                <span className="text-xs text-slate-400">{doc.status === "processing" ? "Processing..." : `${doc.chunkCount} items`}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-8 text-center text-sm text-slate-500">
                <p>💡 Your agent doesn't need to be perfect. When it's unsure, it asks customers for their contact details.</p>
            </div>
        </div>
    );
};

export default OptionsView;
