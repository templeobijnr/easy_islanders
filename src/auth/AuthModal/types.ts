/**
 * AuthModal - Types
 *
 * Split Plan:
 * - Extracted types: types.ts
 * - Extracted hooks: useAuthModal.ts (step machine + handlers)
 * - Extracted components: AuthLoginForm, AuthSignupForm, AuthOnboarding
 * - Behavior preserved: yes (no UI change)
 */
import type { UserType } from "../../../types";

export type AuthView = "login" | "signup" | "onboarding";

export interface AuthModalProps {
    isOpen: boolean;
    initialView: "login" | "signup";
    onClose: () => void;
}

export interface AuthFormState {
    email: string;
    password: string;
    name: string;
    confirmPassword: string;
}

export interface OnboardingState {
    userType: UserType | null;
    interests: string[];
}
