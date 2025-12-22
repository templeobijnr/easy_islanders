import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

/**
 * CalendarModule (V1)
 *
 * Reservations/availability are being migrated to the V1 multi-tenant backend.
 * This placeholder prevents legacy Firestore reads/writes that are now default-deny.
 */
const CalendarModule: React.FC = () => {
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-4 animate-in fade-in pb-20">
      <div className="flex items-center gap-3">
        <CalendarIcon className="text-slate-400" size={22} />
        <h2 className="text-2xl font-bold text-slate-900">Reservations</h2>
      </div>

      <p className="text-slate-600">
        Reservations and availability are being upgraded to the new V1 tenant system.
      </p>
      <p className="text-slate-600">
        For now, your salesman will capture leads when it can’t confidently answer, and you can follow up from Inbox &amp;
        Chats.
      </p>
    </div>
  );
};

export default CalendarModule;

