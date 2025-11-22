
import React, { useState, useEffect } from 'react';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Hero from './components/home/Hero';
import AgentChat from './components/agent/AgentChat';
import LifestyleHighlights from './components/home/LifestyleHighlights';
import AboutSection from './components/home/AboutSection';
import FeaturedDestinations from './components/home/FeaturedDestinations';
import FeaturedStays from './components/home/FeaturedStays';
import Explore from './components/explore/Explore';
import BusinessDashboard from './components/dashboard/BusinessDashboard';
import ControlTower from './components/admin/ControlTower'; // Import Admin
import Connect from './components/connect/Connect';
import RequestsView from './components/consumer/RequestsView';
import PromotionsView from './components/consumer/PromotionsView';
import ProfileView from './components/profile/ProfileView';
import SettingsView from './components/settings/SettingsView';
import AuthModal from './components/auth/AuthModal';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { AsyncProcessor } from './services/asyncProcessor';

type View = 'home' | 'dashboard' | 'connect' | 'requests' | 'promotions' | 'explore' | 'profile' | 'settings' | 'admin';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('home');
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; view: 'login' | 'signup' }>({ isOpen: false, view: 'login' });

  // Initialize Async Background Tasks
  useEffect(() => {
    AsyncProcessor.init();
    return () => AsyncProcessor.stop();
  }, []);

  const handleStartChat = () => {
    const agentSection = document.getElementById('agent');
    if (agentSection) {
      agentSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openAuth = (view: 'login' | 'signup') => {
    setAuthModal({ isOpen: true, view });
  };

  const closeAuth = () => {
    setAuthModal({ ...authModal, isOpen: false });
  };

  if (currentView === 'admin') {
    return <ControlTower onExit={() => setCurrentView('home')} />;
  }

  if (currentView === 'dashboard') {
    return <BusinessDashboard onExit={() => setCurrentView('home')} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar 
        onOpenDashboard={() => setCurrentView('dashboard')} 
        onOpenConnect={() => setCurrentView('connect')}
        onOpenRequests={() => setCurrentView('requests')}
        onOpenPromotions={() => setCurrentView('promotions')}
        onOpenExplore={() => setCurrentView('explore')}
        onOpenHome={() => setCurrentView('home')}
        onOpenProfile={() => setCurrentView('profile')}
        onOpenSettings={() => setCurrentView('settings')}
        onOpenAdmin={() => setCurrentView('admin')} // Admin Trigger
        onOpenAuth={openAuth}
        activeView={currentView}
      />
      
      {currentView === 'connect' && <Connect />}
      {currentView === 'requests' && <RequestsView />}
      {currentView === 'promotions' && <PromotionsView />}
      {currentView === 'explore' && <Explore />}
      {currentView === 'profile' && <ProfileView />}
      {currentView === 'settings' && <SettingsView />}

      {currentView === 'home' && (
        <main className="flex-grow">
          <Hero onStartChat={handleStartChat} onExplore={() => setCurrentView('explore')} />
          <AgentChat />
          <FeaturedStays onSeeAll={() => setCurrentView('explore')} />
          <LifestyleHighlights onSeeAll={() => setCurrentView('explore')} />
          <AboutSection />
          <FeaturedDestinations />
        </main>
      )}

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
