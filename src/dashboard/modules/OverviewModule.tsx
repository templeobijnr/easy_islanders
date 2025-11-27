import React, { useState, useEffect } from 'react';
import { 
  Building2, Activity, Calendar as CalendarIcon, MessageSquare, TrendingUp, 
  Car, Key, AlertCircle, Clock, DollarSign, CheckCircle, Package, ShoppingBag, 
  Truck, Box, ArrowUpRight, ArrowDownRight, Ticket, Users, Music, PlayCircle, 
  BarChart, Utensils, ChefHat, Flame, ClipboardList, Bell, Briefcase, PenTool,
  BedDouble, LogIn, LogOut, Brush, Ban, XCircle, Coffee, ShieldCheck, Info, Sparkles
} from 'lucide-react';
import { StorageService } from '../../services/storageService';
import { Listing, Booking, BusinessConfig } from '../../../types';
import ModuleHeader from '../shared/ModuleHeader';
import PerformanceTable from './PerformanceTable';

interface OverviewModuleProps {
  onViewChange: (view: string) => void;
}

const OverviewModule: React.FC<OverviewModuleProps> = ({ onViewChange }) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [overviewTab, setOverviewTab] = useState<string>('daily');
  const [config, setConfig] = useState<BusinessConfig | null>(null);
  
  // Hotel Specific State
  const [frontDeskTab, setFrontDeskTab] = useState<'arrivals' | 'departures' | 'in_house'>('arrivals');
  const [shiftStatus, setShiftStatus] = useState<'open' | 'closed'>('open');

  useEffect(() => {
    const load = async () => {
      const bizConfig = await StorageService.getBusinessConfig();
      const [l, b] = await Promise.all([
        StorageService.getListings({ businessId: bizConfig?.id, ownerUid: bizConfig?.ownerUid }),
        StorageService.getUserBookings()
      ]);
      const c = bizConfig;

      const relevantListings = c?.domain ? l.filter(item => item.domain === c.domain) : l;
      
      if (c?.domain === 'Cars') {
         setOverviewTab(c.subType === 'sale' ? 'sale' : 'rental');
      } else if (c?.domain === 'Marketplace') {
         setOverviewTab('sales');
      } else if (c?.domain === 'Events') {
         setOverviewTab('events');
      } else if (c?.domain === 'Restaurants') {
         setOverviewTab('kitchen');
      } else if (c?.domain === 'Services') {
         setOverviewTab('services');
      } else if (c?.domain === 'Hotels') {
         setOverviewTab('occupancy');
      }

      setListings(relevantListings as Listing[]);
      setBookings(b);
      setConfig(c);
    };
    load();
  }, []);

  const filteredListings = listings.filter(l => {
     if (config?.domain === 'Cars' || config?.domain === 'Marketplace' || config?.domain === 'Events' || config?.domain === 'Restaurants' || config?.domain === 'Services' || config?.domain === 'Hotels') return true;
     if (overviewTab === 'daily') return l.rentalType === 'short-term';
     if (overviewTab === 'long') return l.rentalType === 'long-term';
     if (overviewTab === 'sale') return l.rentalType === 'sale';
     if (overviewTab === 'project') return l.rentalType === 'project';
     return true;
  });

  const activeBookingsCount = bookings.filter(b => b.status !== 'cancelled').length;
  const totalRevenue = bookings.reduce((acc, b) => acc + (b.totalPrice || 0), 0);
  const estimatedProfit = totalRevenue * 0.85;

  // --- HOTEL PMS OVERVIEW ---
  const renderHotelOverview = () => {
      // Mock Hotel Data Logic
      const totalRooms = 20; // Mock capacity
      const occupiedRooms = bookings.filter(b => b.status === 'confirmed' || b.status === 'viewing_confirmed').length;
      const occupancyRate = Math.round((occupiedRooms / totalRooms) * 100);
      
      const arrivals = bookings.slice(0, 5); // Mock today's arrivals
      const departures = bookings.slice(5, 8); // Mock today's departures
      const inHouse = bookings.slice(0, occupiedRooms); // Mock in-house

      const activeRequests = bookings.filter(b => b.specialRequests).length;

      // Mock Room Grid Generation
      const roomGrid = Array.from({ length: totalRooms }, (_, i) => {
          const roomNum = 101 + i;
          const status = i < occupiedRooms ? 'occupied' : (i % 5 === 0 ? 'dirty' : 'clean');
          const type = i % 3 === 0 ? 'Suite' : 'Standard';
          return { roomNum, status, type };
      });

      const getFrontDeskData = () => {
          if (frontDeskTab === 'arrivals') return arrivals;
          if (frontDeskTab === 'departures') return departures;
          return inHouse;
      };

      return (
          <div className="space-y-8 animate-in fade-in">
              {/* TOP LEVEL KPI CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Occupancy */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><BedDouble size={24}/></div>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${occupancyRate > 80 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                              {occupancyRate > 80 ? 'High Demand' : 'Steady'}
                          </span>
                      </div>
                      <div className="mt-4">
                          <div className="text-3xl font-bold text-slate-900">{occupancyRate}%</div>
                          <div className="text-xs text-slate-500 font-bold uppercase mt-1">Occupancy Rate</div>
                      </div>
                  </div>

                  {/* Front Desk Flow */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Briefcase size={24}/></div>
                      </div>
                      <div className="mt-4">
                          <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-bold text-slate-900">{arrivals.length}</span>
                              <span className="text-sm text-slate-400">/ {departures.length}</span>
                          </div>
                          <div className="text-xs text-slate-500 font-bold uppercase mt-1">Arrivals / Departures</div>
                      </div>
                  </div>

                  {/* RevPAR / Revenue */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><DollarSign size={24}/></div>
                          <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">+12% vs LY</span>
                      </div>
                      <div className="mt-4">
                          <div className="text-3xl font-bold text-slate-900">£{(totalRevenue / totalRooms).toFixed(0)}</div>
                          <div className="text-xs text-slate-500 font-bold uppercase mt-1">RevPAR (Today)</div>
                      </div>
                  </div>

                  {/* Requests */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between cursor-pointer hover:border-amber-300 transition-all group" onClick={() => onViewChange('requests')}>
                      <div className="flex justify-between items-start">
                          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Bell size={24}/></div>
                          {activeRequests > 0 && <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>}
                      </div>
                      <div className="mt-4">
                          <div className="text-3xl font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{activeRequests}</div>
                          <div className="text-xs text-slate-500 font-bold uppercase mt-1">Active Requests</div>
                      </div>
                  </div>
              </div>

              {/* MAIN OPERATIONS SPLIT */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* LEFT: FRONT DESK WIDGET */}
                  <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                          <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                              <Users size={20} className="text-slate-500"/> Front Desk Operations
                          </h3>
                          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                              {['arrivals', 'departures', 'in_house'].map(tab => (
                                  <button 
                                    key={tab}
                                    onClick={() => setFrontDeskTab(tab as any)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold capitalize transition-all ${frontDeskTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                  >
                                      {tab.replace('_', ' ')}
                                  </button>
                              ))}
                          </div>
                      </div>
                      <div className="flex-1 overflow-auto">
                          <table className="w-full text-left">
                              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                                  <tr>
                                      <th className="px-6 py-3">Guest Name</th>
                                      <th className="px-6 py-3">Room Type</th>
                                      <th className="px-6 py-3">Status</th>
                                      <th className="px-6 py-3 text-right">Action</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {getFrontDeskData().map((booking, idx) => (
                                      <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors">
                                          <td className="px-6 py-4">
                                              <div className="font-bold text-slate-900">{booking.customerName}</div>
                                              <div className="text-xs text-slate-500">{booking.id}</div>
                                          </td>
                                          <td className="px-6 py-4 text-sm text-slate-600">
                                              {booking.itemTitle}
                                              {booking.specialRequests && <div className="text-[10px] text-purple-600 font-bold mt-1 flex items-center gap-1"><Sparkles size={10}/> Special Request</div>}
                                          </td>
                                          <td className="px-6 py-4">
                                              {frontDeskTab === 'arrivals' ? (
                                                  <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded text-[10px] font-bold border border-amber-100">Pending Check-in</span>
                                              ) : frontDeskTab === 'departures' ? (
                                                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[10px] font-bold border border-blue-100">Due Out</span>
                                              ) : (
                                                  <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-[10px] font-bold border border-green-100">In House</span>
                                              )}
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              {frontDeskTab === 'arrivals' ? (
                                                  <button className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors">Check In</button>
                                              ) : frontDeskTab === 'departures' ? (
                                                  <button className="bg-slate-900 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors">Settle Bill</button>
                                              ) : (
                                                  <button className="text-slate-400 hover:text-slate-600"><MessageSquare size={18}/></button>
                                              )}
                                          </td>
                                      </tr>
                                  ))}
                                  {getFrontDeskData().length === 0 && (
                                      <tr><td colSpan={4} className="text-center py-10 text-slate-400 text-sm">No guests in this view.</td></tr>
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>

                  {/* RIGHT: HOUSEKEEPING GRID */}
                  <div className="space-y-6">
                      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                  <Brush size={20} className="text-orange-500"/> Room Status
                              </h3>
                              <span className="text-xs text-slate-400">Total: {totalRooms}</span>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-2">
                              {roomGrid.map((room) => (
                                  <div 
                                    key={room.roomNum} 
                                    className={`aspect-square rounded-lg flex flex-col items-center justify-center border-2 cursor-pointer transition-all hover:scale-105 ${
                                        room.status === 'clean' ? 'bg-white border-emerald-200 text-emerald-700' : 
                                        room.status === 'dirty' ? 'bg-red-50 border-red-200 text-red-700' : 
                                        'bg-blue-50 border-blue-200 text-blue-700'
                                    }`}
                                    title={`${room.type} - ${room.status.toUpperCase()}`}
                                  >
                                      <span className="text-sm font-bold">{room.roomNum}</span>
                                      <span className="text-[9px] uppercase font-bold opacity-70">{room.status === 'occupied' ? 'OCC' : room.status === 'dirty' ? 'DIR' : 'CLN'}</span>
                                  </div>
                              ))}
                          </div>
                          
                          <div className="mt-4 flex justify-between text-[10px] font-bold text-slate-500 uppercase px-2">
                              <div className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> Clean</div>
                              <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full"></div> Dirty</div>
                              <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> Occupied</div>
                          </div>
                      </div>

                      {/* Availability Snapshot */}
                      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-lg relative overflow-hidden">
                          <div className="relative z-10">
                              <div className="flex justify-between items-center mb-4">
                                  <h3 className="font-bold text-lg flex items-center gap-2"><Ban size={18} className="text-red-400"/> Availability</h3>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                      <input type="checkbox" checked={shiftStatus === 'open'} onChange={() => setShiftStatus(shiftStatus === 'open' ? 'closed' : 'open')} className="sr-only peer" />
                                      <div className="w-11 h-6 bg-red-500 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                  </label>
                              </div>
                              <div className="text-sm text-slate-300 mb-2">Today's Rate: <span className="text-white font-bold">£{listings[0]?.price || 120}</span></div>
                              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                  {shiftStatus === 'open' ? 'Online & Bookable' : 'Stop Sell Active'}
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              {/* RECENT ACTIVITY STREAM */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                  <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                      <Activity size={20} className="text-slate-400"/> Live Front Desk Feed
                  </h3>
                  <div className="space-y-4">
                      {bookings.slice(0, 4).map((b, i) => (
                          <div key={i} className="flex items-start gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors border-b border-slate-50 last:border-0">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${i % 2 === 0 ? 'bg-blue-500' : 'bg-purple-500'}`}>
                                  {b.customerName.charAt(0)}
                              </div>
                              <div className="flex-1">
                                  <div className="text-sm text-slate-900">
                                      <span className="font-bold">{b.customerName}</span> {i % 2 === 0 ? 'booked' : 'inquired about'} <span className="font-medium">{b.itemTitle}</span>
                                  </div>
                                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                      <Clock size={10}/> {i * 15 + 2} mins ago • via {b.domain === 'Hotels' ? 'Direct Booking' : 'Agent Sarah'}
                                  </div>
                              </div>
                              {i % 2 !== 0 && (
                                  <button onClick={() => onViewChange('inbox')} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors">Reply</button>
                              )}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      );
  };

  // --- SERVICES OVERVIEW ---
  const renderServicesOverview = () => {
      const activeJobs = bookings.filter(b => b.status === 'confirmed' || b.status === 'meeting_requested');
      const pendingQuotes = bookings.filter(b => b.status === 'viewing_requested'); // Reusing status for "quote requested"
      const upcoming = bookings.filter(b => new Date(b.date) > new Date()).slice(0, 3);

      return (
          <div className="space-y-8">
              {/* KPI CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                      <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Briefcase size={24}/></div>
                      <div>
                          <div className="text-2xl font-bold text-slate-900">{activeJobs.length}</div>
                          <div className="text-xs font-bold text-slate-500 uppercase">Active Jobs</div>
                      </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                      <div className="p-3 bg-orange-100 text-orange-600 rounded-xl"><PenTool size={24}/></div>
                      <div>
                          <div className="text-2xl font-bold text-slate-900">{pendingQuotes.length}</div>
                          <div className="text-xs font-bold text-slate-500 uppercase">Pending Quotes</div>
                      </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                      <div className="p-3 bg-purple-100 text-purple-600 rounded-xl"><CalendarIcon size={24}/></div>
                      <div>
                          <div className="text-2xl font-bold text-slate-900">{upcoming.length}</div>
                          <div className="text-xs font-bold text-slate-500 uppercase">Upcoming Appts</div>
                      </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                      <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><DollarSign size={24}/></div>
                      <div>
                          <div className="text-2xl font-bold text-slate-900">£{totalRevenue.toLocaleString()}</div>
                          <div className="text-xs font-bold text-slate-500 uppercase">Revenue</div>
                      </div>
                  </div>
              </div>

              {/* Main Content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                              <CalendarIcon size={20} className="text-blue-600"/> Upcoming Schedule
                          </h3>
                          <button onClick={() => onViewChange('bookings')} className="text-xs font-bold text-blue-600 hover:underline">View Calendar</button>
                      </div>
                      <div className="space-y-4">
                          {upcoming.length > 0 ? upcoming.map(b => (
                              <div key={b.id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                  <div className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-lg p-2 w-14 h-14">
                                      <span className="text-xs font-bold text-slate-500 uppercase">{new Date(b.date).toLocaleString('default', { month: 'short' })}</span>
                                      <span className="text-lg font-bold text-slate-900">{new Date(b.date).getDate()}</span>
                                  </div>
                                  <div>
                                      <div className="font-bold text-slate-900">{b.itemTitle}</div>
                                      <div className="text-sm text-slate-600">{b.customerName}</div>
                                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                          <Clock size={12}/> {b.viewingTime || "All Day"}
                                      </div>
                                  </div>
                                  <div className="ml-auto">
                                      <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">{b.status.replace('_', ' ')}</span>
                                  </div>
                              </div>
                          )) : (
                              <div className="text-center py-10 text-slate-400 text-sm">
                                  No upcoming appointments scheduled.
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="space-y-6">
                      <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                          <h3 className="font-bold text-lg mb-4 relative z-10 flex items-center gap-2">
                              <AlertCircle size={18} className="text-orange-400"/> Action Items
                          </h3>
                          <div className="space-y-4 relative z-10">
                              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10 flex justify-between items-center">
                                  <span className="text-xs font-bold text-slate-200">Respond to Quote</span>
                                  <button className="text-[10px] bg-white text-slate-900 px-2 py-1 rounded font-bold">View</button>
                              </div>
                              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10 flex justify-between items-center">
                                  <span className="text-xs font-bold text-slate-200">Confirm Appointment</span>
                                  <button className="text-[10px] bg-white text-slate-900 px-2 py-1 rounded font-bold">View</button>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  // ... (Restaurant, Events, Retail, Car, Real Estate render functions remain same)
  const renderRestaurantOverview = () => {
      const activeOrders = bookings.filter(b => ['payment_pending', 'cooking', 'ready', 'new'].includes(b.status));
      const outOfStockItems = listings.filter(l => l.status === 'out_of_stock');
      const revenueToday = totalRevenue; 
      const popularItems = listings.slice(0, 3); 

      return (
          <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div onClick={() => onViewChange('orders')} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-orange-300 transition-all group">
                      <div>
                          <div className="text-3xl font-bold text-slate-900">{activeOrders.length}</div>
                          <div className="text-xs font-bold text-slate-500 uppercase mt-1">Active Tickets</div>
                      </div>
                      <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <ChefHat size={24}/>
                      </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                      <div>
                          <div className="text-3xl font-bold text-slate-900">£{revenueToday.toLocaleString()}</div>
                          <div className="text-xs font-bold text-slate-500 uppercase mt-1">Sales Today</div>
                      </div>
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                          <DollarSign size={24}/>
                      </div>
                  </div>
                  <div onClick={() => onViewChange('listings')} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-red-300 transition-all group">
                      <div>
                          <div className="text-3xl font-bold text-slate-900">{outOfStockItems.length}</div>
                          <div className="text-xs font-bold text-slate-500 uppercase mt-1">Sold Out Items</div>
                      </div>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${outOfStockItems.length > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
                          <Utensils size={24}/>
                      </div>
                  </div>
                  <div onClick={() => onViewChange('inbox')} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-blue-300 transition-all group">
                      <div>
                          <div className="text-3xl font-bold text-slate-900">3</div>
                          <div className="text-xs font-bold text-slate-500 uppercase mt-1">New Requests</div>
                      </div>
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Bell size={24}/>
                      </div>
                  </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                          <div className="flex justify-between items-center mb-6">
                              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                  <Flame size={20} className="text-orange-500 fill-orange-100"/> Live Kitchen Feed
                              </h3>
                              <button onClick={() => onViewChange('orders')} className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full hover:bg-orange-100 transition-colors">
                                  Open KDS
                              </button>
                          </div>
                          <div className="space-y-4">
                              {activeOrders.length > 0 ? activeOrders.slice(0, 4).map(order => (
                                  <div key={order.id} className="flex items-start justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                      <div className="flex gap-4">
                                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-sm ${
                                              order.status === 'new' || order.status === 'payment_pending' ? 'bg-amber-500' : 
                                              order.status === 'cooking' ? 'bg-blue-500' : 'bg-green-500'
                                          }`}>
                                              {order.id.slice(-2)}
                                          </div>
                                          <div>
                                              <div className="font-bold text-slate-900">{order.itemTitle}</div>
                                              <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                                                  <Clock size={12}/> {new Date(order.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                  <span>•</span>
                                                  <span className="font-medium">{order.customerName}</span>
                                              </div>
                                              {order.specialRequests && (
                                                  <div className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded mt-2 inline-block font-bold border border-red-100">
                                                      Note: {order.specialRequests}
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                                          order.status === 'new' || order.status === 'payment_pending' ? 'bg-amber-100 text-amber-700' : 
                                          order.status === 'cooking' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                      }`}>
                                          {order.status.replace('_', ' ')}
                                      </span>
                                  </div>
                              )) : (
                                  <div className="text-center py-10 text-slate-400">
                                      <Utensils size={32} className="mx-auto mb-2 opacity-20"/>
                                      <p className="text-sm">Kitchen is clear. No active orders.</p>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
                  <div className="space-y-6">
                      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                  <ClipboardList size={20} className="text-slate-500"/> Menu Health
                              </h3>
                          </div>
                          {outOfStockItems.length > 0 ? (
                              <div className="space-y-3 mb-4">
                                  {outOfStockItems.map(item => (
                                      <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-xl">
                                          <span className="text-xs font-bold text-red-700 truncate max-w-[120px]">{item.title}</span>
                                          <button onClick={() => onViewChange('listings')} className="text-[10px] bg-white border border-red-200 text-red-600 px-2 py-1 rounded-lg font-bold hover:bg-red-50">
                                              Restock
                                          </button>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-center mb-4">
                                  <CheckCircle size={24} className="text-green-600 mx-auto mb-2"/>
                                  <p className="text-xs text-green-800 font-bold">All items available</p>
                              </div>
                          )}
                          <button onClick={() => onViewChange('listings')} className="w-full py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                              Manage Menu Availability
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderEventsOverview = () => {
     // (Keep existing code)
     const totalTicketsSold = listings.reduce((acc, l: any) => acc + ((l.totalTickets || 0) - (l.ticketsAvailable || 0)), 0);
     const upcomingEvents = listings.filter((l: any) => new Date(l.date) > new Date()).length;
     const totalCapacity = listings.reduce((acc, l: any) => acc + (l.totalTickets || 0), 0);
     const attendanceRate = Math.round((totalTicketsSold / (totalCapacity || 1)) * 100);

     return (
        <div className="space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-purple-100 text-purple-600 rounded-xl"><Ticket size={24}/></div>
                  <div>
                     <div className="text-2xl font-bold text-slate-900">{totalTicketsSold}</div>
                     <div className="text-xs font-bold text-slate-500 uppercase">Tickets Sold</div>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-pink-100 text-pink-600 rounded-xl"><Music size={24}/></div>
                  <div>
                     <div className="text-2xl font-bold text-slate-900">{upcomingEvents}</div>
                     <div className="text-xs font-bold text-slate-500 uppercase">Upcoming Events</div>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><DollarSign size={24}/></div>
                  <div>
                     <div className="text-2xl font-bold text-slate-900">£{totalRevenue.toLocaleString()}</div>
                     <div className="text-xs font-bold text-slate-500 uppercase">Box Office Revenue</div>
                  </div>
               </div>
           </div>
           {/* ... rest of events overview ... */}
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                         <Users size={20} className="text-purple-600"/> Attendance & Capacity
                      </h3>
                      <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded font-bold">{attendanceRate}% Sold Out</span>
                  </div>
                  <div className="space-y-4">
                      {listings.slice(0, 4).map((l: any) => {
                         const sold = (l.totalTickets || 0) - (l.ticketsAvailable || 0);
                         const pct = Math.round((sold / (l.totalTickets || 1)) * 100);
                         return (
                             <div key={l.id}>
                                 <div className="flex justify-between text-sm mb-1">
                                     <span className="font-bold text-slate-700">{l.title}</span>
                                     <span className="text-slate-500">{sold}/{l.totalTickets}</span>
                                 </div>
                                 <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                     <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: `${pct}%` }}></div>
                                 </div>
                             </div>
                         )
                      })}
                  </div>
               </div>
               <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                   <h3 className="font-bold text-lg mb-4 flex items-center gap-2 relative z-10">
                      <BarChart size={20} className="text-pink-400"/> Marketing Impact
                   </h3>
                   <div className="space-y-6 relative z-10">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                             <div className="p-2 bg-white/10 rounded-lg"><PlayCircle size={16}/></div>
                             <span className="text-sm font-medium">Video Views</span>
                         </div>
                         <span className="font-bold text-xl">12.5k</span>
                      </div>
                      <div className="pt-4 border-t border-white/10">
                         <div className="text-xs text-slate-400 uppercase mb-1">Conversion Rate</div>
                         <div className="text-3xl font-bold text-emerald-400">4.2%</div>
                      </div>
                   </div>
                   <button onClick={() => onViewChange('marketing')} className="w-full mt-6 bg-white text-slate-900 py-3 rounded-xl font-bold hover:bg-slate-100 transition-colors relative z-10">
                      Manage Campaigns
                   </button>
               </div>
           </div>
           <PerformanceTable listings={filteredListings} filterType="events" />
        </div>
     );
  };

  const renderRetailOverview = () => {
    const lowStockItems = listings.filter(l => (l as any).stock && (l as any).stock < 5).slice(0, 3);
    const recentOrders = bookings.slice(0, 4);

    return (
      <div className="space-y-8">
         <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
               <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full -mr-2 -mt-2"></div>
               <div className="flex justify-between items-start relative z-10">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><DollarSign size={22}/></div>
                  <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                     <ArrowUpRight size={10} /> +12%
                  </span>
               </div>
               <div className="mt-6">
                  <div className="text-3xl font-bold text-slate-900">£{(totalRevenue * 1.2).toLocaleString()}</div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Total Revenue (May)</div>
               </div>
            </div>
            {/* ... other retail KPI cards ... */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
               <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-2 -mt-2"></div>
               <div className="flex justify-between items-start relative z-10">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><Package size={22}/></div>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Today</span>
               </div>
               <div className="mt-6">
                  <div className="text-3xl font-bold text-slate-900">24</div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Orders Processing</div>
               </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
               <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-bl-full -mr-2 -mt-2"></div>
               <div className="flex justify-between items-start relative z-10">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-xl"><AlertCircle size={22}/></div>
               </div>
               <div className="mt-6">
                  <div className="text-3xl font-bold text-slate-900">{lowStockItems.length}</div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Low Stock Alerts</div>
               </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
               <div className="absolute top-0 right-0 w-16 h-16 bg-purple-50 rounded-bl-full -mr-2 -mt-2"></div>
               <div className="flex justify-between items-start relative z-10">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-xl"><Truck size={22}/></div>
               </div>
               <div className="mt-6">
                  <div className="text-3xl font-bold text-slate-900">8</div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Pending Shipment</div>
               </div>
            </div>
         </div>
         {/* ... rest of retail dashboard ... */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2"><TrendingUp size={20}/> Sales Overview</h3>
                    </div>
                    <div className="h-48 flex items-end justify-between gap-2">
                        {[65, 45, 75, 50, 85, 90, 70].map((h, i) => (
                           <div key={i} className="w-full bg-slate-50 rounded-t-lg relative group">
                               <div 
                                 className="absolute bottom-0 left-0 right-0 bg-teal-500 rounded-t-lg transition-all duration-500 group-hover:bg-teal-600"
                                 style={{ height: `${h}%` }}
                               ></div>
                           </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="space-y-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2"><Box size={20}/> Inventory Health</h3>
                    {lowStockItems.length > 0 ? (
                       <div className="space-y-3">
                          {lowStockItems.map(item => (
                             <div key={item.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                                <div className="flex-1">
                                   <div className="text-xs font-bold text-slate-900 line-clamp-1">{item.title}</div>
                                   <div className="text-[10px] text-red-600 font-bold">Only {(item as any).stock} left</div>
                                </div>
                             </div>
                          ))}
                       </div>
                    ) : (
                       <div className="text-center py-8 text-slate-400 text-sm">All stock levels healthy.</div>
                    )}
                </div>
            </div>
         </div>
      </div>
    );
  };

  const renderCarRentalMetrics = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-blue-300 transition-all">
            <div className="flex justify-between items-start">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Car size={20}/></div>
                <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">85% Util</span>
            </div>
            <div className="mt-4">
                <div className="text-2xl font-bold text-slate-900">{listings.length}</div>
                <div className="text-xs text-slate-500 font-bold uppercase">Total Fleet</div>
            </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-amber-300 transition-all">
            <div className="flex justify-between items-start">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Clock size={20}/></div>
                <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">2 Late</span>
            </div>
            <div className="mt-4">
                <div className="text-2xl font-bold text-slate-900">5</div>
                <div className="text-xs text-slate-500 font-bold uppercase">Returns Today</div>
            </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-emerald-300 transition-all">
            <div className="flex justify-between items-start">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Key size={20}/></div>
            </div>
            <div className="mt-4">
                <div className="text-2xl font-bold text-slate-900">8</div>
                <div className="text-xs text-slate-500 font-bold uppercase">Departures Today</div>
            </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-purple-300 transition-all">
            <div className="flex justify-between items-start">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><DollarSign size={20}/></div>
            </div>
            <div className="mt-4">
                <div className="text-2xl font-bold text-slate-900">£{totalRevenue.toLocaleString()}</div>
                <div className="text-xs text-slate-500 font-bold uppercase">Revenue MTD</div>
            </div>
        </div>
    </div>
  );

  const renderCarSalesMetrics = () => {
      const totalInventoryValue = listings.reduce((acc, item) => acc + (item.price || 0), 0);
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Car size={20}/></div>
                </div>
                <div className="mt-4">
                    <div className="text-2xl font-bold text-slate-900">{listings.length}</div>
                    <div className="text-xs text-slate-500 font-bold uppercase">In Stock</div>
                </div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp size={20}/></div>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">+12% YoY</span>
                </div>
                <div className="mt-4">
                    <div className="text-2xl font-bold text-slate-900">4</div>
                    <div className="text-xs text-slate-500 font-bold uppercase">Units Sold (May)</div>
                </div>
            </div>
            {/* ... */}
        </div>
      );
  };

  const renderRealEstateMetrics = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div onClick={() => onViewChange('listings')} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><Building2 size={20}/></div>
            <div className="text-2xl font-bold text-slate-900">{listings.length}</div>
            <div className="text-xs text-slate-500 font-bold uppercase">Total Listings</div>
        </div>
        <div onClick={() => onViewChange('bookings')} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><Activity size={20}/></div>
            <div className="text-2xl font-bold text-slate-900">{activeBookingsCount}</div>
            <div className="text-xs text-slate-500 font-bold uppercase">Active Bookings</div>
        </div>
        <div onClick={() => onViewChange('bookings')} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group">
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><CalendarIcon size={20}/></div>
            <div className="text-2xl font-bold text-slate-900">View</div>
            <div className="text-xs text-slate-500 font-bold uppercase">Calendar</div>
        </div>
        <div onClick={() => onViewChange('inbox')} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group">
            <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><MessageSquare size={20}/></div>
            <div className="text-2xl font-bold text-slate-900">3</div>
            <div className="text-xs text-slate-500 font-bold uppercase">New Messages</div>
        </div>
    </div>
  );

  const getTabLabels = () => {
      if (config?.domain === 'Cars') {
          return config.subType === 'sale' 
            ? [{ id: 'sale', label: 'Inventory' }] 
            : [{ id: 'rental', label: 'Fleet Status' }];
      }
      return [
        { id: 'daily', label: 'Daily Rentals' },
        { id: 'long', label: 'Long Term' },
        { id: 'sale', label: 'Sales' },
        { id: 'project', label: 'Projects' }
      ];
  };

  return (
    <div className="space-y-8 animate-in fade-in">
        <ModuleHeader 
           title={
             config?.domain === 'Cars' ? `${config.subType === 'sale' ? 'Dealership' : 'Rental'} Operations` : 
             config?.domain === 'Marketplace' ? 'Retail Dashboard' : 
             config?.domain === 'Events' ? 'Events & Nightlife' : 
             config?.domain === 'Restaurants' ? 'Restaurant & Kitchen' :
             config?.domain === 'Services' ? 'Service Provider Dashboard' :
             config?.domain === 'Hotels' ? 'Hotel Operations' :
             "Business Overview"
           } 
           description={
             config?.domain === 'Marketplace' ? "Manage products, track sales, and handle logistics." : 
             config?.domain === 'Events' ? "Manage your events, track ticket sales, and promote to the island." : 
             config?.domain === 'Restaurants' ? "Monitor kitchen flow, manage menu items, and track daily orders." :
             config?.domain === 'Services' ? "Track appointments, manage jobs, and handle quotes." :
             config?.domain === 'Hotels' ? "Front desk management, housekeeping status, and occupancy tracking." :
             "A snapshot of your business performance, revenue, and active notifications."
           }
        />
        
        {config?.domain === 'Marketplace' ? (
           renderRetailOverview()
        ) : config?.domain === 'Events' ? (
           renderEventsOverview()
        ) : config?.domain === 'Restaurants' ? (
           renderRestaurantOverview()
        ) : config?.domain === 'Services' ? (
           renderServicesOverview()
        ) : config?.domain === 'Hotels' ? (
           renderHotelOverview()
        ) : (
           <>
             <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                        <div>
                            <div className="text-xs text-slate-400 font-bold uppercase mb-1">{config?.domain === 'Cars' && config?.subType === 'sale' ? 'Gross Sales (May)' : 'Net Profit'}</div>
                            <div className="text-4xl font-bold text-emerald-400">£{estimatedProfit.toLocaleString()}</div>
                        </div>
                        <div className="flex gap-6">
                            <div className="text-right">
                                <div className="text-xs text-slate-400 font-bold uppercase">Inbox</div>
                                <div className="text-2xl font-bold text-white">3</div>
                            </div>
                            <div className="w-px h-10 bg-white/10"></div>
                            <div className="text-right">
                                <div className="text-xs text-slate-400 font-bold uppercase">{config?.domain === 'Cars' ? 'Fleet Health' : 'Occupancy'}</div>
                                <div className="text-2xl font-bold text-white">92%</div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {getTabLabels().map(tab => (
                            <button
                            key={tab.id}
                            onClick={() => setOverviewTab(tab.id)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${overviewTab === tab.id ? 'bg-teal-500 text-white' : 'bg-white/10 text-slate-300 hover:bg-white/20'}`}
                            >
                            {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
             </div>
             {config?.domain === 'Cars' ? (
                 config.subType === 'sale' ? renderCarSalesMetrics() : renderCarRentalMetrics()
             ) : (
                 renderRealEstateMetrics()
             )}
             <PerformanceTable listings={filteredListings} filterType={overviewTab} />
           </>
        )}
    </div>
  );
};

export default OverviewModule;
