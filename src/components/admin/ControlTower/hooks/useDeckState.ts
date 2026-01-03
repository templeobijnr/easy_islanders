/**
 * useDeckState - Deck state management with validation
 * 
 * Returns validated deck state and setter.
 * Resets to DEFAULT_DECK if invalid deck is provided.
 */
import { useState, useCallback, useEffect } from "react";
import type { Deck } from "../types";
import { DEFAULT_DECK } from "../constants/uiConstants";
import { DECK_REGISTRY } from "../registry/deckRegistry";

export function useDeckState(initialDeck?: Deck) {
    const [activeDeck, setActiveDeckState] = useState<Deck>(initialDeck || DEFAULT_DECK);

    const setActiveDeck = useCallback((deck: Deck) => {
        // Validate against registry
        if (!DECK_REGISTRY[deck]) {
            console.warn(`[useDeckState] Invalid deck: ${deck}, resetting to ${DEFAULT_DECK}`);
            setActiveDeckState(DEFAULT_DECK);
            return;
        }
        setActiveDeckState(deck);
    }, []);

    // Validate initial state
    useEffect(() => {
        if (!DECK_REGISTRY[activeDeck]) {
            setActiveDeckState(DEFAULT_DECK);
        }
    }, []);

    return [activeDeck, setActiveDeck] as const;
}

export default useDeckState;
