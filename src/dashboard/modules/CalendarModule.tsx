
import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Ban, Building2 } from 'lucide-react';
import ModuleHeader from '../shared/ModuleHeader';
import { StorageService } from '../../services/storageService';
import { Booking } from '../../../types';

const CalendarModule: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [selectedProperty, setSelectedProperty] = useState('All Properties');
  const [calendarEvents, setCalendarEvents] = useState<Record<string, { type: string; name: string }>>({});

  useEffect(() => {
     const loadBookings = async () => {
        const bookings = await StorageService.getUserBookings();
        const events: Record<string, { type: string; name: string }> = {};
        
        bookings.forEach((b: Booking) => {
            if (b.date) {
                // Parse date cleanly
                const dateObj = new Date(b.date);
                if (!isNaN(dateObj.getTime())) {
                     const dateKey = dateObj.toISOString().split('T')[0];
                     
                     let type = 'stay';
                     if (b.status === 'viewing_requested') type = 'viewing';
                     if (b.status === 'confirmed') type = 'checkin';

                     events[dateKey] = { type, name: b.customerName };
                }
            }
        });
        setCalendarEvents(events);
     };
     loadBookings();
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => i + 1);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const toggleBlockDate = (day: number) => {
    const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setBlockedDates(prev => 
      prev.includes(dateKey) ? prev.filter(d => d !== dateKey) : [...prev, dateKey]
    );
  };

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthDays = getDaysInMonth(currentDate);
  const firstDayOffset = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col animate-in fade-in">
       <ModuleHeader 
          title="Availability Calendar" 
          description="Manage bookings and block out dates. Select a specific property to manage its individual schedule."
          action={
             <div className="relative min-w-[200px]">
                <Building2 size={16} className="absolute left-3 top-3 text-slate-400" />
                <select 
                   value={selectedProperty}
                   onChange={(e) => setSelectedProperty(e.target.value)}
                   className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-full text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500 shadow-sm appearance-none cursor-pointer"
                >
                   <option>All Properties</option>
                   <option>Luxury Villa Kyrenia</option>
                   <option>Seaside Apt Iskele</option>
                </select>
             </div>
          }
       />
       
       <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <CalendarIcon className="text-teal-600" /> {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
              </div>
              <div className="flex items-center gap-6">
                 {/* Legend */}
                 <div className="flex gap-4 text-xs font-medium text-slate-500">
                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-white border border-slate-300"></span> Available</div>
                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-100 border border-blue-200"></span> Booked</div>
                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-100 border border-slate-300"></span> Blocked</div>
                 </div>
                 <div className="h-6 w-px bg-slate-200"></div>
                 <div className="flex gap-2">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-200 rounded-full transition-colors bg-white border border-slate-200"><ChevronLeft size={16}/></button>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-slate-200 rounded-full transition-colors bg-white border border-slate-200"><ChevronRight size={16}/></button>
                 </div>
              </div>
          </div>
          
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
              {days.map(d => <div key={d} className="p-4 text-center font-bold text-slate-400 text-xs uppercase tracking-wider">{d}</div>)}
          </div>
          
          <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-white overflow-y-auto">
              {/* Empty cells for offset */}
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`offset-${i}`} className="border-b border-r border-slate-50 bg-slate-50/30"></div>
              ))}

              {monthDays.map(day => {
                const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isBlocked = blockedDates.includes(dateKey);
                const booking = calendarEvents[dateKey];
                const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

                return (
                    <div 
                      key={day} 
                      onClick={() => toggleBlockDate(day)}
                      className={`border-b border-r border-slate-50 p-2 min-h-[100px] relative transition-all group cursor-pointer ${isBlocked ? 'bg-slate-100 pattern-diagonal-lines' : 'hover:bg-slate-50'}`}
                    >
                      <div className="flex justify-between items-start">
                          <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-slate-900 text-white' : 'text-slate-700'}`}>
                            {day}
                          </span>
                          {isBlocked && <Ban size={14} className="text-slate-400" />}
                      </div>

                      <div className="mt-2 space-y-1">
                          {booking && !isBlocked && (
                            <div className={`text-[10px] px-2 py-1.5 rounded border truncate font-bold shadow-sm ${
                                booking.type === 'viewing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                booking.type === 'checkin' ? 'bg-green-50 text-green-700 border-green-200' :
                                'bg-purple-50 text-purple-700 border-purple-200'
                            }`}>
                                {booking.type === 'viewing' && '👁️ Viewing'}
                                {booking.type === 'checkin' && '🔑 Check-in'}
                                {booking.type === 'checkout' && '👋 Check-out'}
                                {booking.type === 'stay' && '🛏️ Occupied'}
                                <span className="block opacity-75 text-[9px] font-normal mt-0.5">{booking.name}</span>
                            </div>
                          )}
                      </div>
                    </div>
                );
              })}
          </div>
       </div>
    </div>
  );
};

export default CalendarModule;
