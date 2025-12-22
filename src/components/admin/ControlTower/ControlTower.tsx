/**
 * ControlTower - Main dashboard composer
 *
 * Split Plan:
 * - Extracted types: types.ts
 * - Extracted constants: constants.ts
 * - Main file is thin composer loading child decks
 * - Behavior preserved: yes (no UI change)
 */
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, ChevronLeft } from "lucide-react";
import CurationDeck from "../ConnectManager/CurationDeck/CurationDeck";
import CatalogDeck from "../CatalogManager/CatalogDeck";
import AdminManagement from "../AdminManagement";
import BookingsDeck from "../BookingsDeck";
import DiscoverControlDeck from "../DiscoverManager/DiscoverControlDeck";
import { DECKS } from "./constants";
import type { ControlTowerProps, Deck } from "./types";

const ControlTower: React.FC<ControlTowerProps> = ({ onExit }) => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [activeDeck, setActiveDeck] = useState<Deck>("catalog");

    const handleSignOut = async () => {
        await signOut?.();
        navigate("/");
    };

    const handleExit = () => {
        if (onExit) onExit();
        else navigate("/");
    };

    const renderMainContent = () => {
        switch (activeDeck) {
            case "catalog": return <CatalogDeck />;
            case "connect": return <CurationDeck />;
            case "bookings": return <BookingsDeck />;
            case "discover": return <DiscoverControlDeck />;
            case "admin": return <AdminManagement />;
            case "settings": return <div className="p-6 text-center text-slate-400">Settings coming soon</div>;
            default: return <CatalogDeck />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex">
            {/* Sidebar */}
            <div className="w-64 bg-slate-900 text-white flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-800">
                    <button onClick={handleExit} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                        <ChevronLeft size={18} /> Back to App
                    </button>
                </div>

                {/* User */}
                <div className="p-4 border-b border-slate-800">
                    <div className="font-semibold truncate">{user?.displayName || "Admin"}</div>
                    <div className="text-xs text-slate-400 truncate">{user?.email}</div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-2 space-y-1">
                    {DECKS.map((deck) => {
                        const Icon = deck.icon;
                        const isActive = activeDeck === deck.id;
                        return (
                            <button
                                key={deck.id}
                                onClick={() => setActiveDeck(deck.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-emerald-500 text-white" : "text-slate-300 hover:bg-slate-800"
                                    }`}
                            >
                                <Icon size={18} /> {deck.label}
                            </button>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800">
                    <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-sm">
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                {renderMainContent()}
            </div>
        </div>
    );
};

export default ControlTower;
