/**
 * KnowledgeUploader - Upload/input panel
 */
import React, { useState, useRef } from "react";
import { Upload, Link2, PenLine, Loader2, FileText, Image as ImageIcon } from "lucide-react";
import type { TabType } from "../types";

interface KnowledgeUploaderProps {
    isUploading: boolean;
    onFilesSelected: (files: FileList) => void;
    onUrlSubmit: (url: string) => void;
    onTextSubmit: (title: string, content: string) => void;
}

const KnowledgeUploader: React.FC<KnowledgeUploaderProps> = ({
    isUploading,
    onFilesSelected,
    onUrlSubmit,
    onTextSubmit,
}) => {
    const [activeTab, setActiveTab] = useState<TabType>("upload");
    const [url, setUrl] = useState("");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent, entering: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(entering);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files?.length) onFilesSelected(e.dataTransfer.files);
    };

    const handleUrlAction = () => {
        if (url.trim()) { onUrlSubmit(url); setUrl(""); }
    };

    const handleTextAction = () => {
        if (content.trim()) { onTextSubmit(title, content); setTitle(""); setContent(""); }
    };

    const tabs = [
        { id: "upload" as TabType, label: "Upload", icon: Upload },
        { id: "url" as TabType, label: "URL", icon: Link2 },
        { id: "text" as TabType, label: "Text", icon: PenLine },
    ];

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
            {/* Tabs */}
            <div className="flex gap-2 mb-4">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                    >
                        <tab.icon size={16} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Upload Panel */}
            {activeTab === "upload" && (
                <div
                    onDragEnter={(e) => handleDrag(e, true)}
                    onDragOver={(e) => handleDrag(e, true)}
                    onDragLeave={(e) => handleDrag(e, false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${isDragging ? "border-emerald-500 bg-emerald-50" : "border-slate-300 hover:border-slate-400"
                        }`}
                >
                    <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.txt" onChange={(e) => e.target.files && onFilesSelected(e.target.files)} className="hidden" />
                    <div className="flex flex-col items-center gap-3">
                        {isUploading ? <Loader2 className="animate-spin text-emerald-500" size={40} /> : (
                            <>
                                <div className="flex gap-2 text-slate-400">
                                    <FileText size={32} /> <ImageIcon size={32} />
                                </div>
                                <p className="text-slate-600">
                                    Drag & drop files here, or{" "}
                                    <button onClick={() => fileInputRef.current?.click()} className="text-emerald-600 font-semibold hover:underline">browse</button>
                                </p>
                                <p className="text-xs text-slate-400">Images, PDFs, or text files</p>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* URL Panel */}
            {activeTab === "url" && (
                <div className="space-y-3">
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com/menu.pdf"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button onClick={handleUrlAction} disabled={isUploading || !url.trim()} className="w-full py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors">
                        {isUploading ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Import URL"}
                    </button>
                </div>
            )}

            {/* Text Panel */}
            {activeTab === "text" && (
                <div className="space-y-3">
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Enter knowledge content..." rows={5} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                    <button onClick={handleTextAction} disabled={isUploading || !content.trim()} className="w-full py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors">
                        {isUploading ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Add Knowledge"}
                    </button>
                </div>
            )}
        </div>
    );
};

export default KnowledgeUploader;
