import React from 'react';
import { Settings } from 'lucide-react';

/**
 * AgentSettingsModule (V1)
 *
 * Agent settings will be moved behind Functions-only endpoints in V1.
 * This placeholder prevents legacy direct Firestore access to locked-down collections.
 */
const AgentSettingsModule: React.FC = () => {
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-4 animate-in fade-in pb-20">
      <div className="flex items-center gap-3">
        <Settings className="text-slate-400" size={22} />
        <h2 className="text-2xl font-bold text-slate-900">Agent Settings</h2>
      </div>
      <p className="text-slate-600">
        Agent settings are being migrated to the V1 tenant backend.
      </p>
      <p className="text-slate-600">
        You can already teach your salesman by uploading menus and documents in Teach Your Salesman.
      </p>
    </div>
  );
};

export default AgentSettingsModule;

