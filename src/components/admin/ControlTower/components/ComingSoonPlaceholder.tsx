/**
 * ComingSoonPlaceholder - Reusable placeholder for coming soon decks
 * 
 * Used by deck registry for placeholder decks (financials, algorithm, moderation, sysconfig).
 */
import React from "react";
import { Lock } from "lucide-react";
import { COMING_SOON_TITLE, COMING_SOON_MESSAGE } from "../constants/uiConstants";

interface ComingSoonPlaceholderProps {
    deckName?: string;
}

export function ComingSoonPlaceholder({ deckName }: ComingSoonPlaceholderProps) {
    return (
        <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center">
                <Lock size={48} className="mx-auto text-slate-400 mb-4" />
                <h2 className="text-xl font-semibold text-slate-600 mb-2">
                    {COMING_SOON_TITLE}
                </h2>
                <p className="text-slate-400">{COMING_SOON_MESSAGE}</p>
                {deckName && (
                    <p className="text-slate-500 text-sm mt-2">{deckName}</p>
                )}
            </div>
        </div>
    );
}

export default ComingSoonPlaceholder;
