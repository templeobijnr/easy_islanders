
import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Briefcase, ArrowRight, Building2, Loader2, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { UserType } from '../../types';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../../services/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

interface AuthModalProps {
  isOpen: boolean;
  initialView: 'login' | 'signup';
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, initialView, onClose }) => {
  const { login } = useAuth();
  const { t } = useLanguage();

  const [view, setView] = useState<'login' | 'signup'>(initialView);
  // If initial view is login, step is irrelevant. If signup, start at 1.
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [selectedAccountType, setSelectedAccountType] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');

  // Reset state when modal opens/closes or view changes
  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setSignupStep(1);
      setSelectedAccountType(null);
      setEmail('');
      setPassword('');
      setName('');
      setBusinessName('');
    }
  }, [isOpen, initialView]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // AuthContext will handle setting the user via onAuthStateChanged
      setIsLoading(false);
      onClose();
    } catch (error: any) {
      console.error('Login error:', error);
      alert(`Login failed: ${error.message}`);
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountType) return;

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Update display name
      await updateProfile(userCredential.user, { displayName: name });

      // Create user document in Firestore
      // Create user document in Firestore
      const userDocData = {
        uid: userCredential.user.uid,
        displayName: name,
        email: email,
        type: selectedAccountType,
        ...(selectedAccountType === 'business' && { businessName }),
        createdAt: new Date()
      };
      await setDoc(doc(db, 'users', userCredential.user.uid), userDocData);

      // Set custom user data in context
      const userData = {
        id: userCredential.user.uid,
        name: name,
        email: email,
        type: selectedAccountType,
        businessName: selectedAccountType === 'business' ? businessName : undefined
      };
      login(userData);

      setIsLoading(false);
      onClose();
    } catch (error: any) {
      console.error('Signup error:', error);
      alert(`Signup failed: ${error.message}`);
      setIsLoading(false);
    }
  };

  const switchView = (newView: 'login' | 'signup') => {
    setView(newView);
    setSignupStep(1);
    setSelectedAccountType(null);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal Card */}
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden transform transition-all scale-100 border border-slate-100">

        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100 bg-white sticky top-0 z-20">
          <div className="flex items-center gap-2">
            {view === 'signup' && signupStep === 2 && (
              <button onClick={() => setSignupStep(1)} className="p-1 -ml-2 mr-1 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                <ChevronLeft size={20} />
              </button>
            )}
            <h2 className="text-xl font-bold text-slate-900">
              {view === 'login' ? t('welcome_back') : (signupStep === 1 ? t('account_type_title') : t('create_account'))}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"><X size={20} /></button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto custom-scrollbar">

          {/* --- LOGIN FORM --- */}
          {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5 animate-in slide-in-from-left-4 fade-in">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('email')}</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-slate-800 transition-colors" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none transition-all"
                    placeholder="name@example.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('password')}</label>
                  <span className="text-xs font-bold text-teal-600 cursor-pointer hover:underline">Forgot?</span>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-slate-800 transition-colors" size={18} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-slate-900/20"
              >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : t('continue')}
              </button>

              <div className="text-center pt-2">
                <span className="text-sm text-slate-500">Don't have an account? </span>
                <button type="button" onClick={() => switchView('signup')} className="text-sm font-bold text-teal-600 hover:underline">
                  {t('signup')}
                </button>
              </div>
            </form>
          )}

          {/* --- SIGNUP: STEP 1 (ACCOUNT TYPE) --- */}
          {view === 'signup' && signupStep === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 fade-in">
              <p className="text-sm text-slate-500 mb-4 text-center">Select the account type that best fits your needs.</p>

              <button
                onClick={() => { setSelectedAccountType('personal'); setSignupStep(2); }}
                className="w-full p-4 rounded-2xl border-2 border-slate-100 hover:border-teal-500 bg-white hover:bg-teal-50/50 text-left transition-all flex items-start gap-4 group"
              >
                <div className="p-3 rounded-xl bg-teal-50 text-teal-600 group-hover:bg-teal-100 transition-colors">
                  <User size={24} />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-lg">{t('account_personal')}</div>
                  <div className="text-xs text-slate-500 mt-1 leading-relaxed">{t('account_personal_desc')}</div>
                </div>
                <div className="ml-auto self-center opacity-0 group-hover:opacity-100 transition-opacity text-teal-600">
                  <ArrowRight size={20} />
                </div>
              </button>

              <button
                onClick={() => { setSelectedAccountType('business'); setSignupStep(2); }}
                className="w-full p-4 rounded-2xl border-2 border-slate-100 hover:border-blue-500 bg-white hover:bg-blue-50/50 text-left transition-all flex items-start gap-4 group"
              >
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                  <Building2 size={24} />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-lg">{t('account_business')}</div>
                  <div className="text-xs text-slate-500 mt-1 leading-relaxed">{t('account_business_desc')}</div>
                </div>
                <div className="ml-auto self-center opacity-0 group-hover:opacity-100 transition-opacity text-blue-600">
                  <ArrowRight size={20} />
                </div>
              </button>

              <div className="text-center pt-4 border-t border-slate-100 mt-4">
                <span className="text-sm text-slate-500">Already have an account? </span>
                <button type="button" onClick={() => switchView('login')} className="text-sm font-bold text-teal-600 hover:underline">
                  {t('login')}
                </button>
              </div>
            </div>
          )}

          {/* --- SIGNUP: STEP 2 (DETAILS FORM) --- */}
          {view === 'signup' && signupStep === 2 && (
            <form onSubmit={handleSignup} className="space-y-5 animate-in slide-in-from-right-4 fade-in">

              {/* Name Field */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('full_name')}</label>
                <div className="relative group">
                  <User className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-slate-800 transition-colors" size={18} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none transition-all"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              {/* Business Name (Conditional) */}
              {selectedAccountType === 'business' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('business_name')}</label>
                  <div className="relative group">
                    <Briefcase className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-slate-800 transition-colors" size={18} />
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={e => setBusinessName(e.target.value)}
                      className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none transition-all"
                      placeholder="My Island Business"
                    />
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('email')}</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-slate-800 transition-colors" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none transition-all"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t('password')}</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-slate-800 transition-colors" size={18} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-slate-900/20"
              >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : t('create_account')}
              </button>

              <div className="text-center pt-2">
                <span className="text-sm text-slate-500">Already have an account? </span>
                <button type="button" onClick={() => switchView('login')} className="text-sm font-bold text-teal-600 hover:underline">
                  {t('login')}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default AuthModal;
