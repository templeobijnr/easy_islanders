import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon, Loader2, MapPin, Clock, Lock, CreditCard, Download, Building2, Car, Utensils, Sparkles, CheckCircle, MessageCircle, Calendar, Smartphone, Mail, CarTaxiFront, StickyNote, Navigation, Star, Phone, Bitcoin, Check, Copy } from 'lucide-react';
import { Message, LoadingState, UnifiedItem, Booking, AgentPersona } from '../types';
import { sendMessageToAgent } from '../services/geminiService';
import { AVAILABLE_AGENTS } from '../constants';
import BookingModal from './BookingModal';
import { useLanguage } from '../contexts/LanguageContext';

interface RecommendationCardProps {
  item: UnifiedItem;
  onClick: (item: UnifiedItem) => void;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ item, onClick }) => {
  const getDomainColor = () => {
    switch(item.domain) {
      case 'Cars': return 'bg-blue-600';
      case 'Restaurants': return 'bg-orange-500';
      case 'Services': return 'bg-purple-600';
      case 'Health & Beauty': return 'bg-rose-500';
      default: return 'bg-teal-600';
    }
  };

  return (
    <div className="flex-shrink-0 w-64 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group" onClick={() => onClick(item)}>
      <div className="h-32 overflow-hidden relative">
        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur text-xs font-bold px-2 py-1 rounded-md shadow-sm">
          £{item.price.toLocaleString()}
        </div>
        <div className={`absolute top-2 left-2 ${getDomainColor()} text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm uppercase`}>
          {item.domain}
        </div>
      </div>
      <div className="p-3">
        <h4 className="font-bold text-slate-900 text-sm truncate">{item.title}</h4>
        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1 mb-2">
          <MapPin size={10} />
          {item.location}
        </div>
      </div>
    </div>
  );
};

// --- PAYMENT COMPONENT (IN-CHAT) ---
const PaymentCard: React.FC<{ booking: Booking, onPaid: () => void }> = ({ booking, onPaid }) => {
  const [processing, setProcessing] = useState(false);
  const [method, setMethod] = useState<'card' | 'crypto'>('card');

  const handlePay = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      onPaid();
    }, 2500);
  };

  return (
    <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden my-4">
      <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
         <div className="flex items-center gap-2">
            <Lock size={16} className="text-emerald-400" />
            <span className="font-bold text-sm">Secure Checkout</span>
         </div>
         <span className="text-xs font-mono">IslanderPay™</span>
      </div>
      
      {/* TABS */}
      <div className="flex border-b border-slate-100">
          <button onClick={() => setMethod('card')} className={`flex-1 p-3 text-sm font-bold flex items-center justify-center gap-2 ${method === 'card' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-400'}`}>
              <CreditCard size={14} /> Card
          </button>
          <button onClick={() => setMethod('crypto')} className={`flex-1 p-3 text-sm font-bold flex items-center justify-center gap-2 ${method === 'crypto' ? 'text-green-600 border-b-2 border-green-600' : 'text-slate-400'}`}>
              <Bitcoin size={14} /> Crypto
          </button>
      </div>

      <div className="p-6">
         <div className="flex gap-4 mb-4">
            <img src={booking.itemImage} className="w-16 h-16 rounded-lg object-cover" />
            <div>
               <div className="text-sm font-bold text-slate-900">{booking.itemTitle}</div>
               {booking.checkIn ? (
                 <div className="text-xs text-slate-500 mb-1">
                    {new Date(booking.checkIn).toLocaleDateString()} - {booking.checkOut ? new Date(booking.checkOut).toLocaleDateString() : '...'}
                 </div>
               ) : (
                 <div className="text-xs text-slate-500 mb-1">{new Date(booking.date).toLocaleDateString()}</div>
               )}
               <div className="text-lg font-bold text-teal-600">£{booking.totalPrice.toLocaleString()}</div>
            </div>
         </div>
         
         {/* Customer Preview */}
         <div className="mb-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-1">
             <div className="flex items-center gap-2"><UserIcon size={12} /> <b>For:</b> {booking.customerName}</div>
             {booking.specialRequests && <div className="flex items-center gap-2 italic"><Sparkles size={12} className="text-purple-500" /> {booking.specialRequests}</div>}
         </div>

         {method === 'card' ? (
            <div className="space-y-3 mb-6">
                <div className="relative">
                <CreditCard size={16} className="absolute left-3 top-3 text-slate-400" />
                <input type="text" placeholder="Card Number" className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="MM/YY" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" />
                <input type="text" placeholder="CVC" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" />
                </div>
            </div>
         ) : (
            <div className="mb-6 text-center space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 inline-block">
                    <div className="w-24 h-24 bg-slate-200 animate-pulse flex items-center justify-center text-xs text-slate-400">QR Code</div>
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-200 text-xs text-slate-500">
                    <span className="truncate max-w-[150px]">T9yKB...mock...XyZ</span>
                    <Copy size={12} />
                </div>
                <p className="text-[10px] text-green-600 font-bold flex items-center justify-center gap-1"><Check size={10}/> TRC20 / ERC20 Supported</p>
            </div>
         )}

         <button 
           onClick={handlePay}
           disabled={processing}
           className={`w-full py-3 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${method === 'card' ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-green-600 text-white hover:bg-green-700'}`}
         >
            {processing ? <Loader2 size={18} className="animate-spin" /> : (method === 'card' ? "Pay Securely" : "I Have Sent Payment")}
         </button>
         <div className="text-[10px] text-center text-slate-400 mt-3 flex items-center justify-center gap-1">
            <Lock size={10} /> Encrypted {method === 'crypto' ? 'Blockchain' : 'SSL'} Transaction
         </div>
      </div>
    </div>
  );
};

// --- RECEIPT COMPONENT ---
const ReceiptCard: React.FC<{ booking: Booking }> = ({ booking }) => (
  <div className="w-full max-w-sm bg-slate-50 rounded-2xl border border-slate-200 p-6 my-4 relative overflow-hidden">
     <div className="absolute top-0 left-0 w-full h-2 bg-teal-500"></div>
     <div className="flex justify-between items-start mb-6">
        <div>
           <h3 className="font-bold text-slate-900 text-lg">Payment Receipt</h3>
           <p className="text-xs text-slate-500">Ref: {booking.id}</p>
        </div>
        <div className="p-2 bg-green-100 text-green-700 rounded-full">
           <CheckCircle size={20} />
        </div>
     </div>
     
     <div className="space-y-3 border-t border-dashed border-slate-300 pt-4 mb-6">
        <div className="flex justify-between text-sm">
           <span className="text-slate-500">Item</span>
           <span className="font-medium text-slate-900 max-w-[150px] truncate">{booking.itemTitle}</span>
        </div>
        <div className="flex justify-between text-sm">
           <span className="text-slate-500">Date</span>
           <span className="font-medium text-slate-900">{new Date().toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between text-sm">
           <span className="text-slate-500">Guest</span>
           <span className="font-medium text-slate-900">{booking.customerName}</span>
        </div>
        {booking.needsPickup && (
          <div className="flex justify-between text-sm text-blue-600">
             <span className="flex items-center gap-1"><CarTaxiFront size={12}/> Pickup</span>
             <span className="font-bold">Included</span>
          </div>
        )}
        {booking.specialRequests && (
          <div className="text-xs bg-yellow-50 text-yellow-800 p-2 rounded mt-2 flex gap-2 items-start">
             <StickyNote size={12} className="mt-0.5 shrink-0" />
             <span>"{booking.specialRequests}"</span>
          </div>
        )}
        <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
           <span className="text-slate-500">Total</span>
           <span className="font-bold text-slate-900">£{booking.totalPrice.toLocaleString()}</span>
        </div>
     </div>
     
     <div className="flex gap-2 mb-4">
        <div className="flex-1 bg-green-100 text-green-800 text-[10px] p-2 rounded flex items-center justify-center gap-1">
           <Smartphone size={12} /> Sent to WhatsApp
        </div>
        <div className="flex-1 bg-blue-100 text-blue-800 text-[10px] p-2 rounded flex items-center justify-center gap-1">
           <Mail size={12} /> Sent to Email
        </div>
     </div>

     <button className="w-full py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-white transition-colors flex items-center justify-center gap-2">
        <Download size={16} /> Download PDF
     </button>
  </div>
);

// --- TAXI STATUS CARD ---
const TaxiStatusCard: React.FC<{ booking: Booking }> = ({ booking }) => {
  const mapsUrl = `https://www.google.com/maps?q=${booking.pickupCoordinates?.lat},${booking.pickupCoordinates?.lng}`;

  return (
    <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-lg my-4 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
       {/* Map Simulation Header */}
       <div className="h-32 bg-slate-200 relative bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2674&auto=format&fit=crop')] bg-cover bg-center">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
             <div className="flex items-center gap-2 text-white">
                <div className="animate-bounce">
                   <MapPin size={24} className="fill-red-500 text-red-500 drop-shadow-md" />
                </div>
                <span className="text-xs font-bold">Driver En Route</span>
             </div>
          </div>
       </div>

       <div className="p-5">
          <div className="flex justify-between items-start mb-4">
             <div>
                <h3 className="font-bold text-lg text-slate-900">{booking.driverDetails?.car}</h3>
                <p className="text-sm text-slate-500">{booking.driverDetails?.plate}</p>
             </div>
             <div className="text-right">
                <div className="text-2xl font-bold text-teal-600">{booking.driverDetails?.eta}</div>
                <div className="text-xs text-slate-400">Estimated Arrival</div>
             </div>
          </div>

          <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-xl">
             <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                <UserIcon size={20} className="text-slate-500" />
             </div>
             <div>
                <div className="font-bold text-sm text-slate-900">{booking.driverDetails?.name}</div>
                <div className="flex items-center gap-1 text-xs text-yellow-500">
                   <Star size={10} className="fill-yellow-500" /> 4.9 Rating
                </div>
             </div>
             <button className="ml-auto p-2 bg-white rounded-full shadow-sm hover:bg-green-50 text-green-600">
                <Phone size={18} />
             </button>
          </div>

          <div className="space-y-2">
             <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                <span className="text-slate-500">Passenger</span>
                <span className="font-medium">{booking.customerName}</span>
             </div>
             <div className="flex justify-between text-sm pb-2">
                <span className="text-slate-500">Contact</span>
                <span className="font-medium">{booking.customerContact}</span>
             </div>
          </div>

          <a 
            href={mapsUrl} 
            target="_blank" 
            rel="noreferrer"
            className="mt-4 w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2 transition-all"
          >
             <Navigation size={18} /> Track on Google Maps
          </a>
       </div>
    </div>
  );
};

// --- WHATSAPP VIEWING SCHEDULER (COMPLEX FLOW) ---
const WhatsAppViewingCard: React.FC<{ booking: Booking }> = ({ booking }) => {
   const [step, setStep] = useState<1|2|3|4>(1);
   
   useEffect(() => {
     // If status is already beyond sent, jump ahead
     if (booking.whatsappStatus === 'sent') {
       setStep(2);
       setTimeout(() => setStep(3), 3000);
     } else {
       // Initial animation flow for "Connecting"
       setTimeout(() => setStep(2), 2500);
     }
   }, [booking.whatsappStatus]);

   useEffect(() => {
      if (step === 3) {
         setTimeout(() => setStep(4), 2000);
      }
   }, [step]);

   return (
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm my-4 p-5 relative overflow-hidden">
         
         {/* Status Header */}
         <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className={`p-2 rounded-full transition-colors duration-500 ${step === 4 ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'}`}>
               {step === 4 ? <CheckCircle size={20} /> : <Smartphone size={20} className={step < 4 ? 'animate-pulse' : ''} />}
            </div>
            <div>
               <h4 className="font-bold text-slate-900">
                  {step === 1 && "Connecting to Owner..."}
                  {step === 2 && "Request Sent"}
                  {step === 3 && "Confirming Availability..."}
                  {step === 4 && "Viewing Confirmed"}
               </h4>
               <p className="text-xs text-slate-500">
                  {step === 1 && "Initiating WhatsApp Business API"}
                  {step === 2 && `Delivered to Agent (+90...)`}
                  {step === 3 && "Waiting for manual approval"}
                  {step === 4 && "Slot booked. Agent will call you."}
               </p>
            </div>
         </div>

         {/* Visual Timeline */}
         <div className="relative pl-4 border-l-2 border-slate-100 space-y-4 mb-2 z-10">
            {/* User Step */}
            <div className="relative">
               <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-teal-500"></div>
               <p className="text-xs text-slate-500">Viewing requested for:</p>
               <p className="text-xs font-bold text-slate-900">{booking.viewingTime || "Flexible"}</p>
            </div>
            
            {/* Agent Step */}
            <div className={`relative transition-opacity duration-500 ${step >= 2 ? 'opacity-100' : 'opacity-30'}`}>
               <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full ${step >= 2 ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
               <p className="text-xs text-slate-600">Agent notified via WhatsApp</p>
            </div>

            {/* Owner Step */}
            <div className={`relative transition-opacity duration-500 ${step >= 3 ? 'opacity-100' : 'opacity-30'}`}>
               <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full ${step >= 3 ? 'bg-purple-500' : 'bg-slate-200'}`}></div>
               <p className="text-xs text-slate-600">{step >= 3 ? "Availability verified" : "Checking calendar..."}</p>
            </div>
         </div>

         {step === 4 && (
            <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 bg-green-50 border border-green-100 rounded-lg p-3 text-sm text-green-800">
               <div className="font-bold flex items-center gap-2 mb-1"><Calendar size={14}/> Appointment Set</div>
               <p className="text-xs">The agent has your number ({booking.customerContact}) and will send location details shortly.</p>
            </div>
         )}
      </div>
   );
};

// --- AGENT SELECTOR COMPONENT ---
const AgentSelector: React.FC<{ 
  currentAgentId: string, 
  onSelect: (agent: AgentPersona) => void 
}> = ({ currentAgentId, onSelect }) => {
  
  const getIcon = (name: string) => {
    switch(name) {
      case 'Building2': return Building2;
      case 'Car': return Car;
      case 'Utensils': return Utensils;
      default: return Sparkles;
    }
  };

  return (
    <div className="space-y-3">
      {AVAILABLE_AGENTS.map(agent => {
        const Icon = getIcon(agent.iconName);
        const isActive = currentAgentId === agent.id;
        
        return (
          <button
            key={agent.id}
            onClick={() => onSelect(agent)}
            className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-start gap-3 ${
              isActive 
                ? 'bg-slate-900 text-white shadow-md ring-2 ring-offset-2 ring-slate-900' 
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-100'
            }`}
          >
            <div className={`p-2 rounded-lg ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
              <Icon size={18} />
            </div>
            <div>
              <div className="font-bold text-sm">{agent.name}</div>
              <div className={`text-[10px] ${isActive ? 'text-slate-300' : 'text-slate-400'} leading-tight mt-0.5`}>
                {agent.role}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

const AgentChat: React.FC = () => {
  const { language } = useLanguage();
  const [currentAgent, setCurrentAgent] = useState<AgentPersona>(AVAILABLE_AGENTS[0]);
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    role: 'model',
    text: `Hello! I am ${currentAgent.name.split(' ')[0]}. How can I assist you with your property needs today?`,
    timestamp: new Date()
  }]);

  const [inputText, setInputText] = useState('');
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [loadingText, setLoadingText] = useState("thinking...");
  const [selectedItem, setSelectedItem] = useState<UnifiedItem | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingState]);

  // --- DYNAMIC LOADING STATES ---
  useEffect(() => {
     let interval: NodeJS.Timeout;
     if (loadingState === LoadingState.LOADING) {
        const states = [
           `${currentAgent.name.split(' ')[0]} is typing...`,
           "Reviewing availability...",
           "Checking best options...",
           "Consulting the database..."
        ];
        let i = 0;
        setLoadingText(states[0]);
        interval = setInterval(() => {
           i = (i + 1) % states.length;
           setLoadingText(states[i]);
        }, 1800);
     }
     return () => clearInterval(interval);
  }, [loadingState, currentAgent]);

  const handleAgentSwitch = (newAgent: AgentPersona) => {
    if (newAgent.id === currentAgent.id) return;
    
    setCurrentAgent(newAgent);
    setMessages([{
      id: `welcome-${newAgent.id}-${Date.now()}`,
      role: 'model',
      text: `Hello! I am ${newAgent.name.split(' ')[0]}. I'm here to help with ${newAgent.domainFocus.join(', ')}.`,
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

  const handlePaymentComplete = (bookingId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.booking?.id === bookingId) {
         return {
            ...msg,
            paymentRequest: false,
            text: "Payment processed successfully.",
            booking: { ...msg.booking, status: 'confirmed' }
         };
      }
      return msg;
    }));
  };

  const AgentIcon = currentAgent.iconName === 'Building2' ? Building2 : 
                    currentAgent.iconName === 'Car' ? Car : 
                    currentAgent.iconName === 'Utensils' ? Utensils : Sparkles;

  return (
    <div id="agent" className="container mx-auto px-4 -mt-20 relative z-10 mb-24">
      <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-100 flex flex-col md:flex-row h-[700px]">
        
        {/* Sidebar - Agent Selector */}
        <div className="hidden md:flex w-1/3 bg-slate-50 p-6 flex-col border-r border-slate-100">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-400/30">
              <Bot size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Islander</h2>
              <p className="text-xs text-slate-500">Select Your Expert</p>
            </div>
          </div>
          
          <div className="mb-6 overflow-y-auto custom-scrollbar">
             <AgentSelector currentAgentId={currentAgent.id} onSelect={handleAgentSwitch} />
          </div>
          
          <div className="mt-auto p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="text-xs text-slate-400 font-bold uppercase mb-2">Current Mode</div>
            <p className="text-xs text-slate-600 italic">
               "{currentAgent.description}"
            </p>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white relative">
          
          {/* Mobile Header for Agent Selection */}
          <div className="md:hidden p-4 border-b border-slate-100 bg-slate-50 flex gap-2 overflow-x-auto scrollbar-hide">
             {AVAILABLE_AGENTS.map(agent => (
               <button 
                 key={agent.id}
                 onClick={() => handleAgentSwitch(agent)}
                 className={`flex-shrink-0 px-3 py-2 rounded-full text-xs font-bold flex items-center gap-2 border transition-all ${
                   currentAgent.id === agent.id 
                   ? 'bg-slate-900 text-white border-slate-900' 
                   : 'bg-white text-slate-500 border-slate-200'
                 }`}
               >
                  {agent.name}
               </button>
             ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`flex gap-4 max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm ${
                    msg.role === 'user' ? 'bg-slate-900 text-white' : `${currentAgent.color} text-white`
                  }`}>
                    {msg.role === 'user' ? <UserIcon size={20} /> : <AgentIcon size={20} />}
                  </div>
                  
                  <div className={`p-5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-slate-900 text-white rounded-tr-none' 
                      : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                  }`}>
                    {msg.text.includes('[SHARED LOCATION:') ? (
                       <div className="flex items-center gap-2 italic text-slate-300">
                          <MapPin size={16} /> Location Shared
                       </div>
                    ) : msg.text}

                    {/* --- FLOW 1: SHORT TERM (PAYMENT) --- */}
                    {msg.paymentRequest && msg.booking && (
                       <PaymentCard booking={msg.booking} onPaid={() => handlePaymentComplete(msg.booking!.id)} />
                    )}

                    {msg.booking && msg.booking.status === 'confirmed' && (
                       <ReceiptCard booking={msg.booking} />
                    )}

                    {/* --- FLOW 2: LONG TERM (VIEWING REQUEST) --- */}
                    {msg.booking && (msg.whatsappTriggered || msg.booking.status === 'viewing_requested' || msg.booking.status === 'viewing_awaiting_owner' || msg.booking.whatsappStatus === 'sent') && (
                       <WhatsAppViewingCard booking={msg.booking} />
                    )}

                    {/* --- FLOW 3: TAXI DISPATCH --- */}
                    {msg.booking && msg.booking.status === 'taxi_dispatched' && (
                      <TaxiStatusCard booking={msg.booking} />
                    )}

                  </div>
                </div>

                {msg.recommendedItems && msg.recommendedItems.length > 0 && (
                  <div className="w-full pl-14 overflow-x-auto pb-4">
                    <div className="flex gap-4 w-max">
                      {msg.recommendedItems.map(item => (
                        <RecommendationCard key={item.id} item={item} onClick={setSelectedItem} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {loadingState === LoadingState.LOADING && (
               <div className="flex gap-4">
                  <div className={`w-10 h-10 rounded-full ${currentAgent.color} text-white flex-shrink-0 flex items-center justify-center`}>
                     <AgentIcon size={20} />
                  </div>
                  <div className="bg-white border border-slate-100 p-5 rounded-2xl rounded-tl-none flex items-center gap-2 text-slate-500 text-sm shadow-sm">
                     <Loader2 size={16} className="animate-spin text-slate-400" />
                     <span>{loadingText}</span>
                  </div>
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-slate-100 bg-white">
            <div className="relative flex items-center">
              {/* Location Button */}
              <button 
                onClick={handleShareLocation}
                disabled={isGettingLocation || loadingState === LoadingState.LOADING}
                className="absolute left-2 p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-full transition-all z-10"
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
                className="w-full pl-14 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all text-slate-800 placeholder:text-slate-400 shadow-inner"
              />
              <button 
                onClick={() => handleSendMessage(inputText)}
                disabled={!inputText.trim() || loadingState === LoadingState.LOADING}
                className="absolute right-2 p-2.5 bg-slate-900 text-white rounded-full hover:bg-slate-800 disabled:opacity-50 transition-all shadow-lg"
              >
                {loadingState === LoadingState.LOADING ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
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