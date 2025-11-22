
import React from 'react';
import { MapPin, User, Phone, Navigation, Star } from 'lucide-react';
import { Booking } from '../../../types';

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
                <User size={20} className="text-slate-500" />
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

export default TaxiStatusCard;
