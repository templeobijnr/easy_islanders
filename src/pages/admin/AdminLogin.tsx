import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../../services/firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { Shield, Mail, Lock, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

/**
 * AdminLogin - Full-page admin login screen
 * Dedicated entry point for admin access, separate from consumer auth
 */
const AdminLogin: React.FC = () => {
    const navigate = useNavigate();
    const { isAdmin, isLoading: authLoading, forceRefreshToken } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // If already admin, redirect to dashboard
    useEffect(() => {
        if (!authLoading && isAdmin) {
            navigate('/admin', { replace: true });
        }
    }, [isAdmin, authLoading, navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            // Force refresh token to get latest claims
            const idTokenResult = await userCredential.user.getIdTokenResult(true);

            // Check for admin claim
            if (!idTokenResult.claims.admin) {
                setError('Access denied. This account does not have admin privileges.');
                await signOut(auth);
                setIsLoading(false);
                return;
            }

            // Trigger context refresh
            await forceRefreshToken();

            // Navigate to admin dashboard
            navigate('/admin', { replace: true });
        } catch (error: unknown) {
            console.error('Admin Login error:', error);
            if (
                error.code === 'auth/user-not-found' ||
                error.code === 'auth/wrong-password' ||
                error.code === 'auth/invalid-credential'
            ) {
                setError('Invalid email or password');
            } else {
                setError(error.message || 'Failed to login');
            }
            setIsLoading(false);
        }
    };

    // Show loading while checking auth state
    if (authLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-pulse text-slate-400">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-slate-950 to-slate-950" />

            {/* Login Card */}
            <div className="relative w-full max-w-md">
                {/* Back Link */}
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors mb-6 text-sm"
                >
                    <ArrowLeft size={16} />
                    Back to Easy Islanders
                </button>

                <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-800 flex items-center gap-4">
                        <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                            <Shield size={24} className="text-cyan-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Control Tower</h1>
                            <p className="text-sm text-slate-400">Administrator Access</p>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="p-6">
                        {error && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                                    Admin Email
                                </label>
                                <div className="relative group">
                                    <Mail
                                        className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-cyan-400 transition-colors"
                                        size={18}
                                    />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 p-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-white placeholder-slate-600 outline-none transition-all"
                                        placeholder="admin@easyislanders.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                                    Password
                                </label>
                                <div className="relative group">
                                    <Lock
                                        className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-cyan-400 transition-colors"
                                        size={18}
                                    />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 p-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-white placeholder-slate-600 outline-none transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3.5 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-500 transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-cyan-900/20 mt-6"
                            >
                                {isLoading ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    'Access Control Tower'
                                )}
                            </button>
                        </form>

                        <p className="text-xs text-slate-600 text-center mt-6">
                            Admin accounts are managed from the Control Tower.
                        </p>
                    </div>
                </div>

                {/* Version */}
                <div className="text-center mt-6 text-xs font-mono text-slate-700">
                    CONTROL TOWER v3.0
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
