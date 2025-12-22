import React, { useState } from 'react';
import { X, Mail, Lock, Loader2, Shield, AlertCircle } from 'lucide-react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminAuthModal: React.FC<AdminAuthModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { forceRefreshToken } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPassword('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Use unified auth instance
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Force refresh token to get latest claims
      const idTokenResult = await userCredential.user.getIdTokenResult(true);

      // Check for admin claim (secure source of truth)
      if (!idTokenResult.claims.admin) {
        setError('Access denied. This account does not have admin privileges.');
        setIsLoading(false);
        // Sign out immediately if not admin
        await signOut(auth);
        return;
      }

      // Trigger context to refresh its claims
      await forceRefreshToken();

      setIsLoading(false);
      onClose();
      navigate('/admin');
    } catch (error: unknown) {
      console.error('Admin Login error:', error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setError('Invalid email or password');
      } else {
        setError(error.message || 'Failed to login');
      }
      setIsLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop with distinct color for Admin context */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose}></div>

      {/* Modal Card */}
      <div className="bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl relative z-10 flex flex-col overflow-hidden border border-slate-800">

        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
              <Shield size={18} className="text-cyan-400" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Admin Access
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-slate-400 mb-6">
            Enter your admin credentials to access the Control Tower.
          </p>

          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 animate-in slide-in-from-left-4 fade-in">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Admin Email</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 p-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-white placeholder-slate-600 outline-none transition-all"
                  placeholder="admin@easyislanders.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 p-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-white placeholder-slate-600 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-500 transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-cyan-900/20 mt-4"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Access Control Tower'}
            </button>
          </form>

          <p className="text-xs text-slate-600 text-center mt-6">
            Admin accounts are created by the Super Admin from the Control Tower.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminAuthModal;
