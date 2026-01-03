/**
 * DeckErrorFallback - Error fallback UI for deck errors
 * 
 * Displayed when a deck component throws an error.
 */
import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface DeckErrorFallbackProps {
    deckName: string;
    error?: Error;
    onRetry?: () => void;
}

export function DeckErrorFallback({ deckName, error, onRetry }: DeckErrorFallbackProps) {
    return (
        <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center max-w-md">
                <AlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
                <h2 className="text-xl font-semibold text-slate-600 mb-2">
                    Something went wrong
                </h2>
                <p className="text-slate-400 mb-4">
                    Failed to load {deckName}. Please try again.
                </p>
                {error && process.env.NODE_ENV === "development" && (
                    <pre className="text-xs text-left bg-red-50 p-3 rounded-lg text-red-600 mb-4 overflow-auto max-h-32">
                        {error.message}
                    </pre>
                )}
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
                    >
                        <RefreshCw size={16} />
                        Retry
                    </button>
                )}
            </div>
        </div>
    );
}

export default DeckErrorFallback;
