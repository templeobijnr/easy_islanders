/**
 * Import Modal - Modal for importing catalog items from URL or file
 * 
 * Extracted from OfferingsManager to reduce component size and enable reuse.
 * Supports both compact (inline) and full (standalone) variants.
 */

import React, { useState } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';

export type ImportMode = 'url' | 'file';

interface ImportModalProps {
    /** Label for the kind of items being imported (e.g. "Menu Items", "Services") */
    kindLabel: string;
    /** Variant affects sizing and text */
    variant?: 'compact' | 'full';
    /** Called when import starts successfully, returns jobId */
    onImport: (mode: ImportMode, urlOrFile: string | File) => Promise<string | null>;
    /** Called when modal should close */
    onClose: () => void;
    /** Optional: Handle paste events for clipboard import */
    onPaste?: (file: File) => void;
}

const ImportModal: React.FC<ImportModalProps> = ({
    kindLabel,
    variant = 'full',
    onImport,
    onClose,
}) => {
    const [mode, setMode] = useState<ImportMode>('url');
    const [url, setUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isCompact = variant === 'compact';

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;
        setFile(selected);
        // Preview for images
        if (selected.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => setFilePreview(reader.result as string);
            reader.readAsDataURL(selected);
        } else {
            setFilePreview(null);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                const pastedFile = item.getAsFile();
                if (pastedFile) {
                    setFile(pastedFile);
                    const reader = new FileReader();
                    reader.onloadend = () => setFilePreview(reader.result as string);
                    reader.readAsDataURL(pastedFile);
                    setMode('file');
                    e.preventDefault();
                    return;
                }
            }
        }
    };

    const handleSubmit = async () => {
        // Validation
        if (mode === 'url' && !url.trim()) {
            setError('Please enter a URL');
            return;
        }
        if (mode === 'file' && !file) {
            setError('Please select a file');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await onImport(mode, mode === 'url' ? url.trim() : file!);
            // Parent will handle closing and resetting
        } catch (e: unknown) {
            setError(e?.message || 'Import failed');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (loading) return;
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onPaste={handlePaste}
        >
            <div className={`bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl mx-4 ${isCompact ? 'p-5 w-full max-w-md' : 'p-6 w-full max-w-lg'
                }`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className={`font-bold text-white flex items-center gap-2 ${isCompact ? 'text-sm' : 'text-lg'}`}>
                        <Upload size={isCompact ? 16 : 20} className="text-emerald-500" />
                        Import {kindLabel}
                    </h3>
                    <button
                        onClick={handleClose}
                        disabled={loading}
                        className="text-slate-400 hover:text-white disabled:opacity-50"
                    >
                        <X size={isCompact ? 16 : 20} />
                    </button>
                </div>

                {/* Mode Tabs */}
                <div className="flex gap-1 mb-4 bg-slate-950 rounded-lg p-1">
                    <button
                        onClick={() => setMode('url')}
                        className={`flex-1 ${isCompact ? 'py-1.5 text-xs' : 'py-2 text-sm'} font-medium rounded-md transition-colors ${mode === 'url' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        🔗 From URL
                    </button>
                    <button
                        onClick={() => setMode('file')}
                        className={`flex-1 ${isCompact ? 'py-1.5 text-xs' : 'py-2 text-sm'} font-medium rounded-md transition-colors ${mode === 'file' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        📷 From Image/PDF
                    </button>
                </div>

                <div className="space-y-4">
                    {/* URL Mode */}
                    {mode === 'url' && (
                        <>
                            <p className={`text-slate-400 ${isCompact ? 'text-xs' : 'text-sm'}`}>
                                {isCompact
                                    ? 'Paste a URL and our AI will extract items automatically.'
                                    : 'Paste a URL from the business website (menu page, services page, etc.). Our AI will extract items automatically for your review.'
                                }
                            </p>
                            <div>
                                {!isCompact && <label className="block text-sm text-slate-400 mb-1">🔗 Website URL</label>}
                                <input
                                    type="url"
                                    placeholder="https://example.com/menu"
                                    value={url}
                                    onChange={e => setUrl(e.target.value)}
                                    disabled={loading}
                                    className={`w-full bg-slate-950 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none ${isCompact ? 'text-sm rounded-lg px-3 py-2' : 'rounded-xl px-4 py-3'
                                        }`}
                                />
                            </div>
                        </>
                    )}

                    {/* File Mode */}
                    {mode === 'file' && (
                        <>
                            <p className={`text-slate-400 ${isCompact ? 'text-xs' : 'text-sm'}`}>
                                {isCompact
                                    ? 'Upload a photo of a menu, price list, or PDF - or paste from clipboard (Ctrl/Cmd+V)'
                                    : 'Upload a photo of a menu, price list, or PDF and our AI will extract items.'
                                }
                            </p>
                            <label className="block cursor-pointer">
                                <div className={`border-2 border-dashed text-center transition-colors ${file ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 hover:border-slate-600'
                                    } ${isCompact ? 'rounded-lg p-4' : 'rounded-xl p-4'}`}>
                                    {filePreview ? (
                                        <img
                                            src={filePreview}
                                            alt="Preview"
                                            className={`mx-auto rounded-lg mb-2 ${isCompact ? 'max-h-32' : 'max-h-48'}`}
                                        />
                                    ) : (
                                        <div className={isCompact ? 'py-4' : 'py-6'}>
                                            <ImageIcon size={isCompact ? 32 : 40} className="mx-auto text-slate-600 mb-2" />
                                            <p className={`text-slate-500 ${isCompact ? 'text-xs' : 'text-sm'}`}>
                                                Click to upload {isCompact ? 'or paste image (Ctrl/Cmd+V)' : 'image or PDF'}
                                            </p>
                                        </div>
                                    )}
                                    {file && (
                                        <p className={`text-emerald-400 truncate ${isCompact ? 'text-xs' : 'text-sm'}`}>
                                            {file.name}
                                        </p>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    accept="image/*,.pdf,application/pdf"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    disabled={loading}
                                />
                            </label>
                        </>
                    )}

                    {/* How it works (only in full variant) */}
                    {!isCompact && (
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
                            <p className="text-xs text-slate-500">
                                <strong>How it works:</strong><br />
                                1. AI scrapes the page and extracts item names, prices, descriptions<br />
                                2. A &quot;Proposal&quot; appears for your review<br />
                                3. Click &quot;Publish&quot; to add items to your catalog
                            </p>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className={`bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg ${isCompact ? 'text-xs px-3 py-2' : 'text-sm px-4 py-2'
                            }`}>
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className={`flex gap-2 ${isCompact ? 'mt-3' : 'items-center gap-3 pt-2'}`}>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || (mode === 'url' ? !url.trim() : !file)}
                            className={`flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium transition-colors ${isCompact ? 'px-3 py-2 text-sm rounded-lg' : 'px-4 py-3 rounded-xl'
                                }`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={isCompact ? 14 : 18} />
                                    {isCompact ? 'Extracting...' : 'Processing...'}
                                </>
                            ) : (
                                <>
                                    <Upload size={isCompact ? 14 : 18} />
                                    {isCompact ? 'Import' : 'Start Import'}
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleClose}
                            disabled={loading}
                            className={`bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white transition-colors ${isCompact ? 'px-3 py-2 text-sm rounded-lg' : 'px-4 py-3 rounded-xl'
                                }`}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportModal;
