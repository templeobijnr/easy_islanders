/**
 * ControlTowerSidebar - Navigation sidebar for ControlTower
 * 
 * Renders header, user info, deck navigation, and footer.
 */
import React from "react";
import { LogOut, ChevronLeft, Lock } from "lucide-react";
import type { Deck } from "../types";
import { DECK_REGISTRY } from "../registry/deckRegistry";

interface User {
    name?: string;
    email?: string;
}

interface ControlTowerSidebarProps {
    user?: User | null;
    activeDeck: Deck;
    onDeckChange: (deck: Deck) => void;
    onSignOut: () => void;
    onExit: () => void;
}

export function ControlTowerSidebar({
    user,
    activeDeck,
    onDeckChange,
    onSignOut,
    onExit,
}: ControlTowerSidebarProps) {
    const deckEntries = Object.entries(DECK_REGISTRY) as [Deck, typeof DECK_REGISTRY[Deck]][];

    return (
        <div className="w-64 bg-slate-900 text-white flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-800">
                <button
                    onClick={onExit}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                >
                    <ChevronLeft size={18} />
                    Back to App
                </button>
            </div>

            {/* User */}
            <div className="p-4 border-b border-slate-800">
                <div className="font-semibold truncate">{user?.name || "Admin"}</div>
                <div className="text-xs text-slate-400 truncate">{user?.email}</div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                {deckEntries.map(([deckId, entry]) => {
                    const Icon = entry.icon;
                    const isActive = activeDeck === deckId;
                    const isDisabled = entry.disabled;

                    return (
                        <button
                            key={deckId}
                            onClick={() => !isDisabled && onDeckChange(deckId)}
                            disabled={isDisabled}
                            aria-disabled={isDisabled}
                            aria-label={entry.label}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? "bg-emerald-500 text-white"
                                    : isDisabled
                                        ? "text-slate-600 cursor-not-allowed"
                                        : "text-slate-300 hover:bg-slate-800"
                                }`}
                            title={entry.comingSoon ? "Coming Soon" : undefined}
                        >
                            <Icon size={18} />
                            <span className="flex-1 text-left">{entry.label}</span>
                            {entry.comingSoon && (
                                <Lock size={12} className="text-slate-600" />
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800">
                <button
                    onClick={onSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
                >
                    <LogOut size={16} />
                    Sign Out
                </button>
            </div>
        </div>
    );
}

export default ControlTowerSidebar;
