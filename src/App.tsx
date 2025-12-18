import { logger } from "@/utils/logger";
import React, { useState, useEffect, useMemo } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import Hero from "./components/layout/Hero";
import AgentChat from "./pages/chat/AgentChat";
import LifestyleHighlights from "./pages/home/LifestyleHighlights";
import AboutSection from "./pages/home/AboutSection";
import ValueProps from "./pages/home/ValueProps";
import TrendingConnect from "./pages/home/TrendingConnect";
import FeaturedStays from "./pages/home/FeaturedStays";
import Explore from "./pages/explore/Explore";
import Discover from "./pages/discover";
import BusinessDashboard from "./dashboard/BusinessDashboard";
import BusinessOnboardingPage from "./dashboard/BusinessOnboardingPage";
import ControlTower from "./components/admin/ControlTower"; // Import Admin
import Connect from "./pages/connect/Connect";
import RequestsView from "./components/consumer/RequestsView";
import PromotionsView from "./components/consumer/PromotionsView";
import ProfileView from "./components/profile/ProfileView";
import SettingsView from "./components/settings/SettingsView";
import AuthModal from "./auth/AuthModal";
import AdminAuthModal from "./auth/AdminAuthModal";
import AdminLogin from "./pages/admin/AdminLogin";
import MerveController from "./pages/admin/MerveController";
import MerchantEntry from "./pages/merchant/MerchantEntry";
import MerchantJobs from "./pages/merchant/MerchantJobs";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AsyncProcessor } from "./services/asyncProcessor";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { logger } from "./utils/logger";

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    view: "login" | "signup";
  }>({ isOpen: false, view: "login" });
  const [adminAuthModalOpen, setAdminAuthModalOpen] = useState(false);

  // Secret keyboard shortcut: Ctrl+Shift+A -> admin login page
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "A") {
        // Navigate to admin login page
        navigate("/admin/login");
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [navigate]);

  // DEV HELPERS - Only in development mode
  useEffect(() => {
    // Skip all dev helpers in production
    if (!import.meta.env.DEV) return;

    // DEBUG: Check what API URL is being used
    const apiUrl = (import.meta as any).env.VITE_API_URL;
    logger.debug("Current API URL", { apiUrl });

    // Dev helper to promote current user to admin (local only)
    (window as any).__promoteToAdmin = () => {
      const stored = localStorage.getItem("islander_auth_user");
      if (stored) {
        const user = JSON.parse(stored);
        user.role = "admin";
        localStorage.setItem("islander_auth_user", JSON.stringify(user));
        logger.debug("👑 User promoted to ADMIN locally. Reloading...");
        window.location.reload();
      } else {
        console.warn("No user logged in. Please login first.");
      }
    };

    // Dev helper to seed first admin account (creates Firebase Auth user + Firestore doc)
    (window as any).__seedFirstAdmin = async (
      email: string,
      password: string,
    ) => {
      if (!email || !password) {
        console.error(
          "Usage: window.__seedFirstAdmin('email@example.com', 'password123')",
        );
        return;
      }
      try {
        const { createUserWithEmailAndPassword, updateProfile } =
          await import("firebase/auth");
        const { doc, setDoc, Timestamp } = await import("firebase/firestore");
        const { auth, db } = await import("./services/firebaseConfig");

        logger.debug("🔄 Creating admin account...");
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await updateProfile(userCredential.user, {
          displayName: "Super Admin",
        });

        await setDoc(doc(db, "users", userCredential.user.uid), {
          uid: userCredential.user.uid,
          displayName: "Super Admin",
          email: email,
          role: "admin",
          type: "admin",
          createdAt: Timestamp.now(),
          onboarded: true,
        });

        logger.debug("✅ Admin account created successfully!");
        logger.debug(
          "🔑 You can now login via the Admin Access link in the footer.",
        );
      } catch (err: any) {
        console.error("❌ Failed to create admin:", err.message);
      }
    };

    logger.debug("💡 Admin Tools Available:");
    logger.debug(
      "   - window.__promoteToAdmin() - Promote current user to admin (local only)",
    );
    logger.debug(
      "   - window.__seedFirstAdmin('email', 'password') - Create first admin account",
    );

    // Cleanup global helpers on unmount
    return () => {
      delete (window as any).__promoteToAdmin;
      delete (window as any).__seedFirstAdmin;
    };
  }, []);

  // Initialize Async Background Tasks - Only in development for now
  // TODO: Enable in production if needed with proper feature flag
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    AsyncProcessor.init();
    return () => AsyncProcessor.stop();
  }, []);

  const handleStartChat = () => {
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        const agentSection = document.getElementById("agent");
        if (agentSection) agentSection.scrollIntoView({ behavior: "smooth" });
      }, 200);
    } else {
      const agentSection = document.getElementById("agent");
      if (agentSection) agentSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const openAuth = (view: "login" | "signup") => {
    setAuthModal({ isOpen: true, view });
  };

  const closeAuth = () => {
    setAuthModal({ ...authModal, isOpen: false });
  };

  const pathKey = useMemo(() => {
    if (location.pathname.startsWith("/discover")) return "discover";
    if (location.pathname.startsWith("/explore")) return "explore";
    if (location.pathname.startsWith("/connect")) return "connect";
    if (location.pathname.startsWith("/messages")) return "messages";
    if (location.pathname.startsWith("/requests")) return "messages";
    return "home";
  }, [location.pathname]);

  // Route guards using unified AuthContext
  const RequireAuth: React.FC<{ children: React.ReactElement }> = ({
    children,
  }) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-400">
          <div className="animate-pulse">Loading...</div>
        </div>
      );
    }

    return isAuthenticated ? children : <Navigate to="/" replace />;
  };

  const RequireAdmin: React.FC<{ children: React.ReactElement }> = ({
    children,
  }) => {
    const { isAdmin, isLoading, isAuthenticated } = useAuth();

    if (isLoading) {
      return (
        <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
          <div className="animate-pulse">Verifying Admin Access...</div>
        </div>
      );
    }

    // If authenticated but not admin, redirect to home
    // If not authenticated at all, open admin login modal or redirect
    if (isAdmin) {
      return children;
    }

    // Not admin - redirect to home (they can use the admin login modal)
    return <Navigate to="/" replace />;
  };

  const HomePage = (
    <main className="flex-grow">
      <Hero
        onStartChat={handleStartChat}
        onExplore={() => navigate("/discover")}
      />
      <ValueProps />
      <AgentChat />
      <FeaturedStays onSeeAll={() => navigate("/discover")} />
      <LifestyleHighlights onSeeAll={() => navigate("/discover")} />
      <TrendingConnect />
      <AboutSection />
    </main>
  );

  // Hide global nav on dashboard, admin, and merchant pages
  const hideGlobalNav =
    location.pathname.startsWith("/dashboard") ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/m");

  return (
    <div className="min-h-screen flex flex-col">
      {!hideGlobalNav && (
        <Navbar onOpenAuth={openAuth} activeView={pathKey as any} />
      )}

      <Routes>
        <Route path="/" element={HomePage} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/connect" element={<Connect />} />
        <Route path="/messages" element={<RequestsView />} />
        <Route path="/requests" element={<RequestsView />} />
        <Route path="/promotions" element={<PromotionsView />} />
        <Route path="/profile" element={<ProfileView />} />
        <Route path="/settings" element={<SettingsView />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <BusinessDashboard onExit={() => navigate("/")} />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/onboarding"
          element={
            <RequireAuth>
              <BusinessOnboardingPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <ControlTower />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/merve"
          element={
            <RequireAdmin>
              <MerveController />
            </RequireAdmin>
          }
        />
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Merchant Portal (no nav, session-based auth) */}
        <Route path="/m" element={<MerchantEntry />} />
        <Route path="/m/jobs" element={<MerchantJobs />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!hideGlobalNav && (
        <Footer onAdminLogin={() => navigate("/admin/login")} />
      )}

      <AuthModal
        isOpen={authModal.isOpen}
        initialView={authModal.view}
        onClose={closeAuth}
      />

      <AdminAuthModal
        isOpen={adminAuthModalOpen}
        onClose={() => setAdminAuthModalOpen(false)}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;
