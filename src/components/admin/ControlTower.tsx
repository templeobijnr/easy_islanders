
import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, Users, Sliders, ShieldAlert, DollarSign, 
  Map, Radio, Zap, AlertTriangle, CheckCircle, XCircle, 
  Search, Eye, Lock, LogOut, BarChart3, Terminal, Layers,
  Globe, Server, Database, Wifi, CreditCard, TrendingUp,
  Settings, Bell, User, Key, Shield, Cpu, RefreshCw,
  ChevronRight, Menu, MessageSquare, Power, ChevronLeft,
  FileText, Download, Upload
} from 'lucide-react';
import { SocialUser, UnifiedItem } from '../../types';
import { StorageService } from '../../services/storageService';
import { MOCK_HOT_ZONES } from '../../components/constants';

interface ControlTowerProps {
  onExit: () => void;
}

type Deck = 'mission' | 'algo' | 'users' | 'content' | 'finance' | 'settings';

const ControlTower: React.FC<ControlTowerProps> = ({ onExit }) => {
  // --- STATE ---
  const [activeDeck, setActiveDeck] = useState<Deck>('mission');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [logs, setLogs] = useState<string[]>([
    "[SYSTEM] Initializing Control Tower v3.0...",
    "[AUTH] Super Admin session verified (IP: 192.168.1.1)",
    "[DB] Connected to Firestore: easy-db (Latency: 24ms)",
    "[LIVE] Vibe Stream connected. Listening for signals...",
  ]);
  
  // Mock Data State
  const [users, setUsers] = useState<SocialUser[]>([]);
  const [pendingItems, setPendingItems] = useState<UnifiedItem[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  
  // Algo State
  const [weights, setWeights] = useState({ recency: 50, popularity: 50, revenue: 30 });
  const [globalBoosts, setGlobalBoosts] = useState({ weekend: false, summer: true, festival: false });

  // System State
  const [systemStatus, setSystemStatus] = useState<'operational' | 'maintenance' | 'degraded'>('operational');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    activeUsers: 142,
    revenueToday: 4250,
    pendingBookings: 8,
    systemHealth: 98
  });

  // Terminal Auto-Scroll
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    // Simulate log stream
    const logInterval = setInterval(() => {
       if (Math.random() > 0.7) {
          const actions = ["[API] GET /listings (200 OK)", "[WS] New connection established", "[DB] Cache refresh", "[AUTH] Token validated"];
          const newLog = `${actions[Math.floor(Math.random() * actions.length)]} - ${new Date().toLocaleTimeString()}`;
          setLogs(prev => [...prev.slice(-19), newLog]);
       }
    }, 2000);

    loadData();
    return () => { clearInterval(timer); clearInterval(logInterval); };
  }, []);

  useEffect(() => {
     if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
     }
  }, [logs]);

  const loadData = async () => {
    const u = await StorageService.getSocialUsers();
    const l = await StorageService.getListings();
    
    setUsers(u);
    setPendingItems(l.slice(0, 6)); // Mock pending items from listings
    
    // Mock Transactions
    setRecentTransactions([
       { id: 'TX-992', amount: 1200, user: 'Sarah J.', type: 'Booking', status: 'Cleared', time: '2m ago' },
       { id: 'TX-991', amount: 450, user: 'Mike R.', type: 'Deposit', status: 'Cleared', time: '15m ago' },
       { id: 'TX-990', amount: 85, user: 'Alex C.', type: 'Refund', status: 'Pending', time: '1h ago' },
       { id: 'TX-989', amount: 2400, user: 'Elena P.', type: 'Booking', status: 'Cleared', time: '2h ago' },
    ]);
  };

  // --- UI COMPONENTS ---

  const StatCard = ({ label, value, trend, icon: Icon, color }: any) => (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-4 rounded-2xl flex items-center justify-between group hover:border-slate-700 transition-all">
        <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">{label}</p>
            <div className="text-2xl font-mono font-bold text-white">{value}</div>
            {trend && <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1"><TrendingUp size={10}/> {trend}</div>}
        </div>
        <div className={`p-3 rounded-xl bg-slate-800/50 group-hover:scale-110 transition-transform ${color}`}>
            <Icon size={20} />
        </div>
    </div>
  );

  const GlassPanel = ({ children, className = "", title, icon: Icon, action }: any) => (
     <div className={`bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-3xl overflow-hidden flex flex-col ${className}`}>
        {(title || action) && (
           <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              {title && (
                 <h3 className="font-bold text-white flex items-center gap-2 text-sm tracking-wide">
                    {Icon && <Icon size={16} className="text-cyan-400"/>} {title}
                 </h3>
              )}
              {action}
           </div>
        )}
        <div className="p-5 flex-1 overflow-auto custom-scrollbar">{children}</div>
     </div>
  );

  // --- DECK 1: MISSION CONTROL ---
  const renderMissionControl = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
       {/* Top Stats Row */}
       <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <StatCard label="Active Users" value={stats.activeUsers} trend="+12% vs 1h ago" icon={Users} color="text-cyan-400" />
          <StatCard label="Revenue (24h)" value={`£${stats.revenueToday}`} trend="+5% vs Yesterday" icon={DollarSign} color="text-emerald-400" />
          <StatCard label="Pending Tasks" value={stats.pendingBookings} icon={CheckCircle} color="text-amber-400" />
          <StatCard label="System Health" value={`${stats.systemHealth}%`} icon={Activity} color="text-fuchsia-400" />
       </div>

       {/* Live Map Simulation */}
       <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 relative overflow-hidden min-h-[400px] group">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
          
          {/* Grid Overlay */}
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

          {/* Radar Animations */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <div className="w-[500px] h-[500px] border border-cyan-500/10 rounded-full animate-[spin_10s_linear_infinite]"></div>
             <div className="w-[300px] h-[300px] border border-cyan-500/20 rounded-full animate-[spin_8s_linear_infinite_reverse]"></div>
             <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent top-1/2 animate-pulse"></div>
             <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent left-1/2 animate-pulse"></div>
          </div>

          <div className="relative z-10 flex justify-between items-start">
             <div>
                <h3 className="text-cyan-400 font-mono text-xs uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                   <Globe size={14}/> Live Geo-Spatial Map
                </h3>
                <p className="text-slate-500 text-[10px] font-mono">Region: North Cyprus (TRNC)</p>
             </div>
             <div className="flex items-center gap-2 bg-slate-950/50 px-3 py-1 rounded-full border border-white/5">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-red-500 font-mono text-[10px] font-bold">LIVE FEED</span>
             </div>
          </div>

          {/* Hot Zone Dots */}
          <div className="absolute inset-0 pointer-events-none">
             {MOCK_HOT_ZONES.map((zone, i) => (
                <div key={zone.id} className="absolute group/zone cursor-pointer pointer-events-auto" style={{ top: `${30 + i * 12}%`, left: `${20 + i * 15}%` }}>
                   <div className="w-4 h-4 bg-cyan-500/20 rounded-full animate-ping absolute"></div>
                   <div className="w-2 h-2 bg-cyan-400 rounded-full relative z-10 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
                   
                   {/* Tooltip */}
                   <div className="absolute left-4 top-0 bg-slate-900/90 backdrop-blur border border-slate-700 p-2 rounded-lg opacity-0 group-hover/zone:opacity-100 transition-opacity min-w-[120px] z-20">
                      <div className="text-[10px] text-cyan-400 font-bold uppercase">{zone.category}</div>
                      <div className="text-xs font-bold text-white">{zone.name}</div>
                      <div className="text-[10px] text-slate-400">{zone.activeCount} users active</div>
                   </div>
                </div>
             ))}
          </div>
       </div>

       {/* System Vitals Column */}
       <div className="space-y-6 flex flex-col">
          {/* Terminal */}
          <GlassPanel className="flex-1 min-h-[200px]" title="System Terminal" icon={Terminal}>
             <div ref={terminalRef} className="font-mono text-[10px] space-y-1 text-slate-400 h-full overflow-y-auto max-h-[180px]">
                {logs.map((log, i) => (
                   <div key={i} className="border-l-2 border-slate-800 pl-2 hover:border-cyan-500/50 hover:text-cyan-200 transition-colors cursor-default">
                      <span className="text-slate-600 mr-2">{i+100}</span>
                      {log}
                   </div>
                ))}
                <div className="animate-pulse text-cyan-500">_</div>
             </div>
          </GlassPanel>

          {/* Infrastructure Health */}
          <GlassPanel title="Infrastructure" icon={Server}>
             <div className="space-y-4">
                {[
                   { label: "API Gateway", status: "Healthy", lat: "24ms", color: "text-emerald-400" },
                   { label: "Database (Pri)", status: "Healthy", lat: "12ms", color: "text-emerald-400" },
                   { label: "Storage Bucket", status: "Healthy", lat: "89ms", color: "text-emerald-400" },
                   { label: "AI Inference", status: "High Load", lat: "450ms", color: "text-amber-400" },
                ].map((item, i) => (
                   <div key={i} className="flex items-center justify-between text-xs border-b border-white/5 pb-2 last:border-0 last:pb-0">
                      <span className="text-slate-300 font-mono">{item.label}</span>
                      <div className="flex gap-3">
                         <span className="text-slate-500 font-mono">{item.lat}</span>
                         <span className={`font-bold ${item.color}`}>{item.status}</span>
                      </div>
                   </div>
                ))}
             </div>
          </GlassPanel>
       </div>
    </div>
  );

  // --- DECK 2: ALGO TUNER ---
  const renderAlgoTuner = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
       <GlassPanel title="Ranking Algorithm Parameters" icon={Sliders}>
          <div className="space-y-8 py-4">
             {[
               { key: 'recency', label: 'Recency Bias', desc: 'Prioritize newer listings', color: 'accent-fuchsia-500' },
               { key: 'popularity', label: 'Popularity Bias', desc: 'Prioritize high-traffic items', color: 'accent-cyan-500' },
               { key: 'revenue', label: 'Margin Optimization', desc: 'Prioritize high-commission items', color: 'accent-emerald-500' }
             ].map((slider) => (
                <div key={slider.key}>
                   <div className="flex justify-between text-sm mb-2">
                      <span className="text-white font-bold">{slider.label}</span>
                      <span className="text-slate-400 font-mono">{(weights as any)[slider.key]}%</span>
                   </div>
                   <input 
                     type="range" 
                     value={(weights as any)[slider.key]} 
                     onChange={e => setWeights({...weights, [slider.key]: parseInt(e.target.value)})}
                     className={`w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer ${slider.color}`}
                   />
                   <p className="text-xs text-slate-500 mt-1">{slider.desc}</p>
                </div>
             ))}
          </div>
       </GlassPanel>

       <GlassPanel title="Global Boosts" icon={Zap}>
          <div className="space-y-4">
             {Object.entries(globalBoosts).map(([key, isActive]) => (
                <div key={key} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-white/5">
                   <div>
                      <span className="text-white font-bold capitalize">{key} Mode</span>
                      <p className="text-xs text-slate-500">Apply multiplier to {key} listings</p>
                   </div>
                   <button 
                     onClick={() => setGlobalBoosts(prev => ({...prev, [key]: !isActive}))}
                     className={`w-12 h-6 rounded-full relative transition-colors ${isActive ? 'bg-cyan-500' : 'bg-slate-700'}`}
                   >
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${isActive ? 'left-7' : 'left-1'}`}></div>
                   </button>
                </div>
             ))}
          </div>
       </GlassPanel>
    </div>
  );

  // --- DECK 3: SETTINGS (SYSTEM CONFIG) ---
  const renderSettings = () => (
     <div className="space-y-6 animate-in fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <GlassPanel title="Platform Controls" icon={Power}>
              <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <div>
                       <h4 className="text-white font-bold">Maintenance Mode</h4>
                       <p className="text-xs text-slate-500">Disable user access for updates</p>
                    </div>
                    <button 
                      onClick={() => setMaintenanceMode(!maintenanceMode)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${maintenanceMode ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                       {maintenanceMode ? 'ACTIVE' : 'DISABLED'}
                    </button>
                 </div>
                 <div className="border-t border-white/5 pt-4">
                    <button className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                       <RefreshCw size={14}/> Flush Cache
                    </button>
                 </div>
              </div>
           </GlassPanel>

           <GlassPanel title="Database Tools" icon={Database}>
              <div className="grid grid-cols-2 gap-4">
                 <button className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors border border-white/5 group">
                    <Download size={20} className="text-emerald-400 group-hover:scale-110 transition-transform"/>
                    <span className="text-xs font-bold text-slate-300">Export Data</span>
                 </button>
                 <button className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors border border-white/5 group">
                    <Upload size={20} className="text-blue-400 group-hover:scale-110 transition-transform"/>
                    <span className="text-xs font-bold text-slate-300">Import Backup</span>
                 </button>
              </div>
           </GlassPanel>
        </div>

        <GlassPanel title="Admin Audit Log" icon={FileText}>
           <table className="w-full text-left">
              <thead className="text-xs font-mono text-slate-500 uppercase bg-slate-800/50">
                 <tr>
                    <th className="p-3">Time</th>
                    <th className="p-3">Admin</th>
                    <th className="p-3">Action</th>
                    <th className="p-3 text-right">Status</th>
                 </tr>
              </thead>
              <tbody className="text-xs font-mono text-slate-400 divide-y divide-white/5">
                 <tr>
                    <td className="p-3">10:42:05</td>
                    <td className="p-3 text-white">root_admin</td>
                    <td className="p-3">UPDATE_CONFIG</td>
                    <td className="p-3 text-right text-emerald-400">SUCCESS</td>
                 </tr>
                 <tr>
                    <td className="p-3">09:15:22</td>
                    <td className="p-3 text-white">system_cron</td>
                    <td className="p-3">SYNC_LISTINGS</td>
                    <td className="p-3 text-right text-emerald-400">SUCCESS</td>
                 </tr>
                 <tr>
                    <td className="p-3">08:30:00</td>
                    <td className="p-3 text-white">root_admin</td>
                    <td className="p-3">AUTH_LOGIN</td>
                    <td className="p-3 text-right text-emerald-400">VERIFIED</td>
                 </tr>
              </tbody>
           </table>
        </GlassPanel>
     </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30">
       {/* Top Bar */}
       <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 z-50 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
             <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                <Shield size={20} className="text-cyan-400"/>
             </div>
             <span className="font-bold text-white tracking-wide">CONTROL TOWER <span className="text-xs font-mono text-cyan-500 ml-2">v3.0</span></span>
          </div>

          <div className="flex-1 max-w-xl mx-12 hidden md:block">
             <div className="relative group">
                <Search size={16} className="absolute left-4 top-3 text-slate-500 group-focus-within:text-cyan-400 transition-colors"/>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Global Search (Users, Transaction IDs, IP Addresses)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-full py-2.5 pl-12 pr-4 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-slate-600 font-mono"
                />
                <div className="absolute right-3 top-2.5 flex gap-2">
                   <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded border border-white/10 text-slate-400">CMD+K</span>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-6">
             <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-500">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                {currentTime.toLocaleTimeString()} UTC
             </div>
             <div className="h-6 w-px bg-white/10"></div>
             <button onClick={() => setShowProfile(true)} className="flex items-center gap-3 hover:bg-white/5 px-3 py-1.5 rounded-lg transition-colors">
                <div className="text-right hidden md:block">
                   <div className="text-xs font-bold text-white">Super Admin</div>
                   <div className="text-[10px] text-cyan-400">Level 5 Access</div>
                </div>
                <div className="w-8 h-8 bg-slate-800 rounded-lg border border-white/10 flex items-center justify-center">
                   <User size={16} className="text-slate-400"/>
                </div>
             </button>
          </div>
       </div>

       {/* Sidebar */}
       <div className={`fixed top-16 bottom-0 left-0 w-64 bg-slate-900/50 backdrop-blur-sm border-r border-white/5 p-4 transition-transform z-40 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
          <div className="space-y-1">
             {[
                { id: 'mission', label: 'Mission Control', icon: Activity },
                { id: 'users', label: 'User Directory', icon: Users },
                { id: 'finance', label: 'Financials', icon: DollarSign },
                { id: 'algo', label: 'Algorithm Tuner', icon: Sliders },
                { id: 'content', label: 'Content Moderation', icon: ShieldAlert },
                { id: 'settings', label: 'System Config', icon: Settings },
             ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveDeck(item.id as Deck)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                     activeDeck === item.id 
                     ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                     : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                   <item.icon size={18} />
                   {item.label}
                </button>
             ))}
          </div>

          <div className="absolute bottom-4 left-4 right-4">
             <button onClick={onExit} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:border hover:border-red-500/20 transition-all">
                <LogOut size={18} /> Exit God Mode
             </button>
          </div>
       </div>

       {/* Main Content Area */}
       <div className={`pt-24 pb-12 px-6 transition-all ${isSidebarOpen ? 'lg:ml-64' : ''}`}>
          <div className="max-w-7xl mx-auto">
             
             {/* Breadcrumb / Header */}
             <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-6 uppercase tracking-widest">
                <span className="text-cyan-500">SYSTEM</span>
                <ChevronRight size={12}/>
                <span>{activeDeck.replace('_', ' ')}</span>
             </div>

             {activeDeck === 'mission' && renderMissionControl()}
             {activeDeck === 'algo' && renderAlgoTuner()}
             {activeDeck === 'settings' && renderSettings()}
             {(activeDeck === 'users' || activeDeck === 'content' || activeDeck === 'finance') && (
                <div className="flex flex-col items-center justify-center h-[400px] bg-slate-900/50 rounded-3xl border border-white/5 border-dashed">
                   <Lock size={48} className="text-slate-700 mb-4"/>
                   <h3 className="text-xl font-bold text-slate-500">Module Locked</h3>
                   <p className="text-slate-600 text-sm mt-2">This deck is currently restricted or under development.</p>
                </div>
             )}
          </div>
       </div>

       {/* Admin Profile Modal */}
       {showProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowProfile(false)}></div>
             <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 relative z-10 shadow-2xl animate-in zoom-in-95">
                <div className="flex items-center gap-4 mb-6">
                   <div className="w-16 h-16 bg-cyan-500 rounded-full flex items-center justify-center text-2xl font-bold text-black">SA</div>
                   <div>
                      <h2 className="text-xl font-bold text-white">Super Admin</h2>
                      <p className="text-cyan-400 text-sm font-mono">ID: ROOT_8821_X</p>
                   </div>
                </div>
                
                <div className="space-y-4">
                   <div className="bg-slate-950 p-4 rounded-xl border border-white/5">
                      <div className="text-xs text-slate-500 uppercase font-bold mb-2">Security Status</div>
                      <div className="flex items-center justify-between text-sm">
                         <span className="text-slate-300">2FA Enabled</span>
                         <span className="text-emerald-400 font-bold">ACTIVE</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-2">
                         <span className="text-slate-300">IP Whitelist</span>
                         <span className="text-emerald-400 font-bold">ACTIVE</span>
                      </div>
                   </div>
                   <div className="bg-slate-950 p-4 rounded-xl border border-white/5">
                      <div className="text-xs text-slate-500 uppercase font-bold mb-2">Session Info</div>
                      <div className="font-mono text-xs text-slate-400 space-y-1">
                         <p>Start: {new Date().toLocaleDateString()} 08:00:00</p>
                         <p>Expires: +12h</p>
                         <p>Token: eyJhbGciOiJIUz...</p>
                      </div>
                   </div>
                </div>

                <button onClick={() => setShowProfile(false)} className="w-full mt-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-colors">
                   Close Profile
                </button>
             </div>
          </div>
       )}
    </div>
  );
};

export default ControlTower;
