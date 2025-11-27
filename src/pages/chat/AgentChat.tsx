
import React, { useState, useRef, useEffect } from 'react';
import { Send, MapPin, Loader2, ArrowRight, Star, ShieldCheck, Clock, Zap, Home, Car, Utensils, Search, Sparkles } from 'lucide-react';
import { Message, LoadingState, UnifiedItem, AgentPersona } from '../../types';
import { sendMessageToAgent } from '../../services/geminiService';
import { StorageService } from '../../services/storageService';
import { AVAILABLE_AGENTS, ALL_MOCK_ITEMS } from '../../components/constants';
import BookingModal from '../../components/booking/BookingModal';
import AgentSelector from './AgentSelector';
import PaymentCard from './cards/PaymentCard';
import RecommendationCard from './cards/RecommendationCard';
import ReceiptCard from './cards/ReceiptCard';
import TaxiStatusCard from './cards/TaxiStatusCard';
import WhatsAppStatusCard from './cards/WhatsAppStatusCard';
import { useLanguage } from '../../context/LanguageContext';

import { useAuth } from '../../context/AuthContext';

// --- 1. WELCOME CARD COMPONENT ---
const WelcomeCard: React.FC<{ agent: AgentPersona }> = ({ agent }) => (
  <div className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-xl shadow-slate-200/40 border border-white/60 animate-in fade-in slide-in-from-bottom-8 duration-700">
    <div className="flex flex-col items-center text-center mb-6">
      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-teal-50 to-slate-50 p-2 shadow-inner mb-4 relative">
        {/* Ensure object-contain for 3D icons */}
        <img src={agent.avatarUrl} className="w-full h-full object-contain rounded-xl drop-shadow-md" alt={agent.name} />
        <div className="absolute -bottom-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white shadow-sm">ONLINE</div>
      </div>
      <h2 className="text-xl font-bold text-slate-900">Hi, I'm {agent.name.split(' ')[0]}</h2>
      <p className="text-sm text-slate-500 mt-1">{agent.description}</p>
    </div>

    <div className="grid grid-cols-2 gap-3 mb-6">
      {[
        { icon: ShieldCheck, label: "Verified Listings", color: "text-blue-600", bg: "bg-blue-50" },
        { icon: Zap, label: "Instant Booking", color: "text-amber-600", bg: "bg-amber-50" },
        { icon: Star, label: "Best Rates", color: "text-purple-600", bg: "bg-purple-50" },
        { icon: Clock, label: "24/7 Support", color: "text-teal-600", bg: "bg-teal-50" },
      ].map((item, i) => (
        <div key={i} className={`flex items-center gap-2 p-3 rounded-xl border border-slate-100 ${item.bg}`}>
          <item.icon size={16} className={item.color} />
          <span className="text-xs font-bold text-slate-700">{item.label}</span>
        </div>
      ))}
    </div>

    <div className="text-center text-xs text-slate-400 border-t border-slate-100 pt-4">
      I can help you find villas, cars, or plan your entire trip in seconds.
    </div>
  </div>
);

// --- 2. 3D QUICK ACTION CHIPS ---
const QuickActions: React.FC<{ onAction: (text: string) => void }> = ({ onAction }) => {
  const actions = [
    {
      label: "Find Villa 🏡",
      prompt: "I'm looking for a luxury villa with a pool.",
      icon: Home,
      color: "text-blue-600"
    },
    {
      label: "Rent Car 🚗",
      prompt: "I need a rental car for 3 days.",
      icon: Car,
      color: "text-orange-600"
    },
    {
      label: "Best Food 🍔",
      prompt: "Recommend a romantic restaurant for tonight.",
      icon: Utensils,
      color: "text-red-600"
    },
    {
      label: "Plan Trip 🗺️",
      prompt: "Plan a 3-day itinerary for North Cyprus.",
      icon: MapPin,
      color: "text-green-600"
    },
    {
      label: "Services 🛠️",
      prompt: "I need a cleaner for my apartment.",
      icon: Sparkles,
      color: "text-purple-600"
    },
    {
      label: "Invest 📈",
      prompt: "Show me high ROI investment properties.",
      icon: Zap,
      color: "text-yellow-600"
    }
  ];

  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-hide py-4 px-2">
      {actions.map((action, idx) => (
        <button
          key={idx}
          onClick={() => onAction(action.prompt)}
          className="flex items-center gap-3 px-4 py-2 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all whitespace-nowrap group"
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <action.icon size={16} className={action.color} />
          </div>
          <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900">{action.label}</span>
        </button>
      ))}
    </div>
  );
};

// --- 3. CHAT BUBBLE COMPONENT ---
const ChatBubble: React.FC<{
  message: Message;
  agent: AgentPersona;
  onPayment: (id: string) => void;
  onRecommendClick: (item: UnifiedItem) => void;
}> = ({ message, agent, onPayment, onRecommendClick }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex flex-col gap-2 mb-6 ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`flex gap-4 max-w-[90%] md:max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>

        {/* Avatar */}
        <div className={`w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden shadow-sm border-2 ${isUser ? 'border-slate-200 bg-slate-100' : 'border-white bg-white'}`}>
          {isUser ? (
            <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">ME</div>
          ) : (
            <img src={agent.avatarUrl} className="w-full h-full object-contain p-1" alt="Agent" />
          )}
        </div>

        {/* Bubble Content */}
        <div className={`p-5 text-sm leading-relaxed shadow-sm relative group ${isUser
          ? 'bg-slate-900 text-white rounded-2xl rounded-tr-sm'
          : 'bg-white border border-slate-100 text-slate-700 rounded-2xl rounded-tl-sm'
          }`}>
          {message.text.includes('[SHARED LOCATION:') ? (
            <div className="flex items-center gap-2 italic text-slate-300">
              <MapPin size={16} /> Location Shared
            </div>
          ) : message.text}

          {/* Embedded Cards */}
          {message.paymentRequest && message.booking && (
            <PaymentCard booking={message.booking} onPaid={() => onPayment(message.booking!.id)} />
          )}

          {message.booking && message.booking.status === 'confirmed' && (
            <ReceiptCard booking={message.booking} />
          )}

          {message.booking && (message.whatsappTriggered || message.booking.status === 'viewing_requested' || message.booking.whatsappStatus === 'sent') && (
            <WhatsAppStatusCard booking={message.booking} />
          )}

          {/* Old taxi system */}
          {message.booking && message.booking.status === 'taxi_dispatched' && (
            <TaxiStatusCard requestId={message.booking.id} />
          )}

          {/* New taxi system - show card when requestId is in metadata */}
          {message.metadata?.taxiRequestId && (
            <TaxiStatusCard requestId={message.metadata.taxiRequestId} />
          )}
        </div>
      </div>

      {/* Recommendations Carousel (Outside bubble for full width) */}
      {message.recommendedItems && message.recommendedItems.length > 0 && (
        <div className="w-full pl-14 overflow-x-auto pb-4 pt-2 scrollbar-hide">
          <div className="flex gap-4 w-max">
            {message.recommendedItems.map(item => (
              <RecommendationCard key={item.id} item={item} onClick={onRecommendClick} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


// --- MAIN COMPONENT ---

const AgentChat: React.FC = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [currentAgent, setCurrentAgent] = useState<AgentPersona>(AVAILABLE_AGENTS[0]);
  const [messages, setMessages] = useState<Message[]>([]); // Start empty to show WelcomeCard first
  const [inputText, setInputText] = useState('');
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [loadingText, setLoadingText] = useState(t('agent_thinking'));
  const [selectedItem, setSelectedItem] = useState<UnifiedItem | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reset messages when user changes (login/logout)
  useEffect(() => {
    setMessages([]);
  }, [user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingState]);

  // Generate welcome message based on agent persona
  const getWelcomeMessage = (agent: AgentPersona) => {
    if (agent.name === 'Merve') {
      return "Hi, I'm Merve. I can help you find rentals and sales, find daily rentals, long-term rentals, sales projects, and investment properties. I plan your entire trip.";
    }
    if (agent.name === 'Hans') {
      return "I am Hans. I handle your lifestyle needs, hotel bookings, and VIP events. How can I assist?";
    }
    if (agent.name === 'James') {
      return "I am James. I sort out your transportation, from luxury car rentals to taxi transfers.";
    }
    if (agent.name === 'Svetlana') {
      return "I am Svetlana. I guide you to the best dining experiences. What are you craving today?";
    }
    return `Hello! I am ${agent.name}. How can I assist you?`;
  };

  const handleAgentSwitch = (newAgent: AgentPersona) => {
    if (newAgent.id === currentAgent.id) return;
    setCurrentAgent(newAgent);
    // Add specific intro message when switching
    setMessages([{
      id: `welcome-${Date.now()}`,
      role: 'model',
      text: getWelcomeMessage(newAgent),
      timestamp: new Date()
    }]);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loadingState === LoadingState.LOADING) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoadingState(LoadingState.LOADING);

    try {
      const response = await sendMessageToAgent(text, currentAgent.id, language);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        timestamp: new Date(),
        recommendedItems: response.listings,
        booking: response.booking,
        paymentRequest: response.paymentRequest,
        whatsappTriggered: response.whatsappTriggered
      };

      setMessages(prev => [...prev, aiMsg]);
      setLoadingState(LoadingState.IDLE);
    } catch (error) {
      setLoadingState(LoadingState.ERROR);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "I'm having trouble accessing the network. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const locMsg = `[SHARED LOCATION: ${latitude}, ${longitude}]`;
        handleSendMessage(locMsg);
        setIsGettingLocation(false);
      },
      (error) => {
        console.error("Location error", error);
        alert("Unable to retrieve your location. Please allow access.");
        setIsGettingLocation(false);
      }
    );
  };

  const handlePaymentComplete = async (bookingId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.booking?.id === bookingId) {
        const confirmedBooking = { ...msg.booking!, status: 'confirmed' as const };
        StorageService.saveBooking(confirmedBooking);
        return {
          ...msg,
          paymentRequest: false,
          text: "Payment processed successfully.",
          booking: confirmedBooking
        };
      }
      return msg;
    }));
  };

  return (
    <div id="agent" className="container mx-auto px-2 md:px-4 py-4 md:py-12 relative z-10">
      {/* MAIN GLASS CONTAINER - Mobile Responsive Height */}
      <div className="max-w-6xl mx-auto bg-white/80 backdrop-blur-2xl rounded-3xl md:rounded-[2.5rem] shadow-2xl border border-white/60 overflow-hidden flex flex-col md:flex-row h-[calc(100vh-6rem)] md:h-[800px] ring-1 ring-white/40 relative">

        {/* Background Ambient Effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-teal-200/20 rounded-full blur-[120px] animate-float"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-200/20 rounded-full blur-[100px] animate-float" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* SIDEBAR (Context & Agents) - Desktop Only */}
        <div className="hidden md:flex w-80 bg-white/40 border-r border-white/20 flex-col relative p-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 leading-tight tracking-tight mb-2">
              Your Personal <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600">Island Concierge</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">Powered by Advanced AI & Local Experts</p>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Specialist</h3>
            </div>
            <AgentSelector currentAgentId={currentAgent.id} onSelect={handleAgentSwitch} />
          </div>
        </div>

        {/* MAIN CHAT AREA */}
        <div className="flex-1 flex flex-col relative overflow-hidden">

          {/* Mobile Header - Agent Switcher */}
          <div className="md:hidden p-2 border-b border-slate-100 bg-white/80 backdrop-blur flex gap-2 overflow-x-auto scrollbar-hide shadow-sm z-20 shrink-0">
            {AVAILABLE_AGENTS.map(agent => (
              <button
                key={agent.id}
                onClick={() => handleAgentSwitch(agent)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border transition-all whitespace-nowrap ${currentAgent.id === agent.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-500 border-slate-200'
                  }`}
              >
                {agent.name}
              </button>
            ))}
          </div>

          {/* MESSAGES FEED */}
          <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar relative">

            {/* ZERO STATE */}
            {messages.length === 0 && (
              <div className="h-full flex flex-col justify-center">
                <WelcomeCard agent={currentAgent} />
              </div>
            )}

            {/* MESSAGE LIST */}
            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                message={msg}
                agent={currentAgent}
                onPayment={handlePaymentComplete}
                onRecommendClick={setSelectedItem}
              />
            ))}

            {/* LOADING STATE */}
            {loadingState === LoadingState.LOADING && (
              <div className="flex gap-4 animate-pulse items-center">
                <div className="w-10 h-10 rounded-xl bg-slate-100 border-2 border-white shadow-sm"></div>
                <div className="bg-white/60 border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2 text-slate-500 text-xs font-bold shadow-sm">
                  <Loader2 size={14} className="animate-spin text-teal-600" />
                  {loadingText}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT AREA */}
          <div className="p-3 md:p-6 pt-2 bg-gradient-to-t from-white via-white/90 to-transparent z-20 shrink-0">

            {/* Quick Actions */}
            <div className="mb-2">
              <QuickActions onAction={handleSendMessage} />
            </div>

            {/* Input Capsule */}
            <div className="relative flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-[2rem] shadow-xl shadow-slate-200/40 focus-within:ring-4 focus-within:ring-teal-500/10 focus-within:border-teal-500 transition-all duration-300">
              <button
                onClick={handleShareLocation}
                disabled={isGettingLocation || loadingState === LoadingState.LOADING}
                className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-full transition-all flex-shrink-0"
                title="Share your location"
              >
                {isGettingLocation ? <Loader2 size={20} className="animate-spin" /> : <MapPin size={20} />}
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
                placeholder={`Ask ${currentAgent.name.split(' ')[0]} anything...`}
                className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 text-sm font-medium min-w-0"
              />

              <button
                onClick={() => handleSendMessage(inputText)}
                disabled={!inputText.trim() || loadingState === LoadingState.LOADING}
                className="p-3 bg-slate-900 text-white rounded-full hover:bg-slate-800 disabled:opacity-50 transition-all shadow-md hover:scale-105 active:scale-95 flex items-center justify-center flex-shrink-0"
              >
                {loadingState === LoadingState.LOADING ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
              </button>
            </div>
          </div>

        </div>
      </div>

      {selectedItem && (
        <BookingModal
          listing={selectedItem as any}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
};

export default AgentChat;
