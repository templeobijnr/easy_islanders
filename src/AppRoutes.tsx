/**
 * AppRoutes
 * 
 * Centralized route configuration for the application.
 * All routes are defined here for easy management and discoverability.
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Core pages
import HomePage from './pages/HomePage';
import Connect from './pages/connect/Connect';
import Discover from './pages/discover';
import Explore from './pages/explore/Explore';
import RequestsView from './components/consumer/RequestsView';
import PromotionsView from './components/consumer/PromotionsView';
import ProfileView from './components/profile/ProfileView';
import SettingsView from './components/settings/SettingsView';

// Admin pages
import ControlTower from './components/admin/ControlTower';
import AdminLogin from './pages/admin/AdminLogin';
import MerveController from './pages/admin/MerveController';
import { AdminProtectedRoute } from './auth/AdminProtectedRoute';

// Dashboard pages
import BusinessDashboard from './dashboard/BusinessDashboard';
import BusinessOnboardingPage from './dashboard/BusinessOnboardingPage';

// Merchant pages
import MerchantEntry from './pages/merchant/MerchantEntry';
import MerchantJobs from './pages/merchant/MerchantJobs';

// Detail pages
import { ConnectDetail } from './components/connect/ConnectDetail';

// Layout wrapper for pages that need navbar/footer - passed from App.tsx
interface AppRoutesProps {
    /** Called when exiting admin/dashboard views */
    onExit?: () => void;
}

export function AppRoutes({ onExit }: AppRoutesProps) {
    const handleExit = onExit ?? (() => { window.location.href = '/'; });

    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/connect" element={<Connect />} />
            <Route path="/connect/:id" element={<ConnectDetail />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/requests" element={<RequestsView />} />
            <Route path="/promotions" element={<PromotionsView />} />
            <Route path="/profile" element={<ProfileView />} />
            <Route path="/settings" element={<SettingsView />} />

            {/* Chat redirect - home has embedded chat */}
            <Route path="/chat" element={<Navigate to="/" replace />} />

            {/* Merchant Routes (no auth - uses magic link tokens) */}
            <Route path="/m" element={<MerchantEntry />} />
            <Route path="/m/jobs" element={<MerchantJobs />} />

            {/* Dashboard Routes */}
            <Route path="/dashboard" element={<BusinessDashboard onExit={handleExit} />} />
            <Route path="/dashboard/onboarding" element={<BusinessOnboardingPage />} />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={
                <AdminProtectedRoute>
                    <ControlTower onExit={handleExit} />
                </AdminProtectedRoute>
            } />
            <Route path="/admin/merve" element={
                <AdminProtectedRoute>
                    <MerveController />
                </AdminProtectedRoute>
            } />

            {/* Messages placeholder - redirects to home until implemented */}
            <Route path="/messages" element={<Navigate to="/" replace />} />

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default AppRoutes;
