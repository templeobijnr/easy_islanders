
import React from 'react';
import { Info } from 'lucide-react';

interface ModuleHeaderProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

const ModuleHeader: React.FC<ModuleHeaderProps> = ({ title, description, action }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-100">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
        <div className="flex items-center gap-2 mt-2 text-slate-500">
          <Info size={16} className="text-teal-600 flex-shrink-0" />
          <p className="text-sm font-medium max-w-2xl">{description}</p>
        </div>
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
};

export default ModuleHeader;
