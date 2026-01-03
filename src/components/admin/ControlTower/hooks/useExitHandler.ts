/**
 * useExitHandler - Exit logic
 * 
 * Calls onExit callback if provided, else navigates.
 */
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

interface UseExitHandlerParams {
    onExit?: () => void;
    redirectTo?: string;
}

export function useExitHandler({ onExit, redirectTo = "/" }: UseExitHandlerParams) {
    const navigate = useNavigate();

    const handleExit = useCallback(() => {
        if (onExit) {
            onExit();
        } else {
            navigate(redirectTo);
        }
    }, [onExit, navigate, redirectTo]);

    return handleExit;
}

export default useExitHandler;
