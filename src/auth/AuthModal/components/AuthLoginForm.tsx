/**
 * AuthLoginForm - Login form component
 */
import React from "react";
import { Mail, Lock, Loader2 } from "lucide-react";
import type { AuthFormState } from "../types";

interface AuthLoginFormProps {
    form: AuthFormState;
    onUpdate: (updates: Partial<AuthFormState>) => void;
    onSubmit: (e: React.FormEvent) => void;
    onSwitchView: () => void;
    isLoading: boolean;
    error: string | null;
}

const AuthLoginForm: React.FC<AuthLoginFormProps> = ({ form, onUpdate, onSubmit, onSwitchView, isLoading, error }) => {
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="email" value={form.email} onChange={(e) => onUpdate({ email: e.target.value })} placeholder="you@example.com" required className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="password" value={form.password} onChange={(e) => onUpdate({ password: e.target.value })} placeholder="••••••••" required className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl">{error}</div>}

            <button type="submit" disabled={isLoading} className="w-full py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors">
                {isLoading ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Sign In"}
            </button>

            <p className="text-center text-sm text-slate-600">
                Don't have an account?{" "}
                <button type="button" onClick={onSwitchView} className="text-emerald-600 font-semibold hover:underline">Sign up</button>
            </p>
        </form>
    );
};

export default AuthLoginForm;
