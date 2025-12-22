
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
   LayoutDashboard, List, Calendar as CalendarIcon,
   MessageSquare, Users, Send, Settings, LogOut,
   Store, Building2, Menu, Inbox, PlusCircle, Car, Loader2,
   Brain, Package
} from 'lucide-react';
import { BusinessConfig } from '../../types';
import { StorageService } from '../services/infrastructure/storage/local-storage.service';
import BusinessOnboarding from './BusinessOnboarding';
import { useAuth } from '../context/AuthContext';
import { fetchWithAuth } from '../services/integrations/backend/v1.api';
import { logger } from '../utils/logger';

// Modules
import OverviewModule from './modules/OverviewModule';
import ProfileModule from './modules/ProfileModule';
import CalendarModule from './modules/CalendarModule';
import InboxModule from './modules/InboxModule';
import TeachAgentModule from './modules/TeachAgentModule';
import EventsModule from './modules/EventsModule';
import AgentSettingsModule from './modules/AgentSettingsModule';

interface BusinessDashboardProps {
   onExit: () => void;
}

type DashboardModule = 'overview' | 'profile' | 'calendar' | 'teach' | 'inbox' | 'events' | 'settings';

const BusinessDashboard: React.FC<BusinessDashboardProps> = ({ onExit }) => {
   const navigate = useNavigate();
   const { user, firebaseUser, claims, forceRefreshToken, isLoading: authLoading } = useAuth();
   const [config, setConfig] = useState<BusinessConfig>({ domain: null, subType: null, businessName: '' });
   const [activeModule, setActiveModule] = useState<DashboardModule>('teach');
   const [isLoading, setIsLoading] = useState(true);
   const [businessLoaded, setBusinessLoaded] = useState(false); // Track if we've loaded business data
   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
   const [onboardingKey, setOnboardingKey] = useState(0);
   const [loadError, setLoadError] = useState<string | null>(null);
   const [showBusinessSwitcher, setShowBusinessSwitcher] = useState(false);
   const [businesses, setBusinesses] = useState<Array<{ businessId: string; role: string; businessName?: string }>>([]);
   const [entitlements, setEntitlements] = useState<{ maxBusinesses: number; plan: string; currentCount: number; canAddMore: boolean } | null>(null);
   const [switchError, setSwitchError] = useState<string | null>(null);

   // Prevent double-fetching for the same businessId (React StrictMode, token refresh, etc.)
   const fetchedBusinessId = useRef<string | null>(null);

   React.useEffect(() => {
      const load = async () => {
         if (authLoading) {
            logger.debug('[BusinessDashboard] Still loading auth');
            return;
         }

         // Claims are the ONLY source of truth for business access.
         if (!firebaseUser) {
            logger.debug('[BusinessDashboard] No firebaseUser, showing onboarding');
            setIsLoading(false);
            return;
         }

         if (claims?.role !== 'owner' || !claims.businessId) {
            logger.debug('[BusinessDashboard] Missing owner role or businessId, showing onboarding', { role: claims?.role });
            setIsLoading(false);
            return;
         }

         // Prevent double-fetch for the same businessId
         if (fetchedBusinessId.current === claims.businessId) {
            logger.debug('[BusinessDashboard] Already fetched for businessId, skipping');
            return;
         }

         setIsLoading(true);
         setLoadError(null);

         logger.debug('[BusinessDashboard] Auth loaded', { hasFirebaseUser: !!firebaseUser });

         try {
            logger.debug('[BusinessDashboard] Fetching /owner/business');
            const data = await fetchWithAuth<any>(firebaseUser, '/owner/business');
            logger.debug('[BusinessDashboard] /owner/business response', {
               hasBusiness: !!data?.business,
               hasBusinessId: !!data?.business?.id
            });
            const business = data?.business;

            if (!business?.id) {
               logger.error('[BusinessDashboard] API returned no business.id');
               throw new Error('Business not found');
            }

            fetchedBusinessId.current = claims.businessId;

            const businessName = business.displayName || 'Business';
            logger.debug('[BusinessDashboard] Setting business config');

            setConfig(prev => ({
               ...prev,
               id: business.id,
               businessName: businessName,
               ownerUid: user?.id
            }));

            // Mark as loaded AFTER setting config
            setBusinessLoaded(true);

            // Cache for UI convenience only (NOT for authorization)
            await StorageService.saveBusinessConfig({
               id: business.id,
               businessName: businessName,
               domain: null,
               subType: null,
               ownerUid: user?.id
            });
         } catch (e: unknown) {
            logger.error('[BusinessDashboard] Failed to load owner business', { message: e?.message });
            setLoadError(e?.message || 'Failed to load business');
            fetchedBusinessId.current = null; // Allow retry
         } finally {
            setIsLoading(false);
         }
      };
      load();
   }, [authLoading, firebaseUser, claims?.role, claims?.businessId, user?.id]);

   const handleOnboardingComplete = async (finalConfig: BusinessConfig) => {
      fetchedBusinessId.current = null; // allow fetch for newly claimed businessId
      const enhanced = {
         ...finalConfig,
         ownerUid: finalConfig.ownerUid || user?.id
      };
      setConfig(enhanced);
      setBusinessLoaded(true);
      await StorageService.saveBusinessConfig(enhanced);
   };

   const handleAddNewBusiness = async () => {
      if (!window.confirm("Claim or set up another business profile?")) return;
      try {
         if (firebaseUser) {
            const ent = await fetchWithAuth<any>(firebaseUser, '/owner/entitlements');
            const payload = ent?.entitlements;
            if (payload && payload.canAddMore === false) {
               alert(`Limit reached: ${payload.currentCount}/${payload.maxBusinesses} on plan "${payload.plan}". Upgrade required to claim more businesses.`);
               return;
            }
         }
      } catch (e: unknown) {
         logger.warn('[BusinessDashboard] Failed to pre-check entitlements, continuing', { message: e?.message });
      }

      navigate('/dashboard/onboarding');
   };

   const openBusinessSwitcher = async () => {
      if (!firebaseUser) return;
      setSwitchError(null);
      setShowBusinessSwitcher(true);
      try {
         const [listRes, entRes] = await Promise.all([
            fetchWithAuth<any>(firebaseUser, '/owner/businesses'),
            fetchWithAuth<any>(firebaseUser, '/owner/entitlements')
         ]);
         setBusinesses(Array.isArray(listRes?.businesses) ? listRes.businesses : []);
         setEntitlements(entRes?.entitlements || null);
      } catch (e: unknown) {
         setSwitchError(e?.message || 'Failed to load businesses');
      }
   };

   const switchToBusiness = async (businessId: string) => {
      if (!firebaseUser) return;
      setSwitchError(null);
      try {
         await fetchWithAuth<any>(firebaseUser, '/owner/switch-business', {
            method: 'POST',
            body: JSON.stringify({ businessId })
         });
         await forceRefreshToken();
         fetchedBusinessId.current = null;
         setBusinessLoaded(false);
         setShowBusinessSwitcher(false);
      } catch (e: unknown) {
         setSwitchError(e?.message || 'Failed to switch business');
      }
   };

   // Show spinner while loading
   if (isLoading) {
      return <div className="min-h-screen flex items-center justify-center text-teal-600"><Loader2 size={40} className="animate-spin" /></div>;
   }

   // If token isn't owner-scoped yet, show claim flow.
   if (!firebaseUser || claims?.role !== 'owner' || !claims.businessId) {
      return <BusinessOnboarding key={onboardingKey} onComplete={handleOnboardingComplete} onExit={onExit} />;
   }

   // Show error if load failed
   if (loadError) {
      return (
         <div className="min-h-screen flex items-center justify-center p-6">
            <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl p-6">
               <h2 className="text-lg font-bold text-slate-900">Unable to load your business</h2>
               <p className="text-sm text-slate-600 mt-2">{loadError}</p>
               <div className="mt-4 flex gap-3">
                  <button
                     onClick={() => {
                        fetchedBusinessId.current = null;
                        setOnboardingKey(Date.now());
                     }}
                     className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold"
                  >
                     Retry
                  </button>
                  <button
                     onClick={onExit}
                     className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-700"
                  >
                     Exit
                  </button>
               </div>
            </div>
         </div>
      );
   }

   // Wait for business data to be loaded
   if (!businessLoaded) {
      return <div className="min-h-screen flex items-center justify-center text-teal-600"><Loader2 size={40} className="animate-spin" /></div>;
   }

   // AGENT COMMAND CENTER MENU
   const getMenuItems = () => {
      return [
         { id: 'overview', icon: LayoutDashboard, label: 'Agent Home' },
         { id: 'profile', icon: Store, label: 'Business Profile' },
         { id: 'calendar', icon: CalendarIcon, label: 'Reservations' },
         { id: 'teach', icon: Brain, label: 'Teach Your Salesman' },
         { id: 'events', icon: Send, label: 'Events & Activities' },
         { id: 'inbox', icon: MessageSquare, label: 'Inbox & Chats' },
         { id: 'settings', icon: Settings, label: 'Agent Settings' },
      ];
   };

   const menuItems = getMenuItems();

   return (
      <div className="flex h-screen bg-slate-50 overflow-hidden">
         {/* MOBILE OVERLAY */}
         {isSidebarOpen && (
            <div
               className="fixed inset-0 bg-slate-900/50 z-20 md:hidden"
               onClick={() => setIsSidebarOpen(false)}
            />
         )}

         {/* SIDEBAR NAVIGATION */}
         <div className={`
            fixed md:relative z-30 w-64 h-full bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
         `}>
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center gap-3">
               <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <Store size={20} />
               </div>
               <div>
                  <h1 className="font-bold text-lg leading-tight truncate max-w-[140px]">{config.businessName}</h1>
                  <p className="text-xs text-slate-400">Agent Command Center</p>
               </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
               {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeModule === item.id;
                  return (
                     <button
                        key={item.id}
                        onClick={() => {
                           setActiveModule(item.id as DashboardModule);
                           setIsSidebarOpen(false);
                        }}
                        className={`
                           w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all
                           ${isActive
                              ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md shadow-teal-900/20'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'}
                        `}
                     >
                        <div className="relative">
                           <Icon size={20} />
                           {item.id === 'calendar' && !config.availability && (
                              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900" />
                           )}
                        </div>
                        {item.label}
                     </button>
                  );
               })}
            </nav>

            {/* Footer Actions */}
            <div className="p-4 border-t border-white/10 space-y-2">
               <button
                  onClick={openBusinessSwitcher}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
               >
                  <Building2 size={20} />
                  Switch Business
               </button>
               <button
                  onClick={handleAddNewBusiness}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
               >
                  <PlusCircle size={20} />
                  Add New Business
               </button>
               <button
                  onClick={onExit}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
               >
                  <LogOut size={20} />
                  Exit to App
               </button>
            </div>
         </div>

         {/* MAIN CONTENT AREA */}
         <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            {/* Mobile Header */}
            <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10 sticky top-0">
               <div className="flex items-center gap-3">
                  <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                     <Menu size={24} />
                  </button>
                  <span className="font-bold text-slate-900">{config.businessName}</span>
               </div>
               <div className="w-8 h-8 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-bold text-sm">
                  {config.businessName.charAt(0)}
               </div>
            </header>

            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto bg-slate-50 relative pb-20 md:pb-0">
               {activeModule === 'overview' && <OverviewModule onViewChange={(view) => setActiveModule(view as DashboardModule)} />}
               {activeModule === 'profile' && <ProfileModule config={config} />}
               {activeModule === 'calendar' && <CalendarModule />}
               {activeModule === 'teach' && <TeachAgentModule />}
               {activeModule === 'events' && <EventsModule />}
               {activeModule === 'inbox' && <InboxModule />}
               {activeModule === 'settings' && <AgentSettingsModule />}
            </main>
         </div>

         {showBusinessSwitcher && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-900/60" onClick={() => setShowBusinessSwitcher(false)} />
               <div className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
                  <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                     <div>
                        <div className="font-bold text-slate-900">Your Businesses</div>
                        {entitlements && (
                           <div className="text-xs text-slate-500 mt-1">
                              Plan: {entitlements.plan} · {entitlements.currentCount}/{entitlements.maxBusinesses} used
                           </div>
                        )}
                     </div>
                     <button
                        onClick={() => setShowBusinessSwitcher(false)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                     >
                        Close
                     </button>
                  </div>

                  {switchError && (
                     <div className="p-4 bg-red-50 text-red-700 text-sm border-b border-red-100">
                        {switchError}
                     </div>
                  )}

                  <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
                     {businesses.length === 0 && (
                        <div className="text-sm text-slate-500 p-3">No businesses found for this account.</div>
                     )}

                     {businesses.map((b) => {
                        const active = b.businessId === claims?.businessId;
                        return (
                           <button
                              key={b.businessId}
                              onClick={() => switchToBusiness(b.businessId)}
                              disabled={active}
                              className={`w-full text-left p-3 rounded-xl border transition-all ${active
                                 ? 'border-teal-300 bg-teal-50 text-teal-900'
                                 : 'border-slate-200 hover:bg-slate-50 text-slate-900'
                                 } disabled:opacity-60`}
                           >
                              <div className="font-bold truncate">{b.businessName || b.businessId}</div>
                              <div className="text-xs text-slate-500 mt-1">Role: {b.role}</div>
                           </button>
                        );
                     })}
                  </div>

                  <div className="p-4 border-t border-slate-200 flex items-center justify-between gap-3">
                     <div className="text-xs text-slate-500">
                        Claiming another business requires an upgraded plan.
                     </div>
                     <button
                        onClick={() => {
                           setShowBusinessSwitcher(false);
                           navigate('/dashboard/onboarding');
                        }}
                        className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800"
                     >
                        Claim Another
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default BusinessDashboard;
