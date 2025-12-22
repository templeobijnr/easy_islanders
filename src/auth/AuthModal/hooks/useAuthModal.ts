/**
 * useAuthModal - Step machine and handlers for auth modal
 */
import { useState, useCallback } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "@/services/firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import type { UserType } from "../../../types";
import type { AuthView, AuthFormState, OnboardingState, AuthModalProps } from "./types";

export function useAuthModal({ initialView, onClose }: Omit<AuthModalProps, "isOpen">) {
    const { checkAuth } = useAuth();
    const [view, setView] = useState<AuthView>(initialView);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showOnboarding, setShowOnboarding] = useState(false);

    const [form, setForm] = useState<AuthFormState>({ email: "", password: "", name: "", confirmPassword: "" });
    const [onboarding, setOnboarding] = useState<OnboardingState>({ userType: null, interests: [] });

    const updateForm = useCallback((updates: Partial<AuthFormState>) => setForm((prev) => ({ ...prev, ...updates })), []);

    const switchView = useCallback((newView: "login" | "signup") => {
        setView(newView);
        setError(null);
        setForm({ email: "", password: "", name: "", confirmPassword: "" });
    }, []);

    const handleLogin = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            await signInWithEmailAndPassword(auth, form.email, form.password);
            await checkAuth?.();
            onClose();
        } catch (err: any) {
            setError(err.message || "Login failed");
        } finally {
            setIsLoading(false);
        }
    }, [form.email, form.password, checkAuth, onClose]);

    const handleSignup = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        setIsLoading(true);
        setError(null);

        try {
            const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
            if (form.name) await updateProfile(cred.user, { displayName: form.name });
            setShowOnboarding(true);
            setView("onboarding");
        } catch (err: any) {
            setError(err.message || "Signup failed");
        } finally {
            setIsLoading(false);
        }
    }, [form]);

    const finishOnboarding = useCallback(async () => {
        setIsLoading(true);
        try {
            const user = auth.currentUser;
            if (user && onboarding.userType) {
                await setDoc(doc(db, "users", user.uid), {
                    email: user.email,
                    displayName: user.displayName || form.name,
                    userType: onboarding.userType,
                    interests: onboarding.interests,
                    createdAt: new Date(),
                }, { merge: true });
            }
            await checkAuth?.();
            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to save preferences");
        } finally {
            setIsLoading(false);
        }
    }, [onboarding, form.name, checkAuth, onClose]);

    return {
        view,
        isLoading,
        error,
        form,
        onboarding,
        showOnboarding,
        updateForm,
        setOnboarding,
        switchView,
        handleLogin,
        handleSignup,
        finishOnboarding,
    };
}
