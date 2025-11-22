
import React, { useState } from 'react';
import { 
  LayoutDashboard, List, Calendar as CalendarIcon, 
  MessageSquare, Users, Send, Settings, LogOut, 
  Store, Building2, Menu, Inbox, PlusCircle, Car, Loader2,
  Package, ShoppingBag, Ticket, Music, Utensils, BookOpen
} from 'lucide-react';
import { BusinessConfig } from '../../types';
import { StorageService } from '../../services/storageService';
import BusinessOnboarding from './BusinessOnboarding';
import { useAuth } from '../../contexts/AuthContext';

// Modules
import OverviewModule from './modules/OverviewModule';
import ListingsModule from './modules/ListingsModule';
import CalendarModule from './modules/CalendarModule';
import InboxModule from './modules/InboxModule';
import MarketingModule from './modules/MarketingModule';
import RequestsModule from './modules/RequestsModule';
import StorefrontModule from './modules/StorefrontModule';
import OrdersModule from './modules/OrdersModule';

interface BusinessDashboardProps {
  onExit: () => void;
}

type DashboardModule = 'overview' | 'listings' | 'orders' | 'inbox' | 'bookings' | 'marketing' | 'requests' | 'storefront' | 'settings';

const BusinessDashboard: React.FC<BusinessDashboardProps> = ({ onExit }) => {
  const { user } = useAuth();
  const [config, setConfig] = useState<BusinessConfig>({ domain: null, subType: null, businessName: '' });
  const [activeModule, setActiveModule] = useState<DashboardModule>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Force re-render of onboarding when resetting
  const [onboardingKey, setOnboardingKey] = useState(0);

  React.useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const savedConfig = await StorageService.getBusinessConfig();
      if (savedConfig && savedConfig.businessName) {
        setConfig({
          ...savedConfig,
          ownerUid: savedConfig.ownerUid || user?.id
        });
      }
      setIsLoading(false);
    };
    load();
  }, [user?.id]);

  const handleOnboardingComplete = async (finalConfig: BusinessConfig) => {
    const enhanced = {
      ...finalConfig,
      ownerUid: finalConfig.ownerUid || user?.id
    };
    setConfig(enhanced);
    await StorageService.saveBusinessConfig(enhanced);
  };

  const handleAddNewBusiness = async () => {
    if (window.confirm("Set up a new business profile? This will clear your current dashboard view and let you start fresh.")) {
       try {
           setIsLoading(true);
           await StorageService.clearBusinessConfig();
           
           // Force clear state
           setConfig({ domain: null, subType: null, businessName: '' });
           setActiveModule('overview');
           
           // Force re-render of onboarding component by updating key
           setOnboardingKey(Date.now()); 
       } catch (e) {
           console.error("Failed to reset business", e);
           alert("Failed to reset. Please check your connection or clear browser cache.");
       } finally {
           // Add a small delay to smooth the transition
           setTimeout(() => {
              setIsLoading(false);
              setIsSidebarOpen(false);
           }, 500);
       }
    }
  };

  if (isLoading) {
     return <div className="min-h-screen flex items-center justify-center text-teal-600"><Loader2 size={40} className="animate-spin"/></div>;
  }

  if (!config.businessName) {
    return <BusinessOnboarding key={onboardingKey} onComplete={handleOnboardingComplete} onExit={onExit} />;
  }

  // DYNAMIC MENU ITEMS
  const getMenuItems = () => {
      const baseItems = [
          { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
      ];

      if (config.domain === 'Marketplace') {
          // RETAIL / MARKETPLACE MENU
          baseItems.push({ id: 'orders', icon: Package, label: 'Orders & Shipping' });
          baseItems.push({ id: 'listings', icon: ShoppingBag, label: 'Products & Inventory' });
          baseItems.push({ id: 'marketing', icon: Send, label: 'Promotions' });
          baseItems.push({ id: 'storefront', icon: Store, label: 'Online Store' });
      } 
      else if (config.domain === 'Cars') {
          // AUTO MENU
          baseItems.push({ id: 'listings', icon: Car, label: config.subType === 'sale' ? 'Inventory' : 'Fleet' });
          baseItems.push({ id: 'bookings', icon: CalendarIcon, label: config.subType === 'sale' ? 'Test Drives' : 'Reservations' });
          baseItems.push({ id: 'marketing', icon: Send, label: 'Marketing' });
      }
      else if (config.domain === 'Events') {
          // EVENTS MENU
          baseItems.push({ id: 'listings', icon: Ticket, label: 'Events & Tickets' });
          baseItems.push({ id: 'bookings', icon: Users, label: 'Guest Lists' });
          baseItems.push({ id: 'marketing', icon: Send, label: 'Marketing' });
      }
      else if (config.domain === 'Restaurants') {
          // RESTAURANT MENU
          baseItems.push({ id: 'orders', icon: Utensils, label: 'Live Kitchen' });
          baseItems.push({ id: 'listings', icon: BookOpen, label: 'Menu Manager' });
          baseItems.push({ id: 'bookings', icon: CalendarIcon, label: 'Reservations' });
          baseItems.push({ id: 'storefront', icon: Store, label: 'Restaurant Profile' });
      } 
      else {
          // REAL ESTATE / SERVICES MENU
          baseItems.push({ id: 'listings', icon: List, label: 'Listings' });
          baseItems.push({ id: 'bookings', icon: CalendarIcon, label: 'Calendar' });
          baseItems.push({ id: 'marketing', icon: Send, label: 'Marketing' });
      }

      // Universal Items (End of list)
      baseItems.push(
          { id: 'inbox', icon: MessageSquare, label: 'Messages' },
          { id: 'requests', icon: Inbox, label: 'Consumer Requests' },
      );

      return baseItems;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* MOBILE OVERLAY */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* SIDEBAR */}
      <div className={`fixed lg:static inset-y-0 left-0 w-64 bg-slate-900 text-white p-6 flex flex-col z-40 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
         <div className="flex items-center gap-3 mb-10">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20 flex-shrink-0 ${config.domain === 'Events' ? 'bg-purple-600' : config.domain === 'Restaurants' ? 'bg-orange-500' : 'bg-teal-500'}`}>
               {config.domain === 'Cars' ? <Car size={20} className="text-white" /> : 
                config.domain === 'Marketplace' ? <ShoppingBag size={20} className="text-white" /> : 
                config.domain === 'Events' ? <Music size={20} className="text-white" /> :
                config.domain === 'Restaurants' ? <Utensils size={20} className="text-white" /> :
                <Building2 size={20} className="text-white" />}
            </div>
            <div className="overflow-hidden">
               <div className="font-bold text-lg leading-none truncate">{config.businessName || 'My Business'}</div>
               <div className="text-xs text-slate-400 mt-1 truncate">{config.subType ? `${config.subType === 'sale' ? 'Dealership' : 'Rental'} Admin` : config.domain === 'Marketplace' ? 'Store Manager' : config.domain === 'Events' ? 'Event Promoter' : config.domain === 'Restaurants' ? 'Restaurateur' : 'Business Admin'}</div>
            </div>
         </div>

         <nav className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
            {getMenuItems().map(item => (
               <button
                 key={item.id}
                 onClick={() => { setActiveModule(item.id as DashboardModule); setIsSidebarOpen(false); }}
                 className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activeModule === item.id 
                    ? `bg-white/10 text-white font-bold border-r-4 ${config.domain === 'Events' ? 'border-purple-500' : config.domain === 'Restaurants' ? 'border-orange-500' : 'border-teal-500'}` 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                 }`}
               >
                 <item.icon size={18} />
                 {item.label}
               </button>
            ))}
         </nav>

         <div className="pt-6 border-t border-white/10 space-y-2">
            <button onClick={handleAddNewBusiness} className={`flex items-center gap-3 text-sm px-2 w-full transition-colors font-medium ${config.domain === 'Events' ? 'text-purple-400 hover:text-purple-300' : config.domain === 'Restaurants' ? 'text-orange-400 hover:text-orange-300' : 'text-teal-400 hover:text-teal-300'}`}>
               <PlusCircle size={16} /> Add New Business
            </button>
            <button onClick={onExit} className="flex items-center gap-3 text-slate-400 hover:text-white text-sm px-2 w-full transition-colors">
               <LogOut size={16} /> Exit to App
            </button>
         </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
         
         {/* Top Bar (Mobile) */}
         <div className="lg:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600"><Menu/></button>
            <span className="font-bold text-slate-900 capitalize">{activeModule}</span>
            <div className="w-8"></div>
         </div>

         <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto h-full">
               
               {activeModule === 'overview' && <OverviewModule onViewChange={(view) => setActiveModule(view as DashboardModule)} />}
               {activeModule === 'listings' && <ListingsModule config={config} />}
               {activeModule === 'orders' && <OrdersModule />}
               {activeModule === 'bookings' && <CalendarModule />}
               {activeModule === 'inbox' && <InboxModule />}
               {activeModule === 'marketing' && <MarketingModule />}
               {activeModule === 'requests' && <RequestsModule />}
               {activeModule === 'storefront' && <StorefrontModule config={config} />}

            </div>
         </div>

      </div>
    </div>
  );
};

export default BusinessDashboard;
