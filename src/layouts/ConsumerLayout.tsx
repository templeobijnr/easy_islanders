import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

interface ConsumerLayoutProps {
    onOpenAuth: (view: 'login' | 'signup') => void;
    onAdminLogin: () => void;
    activeView: string;
}

/**
 * ConsumerLayout - Wrapper for all consumer-facing routes
 * Includes the standard Navbar and Footer
 */
const ConsumerLayout: React.FC<ConsumerLayoutProps> = ({
    onOpenAuth,
    onAdminLogin,
    activeView
}) => {
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar onOpenAuth={onOpenAuth} activeView={activeView as any} />
            <main className="flex-grow">
                <Outlet />
            </main>
            <Footer onAdminLogin={onAdminLogin} />
        </div>
    );
};

export default ConsumerLayout;
