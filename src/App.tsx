/**
 * App
 * 
 * Root application component with proper React Router integration.
 * Uses AppRoutes for centralized route configuration.
 */
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import AuthModal from './auth/AuthModal';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { AsyncProcessor } from './services/asyncProcessor';
import { AppRoutes } from './AppRoutes';

/**
 * Determines the active view based on pathname for Navbar highlighting
 */
function getActiveView(pathname: string): 'home' | 'discover' | 'explore' | 'connect' | 'messages' {
  if (pathname === '/discover') return 'discover';
  if (pathname.startsWith('/connect')) return 'connect';
  if (pathname === '/explore') return 'explore';
  if (pathname === '/messages') return 'messages';
  return 'home';
}

/**
 * Routes that should render without Navbar/Footer (full-screen experiences)
 */
const NO_LAYOUT_PATHS = [
  '/admin/login',
  '/admin',
  '/admin/merve',
  '/m',
  '/m/jobs',
  '/dashboard',
  '/dashboard/onboarding',
];

/**
 * Check if the current path should hide the main layout
 */
function shouldHideLayout(pathname: string): boolean {
  return NO_LAYOUT_PATHS.some(path =>
    pathname === path || pathname.startsWith(path + '/')
  );
}

const AppContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; view: 'login' | 'signup' }>({
    isOpen: false,
    view: 'login'
  });

  // Initialize Async Background Tasks
  useEffect(() => {
    AsyncProcessor.init();
    return () => AsyncProcessor.stop();
  }, []);

  const openAuth = (view: 'login' | 'signup') => {
    setAuthModal({ isOpen: true, view });
  };

  const closeAuth = () => {
    setAuthModal({ ...authModal, isOpen: false });
  };

  const handleExit = () => {
    navigate('/');
  };

  // Routes without Navbar/Footer
  if (shouldHideLayout(location.pathname)) {
    return (
      <>
        <AppRoutes onExit={handleExit} />
        <AuthModal
          isOpen={authModal.isOpen}
          initialView={authModal.view}
          onClose={closeAuth}
        />
      </>
    );
  }

  // Standard layout with Navbar and Footer
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        onOpenAuth={openAuth}
        activeView={getActiveView(location.pathname)}
      />

      <AppRoutes onExit={handleExit} />

      <Footer />

      <AuthModal
        isOpen={authModal.isOpen}
        initialView={authModal.view}
        onClose={closeAuth}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;
