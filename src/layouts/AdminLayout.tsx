import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield } from 'lucide-react';

/**
 * AdminLayout - Wrapper for all admin routes
 * Does NOT include consumer Navbar/Footer - Admin has its own UI
 * Handles auth verification and redirects non-admins
 */
const AdminLayout: React.FC = () => {
    const { isAdmin, isLoading, isAuthenticated } = useAuth();

    // Show loading state while verifying auth
    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 animate-pulse">
                        <Shield size={32} className="text-cyan-400" />
                    </div>
                    <div className="text-slate-400 text-sm font-mono">Verifying Admin Access...</div>
                </div>
            </div>
        );
    }

    // If not admin, redirect to admin login
    if (!isAdmin) {
        return <Navigate to="/admin/login" replace />;
    }

    // Admin verified - render child routes
    return (
        <div className="min-h-screen bg-slate-950">
            <Outlet />
        </div>
    );
};

export default AdminLayout;
