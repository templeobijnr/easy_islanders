/**
 * ControlTower - Main dashboard composer
 *
 * Modular architecture:
 * - Uses deck registry for component lookup (deckRegistry.ts)
 * - Uses extracted hooks (useDeckState, useSignOutHandler, useExitHandler)
 * - Uses extracted components (ControlTowerSidebar, DeckErrorBoundary)
 * - Decks are lazy-loaded for code splitting
 */
import React, { Suspense, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { Loader2 } from "lucide-react";

import type { ControlTowerProps } from "./types";
import { useDeckState, useSignOutHandler, useExitHandler } from "./hooks";
import { getDeckComponent, validateRegistryCompleteness, DECK_REGISTRY } from "./registry";
import { ControlTowerSidebar } from "./components";
import { DeckErrorBoundary } from "../shared";

const ControlTower: React.FC<ControlTowerProps> = ({ onExit }) => {
    const { user, logout } = useAuth();
    const [activeDeck, setActiveDeck] = useDeckState();
    const handleSignOut = useSignOutHandler({ logout });
    const handleExit = useExitHandler({ onExit });

    // Validate registry completeness on mount (development only)
    useEffect(() => {
        if (process.env.NODE_ENV === "development") {
            validateRegistryCompleteness();
        }
    }, []);

    // Get deck component from registry
    const DeckComponent = getDeckComponent(activeDeck);
    const currentDeckConfig = DECK_REGISTRY[activeDeck];

    return (
        <div className="min-h-screen bg-slate-100 flex">
            <ControlTowerSidebar
                user={user}
                activeDeck={activeDeck}
                onDeckChange={setActiveDeck}
                onSignOut={handleSignOut}
                onExit={handleExit}
            />

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto bg-slate-800">
                <DeckErrorBoundary
                    key={activeDeck} // Reset error state on deck change
                    deckName={currentDeckConfig.label}
                >
                    <Suspense
                        fallback={
                            <div className="flex-1 flex items-center justify-center p-12">
                                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                            </div>
                        }
                    >
                        <DeckComponent />
                    </Suspense>
                </DeckErrorBoundary>
            </div>
        </div>
    );
};

export default ControlTower;
