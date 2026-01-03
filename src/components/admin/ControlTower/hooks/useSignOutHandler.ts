/**
 * useSignOutHandler - Sign out logic
 * 
 * Handles async logout and navigation.
 */
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

interface UseSignOutHandlerParams {
    logout?: () => Promise<void>;
    redirectTo?: string;
}

export function useSignOutHandler({ logout, redirectTo = "/" }: UseSignOutHandlerParams) {
    const navigate = useNavigate();

    const handleSignOut = useCallback(async () => {
        try {
            await logout?.();
            navigate(redirectTo);
        } catch (error) {
            console.error("[useSignOutHandler] Sign out failed:", error);
            // Still navigate on error to prevent user being stuck
            navigate(redirectTo);
        }
    }, [logout, navigate, redirectTo]);

    return handleSignOut;
}

export default useSignOutHandler;
