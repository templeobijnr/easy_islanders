
import React from 'react';
import { AgentPersona } from '../../types';
import { AVAILABLE_AGENTS } from '../../components/constants';

interface AgentSelectorProps {
  currentAgentId: string;
  onSelect: (agent: AgentPersona) => void;
}

const AgentSelector: React.FC<AgentSelectorProps> = ({ currentAgentId, onSelect }) => {
  return (
    <div className="space-y-4">
      {AVAILABLE_AGENTS.map(agent => {
        const isActive = currentAgentId === agent.id;
        
        return (
          <button
            key={agent.id}
            onClick={() => onSelect(agent)}
            className={`w-full text-left p-3 rounded-2xl transition-all duration-300 flex items-center gap-4 group relative ${
              isActive 
                ? 'bg-white shadow-xl shadow-slate-200/50 border-2 border-teal-500 transform scale-105 z-10' 
                : 'bg-white/50 hover:bg-white border border-transparent hover:shadow-lg hover:-translate-y-0.5'
            }`}
          >
            {/* 3D Avatar Container - Using object-contain for full 3D icon visibility */}
            <div className={`w-14 h-14 rounded-xl flex-shrink-0 relative overflow-hidden transition-all duration-500 ${isActive ? 'bg-teal-50 ring-2 ring-teal-100' : 'bg-slate-100 group-hover:bg-slate-50'}`}>
               <img 
                 src={agent.avatarUrl} 
                 alt={agent.name} 
                 className={`w-full h-full object-contain p-1 transition-transform duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} 
               />
               {isActive && (
                 <div className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
               )}
            </div>

            <div className="flex-1 min-w-0">
              <div className={`font-bold text-sm truncate ${isActive ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'}`}>
                {agent.name}
              </div>
              <div className={`text-[11px] truncate leading-tight mt-0.5 ${isActive ? 'text-teal-600 font-medium' : 'text-slate-400'}`}>
                {agent.role}
              </div>
            </div>

            {/* Active Indicator (Chevron) */}
            {isActive && (
               <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mr-2 animate-pulse"></div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default AgentSelector;
