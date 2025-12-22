/**
 * Merchant Entry Page
 * 
 * Handles magic link authentication.
 * Extracts ?token= from URL, exchanges for session, redirects to /m/jobs.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { exchangeMerchantToken } from '../../services/integrations/merchant/merchant.api';

type AuthState = 'loading' | 'error' | 'success';

const MerchantEntry: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [state, setState] = useState<AuthState>('loading');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const token = searchParams.get('token') || searchParams.get('t');

        if (!token) {
            setState('error');
            setErrorMessage('No token provided. Please use a valid magic link.');
            return;
        }

        exchangeMerchantToken(token)
            .then(() => {
                setState('success');
                // Short delay for UX, then redirect
                setTimeout(() => navigate('/m/jobs', { replace: true }), 500);
            })
            .catch((err) => {
                setState('error');
                setErrorMessage(err.message || 'Invalid or expired link');
            });
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
                {state === 'loading' && (
                    <div className="space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center">
                            <svg
                                className="w-8 h-8 text-blue-400 animate-spin"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                            </svg>
                        </div>
                        <h1 className="text-xl font-semibold text-white">Verifying your access...</h1>
                        <p className="text-slate-400">Please wait a moment</p>
                    </div>
                )}

                {state === 'success' && (
                    <div className="space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-semibold text-white">Access Verified</h1>
                        <p className="text-slate-400">Redirecting to your dashboard...</p>
                    </div>
                )}

                {state === 'error' && (
                    <div className="space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
                            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-semibold text-white">Access Denied</h1>
                        <p className="text-slate-400">{errorMessage}</p>
                        <div className="pt-4">
                            <p className="text-sm text-slate-500">
                                If you believe this is an error, please contact support or request a new link.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MerchantEntry;
