
import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Briefcase, Loader2, Compass, MessageCircle } from 'lucide-react';
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
  const [onboardingStep, setOnboardingStep] = useState<'none' | 'role' | 'persona' | 'tips'>('none');
  const [selectedAccountType, setSelectedAccountType] = useState<UserType | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Reset state when modal opens/closes or view changes
  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setSelectedAccountType(null);
      setSelectedPersona(null);
      setOnboardingStep('none');
      setEmail('');
      setPassword('');
      setName('');
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

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });

      const userDocData = {
        uid: userCredential.user.uid,
        displayName: name,
        email: email,
        type: 'personal' as UserType, // default, refined in onboarding
        createdAt: new Date(),
        onboarded: false
      };
      await setDoc(doc(db, 'users', userCredential.user.uid), userDocData);

      const userData = {
        id: userCredential.user.uid,
        name: name,
        email: email,
        type: 'personal' as UserType
      };
      login(userData);

      setIsLoading(false);
      setOnboardingStep('role');
    } catch (error: any) {
      console.error('Signup error:', error);
      alert(`Signup failed: ${error.message}`);
      setIsLoading(false);
    }
  };

  const switchView = (newView: 'login' | 'signup') => {
    setView(newView);
    setSelectedAccountType(null);
    setSelectedPersona(null);
    setOnboardingStep('none');
  };

  const finishOnboarding = async () => {
    if (!selectedAccountType) return;
    const currentUser = auth.currentUser;
    if (currentUser) {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        uid: currentUser.uid,
        displayName: currentUser.displayName || name,
        email: currentUser.email,
        type: selectedAccountType,
        persona: selectedPersona || null,
        onboarded: true,
        updatedAt: new Date()
      }, { merge: true });
      login({
        id: currentUser.uid,
        name: currentUser.displayName || name,
        email: currentUser.email || '',
        type: selectedAccountType
      });
    }
    onClose();
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
            <h2 className="text-xl font-bold text-slate-900">
              {onboardingStep !== 'none'
                ? 'Welcome'
                : view === 'login'
                  ? t('welcome_back')
                  : t('create_account')}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"><X size={20} /></button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {/* Onboarding flow */}
          {onboardingStep !== 'none' && (
            <div className="space-y-6 animate-in fade-in">
              {onboardingStep === 'role' && (
                <>
                  <p className="text-sm text-slate-500">Welcome, Islander. For a personalized experience, tell us what best describes you.</p>
                  <div className="space-y-3">
                    <button
                      onClick={() => { setSelectedAccountType('business'); setOnboardingStep('tips'); }}
                      className={`w-full p-4 rounded-2xl border-2 ${selectedAccountType === 'business' ? 'border-teal-600 bg-teal-50' : 'border-slate-100 bg-white'} hover:border-teal-500 transition-all flex items-center gap-3`}
                    >
                      <div className="p-3 rounded-xl bg-teal-50 text-teal-600"><Briefcase size={20} /></div>
                      <div>
                        <div className="font-bold text-slate-900">Business</div>
                        <div className="text-xs text-slate-500">Set up your business dashboard, manage listings, and bookings.</div>
                      </div>
                    </button>
                    <button
                      onClick={() => { setSelectedAccountType('personal'); setOnboardingStep('persona'); }}
                      className={`w-full p-4 rounded-2xl border-2 ${selectedAccountType === 'personal' ? 'border-teal-600 bg-teal-50' : 'border-slate-100 bg-white'} hover:border-teal-500 transition-all flex items-center gap-3`}
                    >
                      <div className="p-3 rounded-xl bg-slate-50 text-slate-600"><User size={20} /></div>
                      <div>
                        <div className="font-bold text-slate-900">Personal</div>
                        <div className="text-xs text-slate-500">Plan stays, book experiences, and chat with your concierge.</div>
                      </div>
                    </button>
                  </div>
                </>
              )}

              {onboardingStep === 'persona' && (
                <>
                  <p className="text-sm text-slate-500">What describes you best?</p>
                  <div className="grid grid-cols-2 gap-3">
                    {['Local', 'Student', 'Expat', 'Traveler'].map(option => (
                      <button
                        key={option}
                        onClick={() => { setSelectedPersona(option); setOnboardingStep('tips'); }}
                        className={`p-4 rounded-2xl border-2 ${selectedPersona === option ? 'border-teal-600 bg-teal-50' : 'border-slate-100 bg-white'} hover:border-teal-500 transition-all text-left`}
                      >
                        <div className="font-bold text-slate-900">{option}</div>
                        <div className="text-xs text-slate-500">Tailored tips and offers for {option.toLowerCase()}s.</div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {onboardingStep === 'tips' && (
                <>
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex gap-3">
                      <MessageCircle className="text-teal-600" size={20} />
                      <div>
                        <div className="font-bold text-slate-900">Chat</div>
                        <div className="text-xs text-slate-600">Ask the agent anything—book stays, cars, restaurants, or get tailored advice.</div>
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex gap-3">
                      <Compass className="text-slate-600" size={20} />
                      <div>
                        <div className="font-bold text-slate-900">Explore</div>
                        <div className="text-xs text-slate-600">Browse properties, experiences, and services. Chat can still help you book.</div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={finishOnboarding}
                    className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                  >
                    Continue
                  </button>
                </>
              )}
            </div>
          )}

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
          {/* --- SIGNUP FORM --- */}
          {view === 'signup' && onboardingStep === 'none' && (
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
