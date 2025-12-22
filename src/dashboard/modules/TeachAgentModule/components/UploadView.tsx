/**
 * UploadView - File upload view
 */
import React, { RefObject } from "react";
import { ChevronRight, Loader2, CheckCircle, Image, FileText } from "lucide-react";
import type { TeachAgentView } from "../types";

interface UploadViewProps {
    uploadedFiles: File[];
    setUploadedFiles: (files: File[]) => void;
    fileInputRef: RefObject<HTMLInputElement>;
    isSubmitting: boolean;
    handleFileUpload: (files: File[]) => void;
    setActiveView: (view: TeachAgentView) => void;
}

const UploadView: React.FC<UploadViewProps> = ({
    uploadedFiles,
    setUploadedFiles,
    fileInputRef,
    isSubmitting,
    handleFileUpload,
    setActiveView,
}) => {
    return (
        <div className="p-6 max-w-2xl mx-auto">
            <button onClick={() => setActiveView("options")} className="text-slate-500 hover:text-slate-700 mb-6 flex items-center gap-1">
                ← Back to options
            </button>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">Upload Menu or Price List</h2>
            <p className="text-slate-600 mb-6">Take a photo of your menu, or upload a PDF. We'll extract the items automatically.</p>

            {/* Drop Zone */}
            <div
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${uploadedFiles.length > 0 ? "border-purple-400 bg-purple-50" : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.txt"
                    multiple
                    onChange={(e) => setUploadedFiles(Array.from(e.target.files || []))}
                />
                {uploadedFiles.length > 0 ? (
                    <div>
                        <CheckCircle className="mx-auto text-purple-600 mb-4" size={48} />
                        <p className="text-lg font-medium text-slate-800">{uploadedFiles.length} file(s) selected</p>
                        <p className="text-slate-500 text-sm mt-1">{uploadedFiles.map((f) => f.name).join(", ")}</p>
                    </div>
                ) : (
                    <div>
                        <div className="flex justify-center gap-4 mb-4">
                            <Image className="text-slate-300" size={40} />
                            <FileText className="text-slate-300" size={40} />
                        </div>
                        <p className="text-lg font-medium text-slate-700">Drop files here or click to upload</p>
                        <p className="text-slate-400 text-sm mt-1">Photos, PDFs, or documents</p>
                    </div>
                )}
            </div>

            {uploadedFiles.length > 0 && (
                <button
                    onClick={() => handleFileUpload(uploadedFiles)}
                    disabled={isSubmitting}
                    className="w-full mt-6 bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isSubmitting ? <><Loader2 className="animate-spin" size={20} /> Uploading...</> : <>Upload & Extract Items <ChevronRight size={20} /></>}
                </button>
            )}
        </div>
    );
};

export default UploadView;
