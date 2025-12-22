/**
 * AuthModal - Composer
 *
 * Split Plan:
 * - Extracted types: types.ts
 * - Extracted hooks: useAuthModal.ts (step machine + handlers)
 * - Extracted components: AuthLoginForm, AuthSignupForm
 * - Behavior preserved: yes (no UI change)
 */
import React from "react";
import { X, Compass, Briefcase, MessageCircle, Loader2 } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useAuthModal } from "./hooks/useAuthModal";
import { AuthLoginForm, AuthSignupForm } from "./components";
import type { AuthModalProps } from "./types";
import type { UserType } from "../../../types";

const USER_TYPES: { type: UserType; label: string; icon: React.ReactNode; desc: string }[] = [
    { type: "tourist", label: "Explorer", icon: <Compass size={24} />, desc: "Visiting or living in Cyprus" },
    { type: "agent", label: "Business", icon: <Briefcase size={24} />, desc: "I have a business to promote" },
];

const AuthModal: React.FC<AuthModalProps> = (props) => {
    const { isOpen, onClose } = props;
    const { t } = useLanguage();
    const vm = useAuthModal(props);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-bold text-slate-900">
                        {vm.view === "login" ? "Welcome Back" : vm.view === "signup" ? "Create Account" : "Almost There!"}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {vm.view === "login" && (
                        <AuthLoginForm form={vm.form} onUpdate={vm.updateForm} onSubmit={vm.handleLogin} onSwitchView={() => vm.switchView("signup")} isLoading={vm.isLoading} error={vm.error} />
                    )}

                    {vm.view === "signup" && !vm.showOnboarding && (
                        <AuthSignupForm form={vm.form} onUpdate={vm.updateForm} onSubmit={vm.handleSignup} onSwitchView={() => vm.switchView("login")} isLoading={vm.isLoading} error={vm.error} />
                    )}

                    {vm.showOnboarding && (
                        <div className="space-y-4">
                            <p className="text-slate-600 text-sm">Tell us a bit about yourself</p>

                            <div className="grid grid-cols-2 gap-3">
                                {USER_TYPES.map((ut) => (
                                    <button key={ut.type} onClick={() => vm.setOnboarding((prev) => ({ ...prev, userType: ut.type }))} className={`p-4 rounded-xl border-2 text-center transition-all ${vm.onboarding.userType === ut.type ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}>
                                        <div className={`mx-auto mb-2 ${vm.onboarding.userType === ut.type ? "text-emerald-600" : "text-slate-400"}`}>{ut.icon}</div>
                                        <div className="font-semibold text-slate-900">{ut.label}</div>
                                        <div className="text-xs text-slate-500">{ut.desc}</div>
                                    </button>
                                ))}
                            </div>

                            {vm.error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl">{vm.error}</div>}

                            <button onClick={vm.finishOnboarding} disabled={!vm.onboarding.userType || vm.isLoading} className="w-full py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors">
                                {vm.isLoading ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Get Started"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
