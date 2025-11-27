
import React, { useState } from 'react';
import { UploadCloud, FileText, Check, ArrowRight, Loader2, AlertCircle, X } from 'lucide-react';

interface ImportWizardProps {
  onClose: () => void;
  onImport: (contacts: any[]) => void;
}

const ImportWizard: React.FC<ImportWizardProps> = ({ onClose, onImport }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processImport = () => {
    setIsProcessing(true);
    // Mock Import Process
    setTimeout(() => {
      const mockContacts = [
        { name: "John Doe", email: "john@example.com", phone: "+447700900123", source: "Import" },
        { name: "Jane Smith", email: "jane@example.com", phone: "+905338765432", source: "Import" },
        { name: "Robert Brown", email: "rob@example.com", phone: "+15550192834", source: "Import" },
      ];
      setImportedCount(3);
      setIsProcessing(false);
      setStep(3);
      // Pass data back to parent after delay or on close
      setTimeout(() => {
          onImport(mockContacts);
      }, 500);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
       <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative overflow-hidden animate-in zoom-in-95 duration-200">
          
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
             <h3 className="font-bold text-lg">Import Contacts</h3>
             <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={20}/></button>
          </div>

          <div className="p-8">
             {/* Progress Stepper */}
             <div className="flex items-center justify-center mb-8 gap-2">
                <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-teal-500' : 'bg-slate-200'}`}></div>
                <div className={`w-12 h-1 bg-slate-100 ${step >= 2 ? 'bg-teal-500' : ''}`}></div>
                <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-teal-500' : 'bg-slate-200'}`}></div>
                <div className={`w-12 h-1 bg-slate-100 ${step >= 3 ? 'bg-teal-500' : ''}`}></div>
                <div className={`w-3 h-3 rounded-full ${step >= 3 ? 'bg-teal-500' : 'bg-slate-200'}`}></div>
             </div>

             {step === 1 && (
                <div className="text-center space-y-6 animate-in fade-in slide-in-from-right-4">
                   <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 hover:bg-slate-50 hover:border-teal-400 transition-all group cursor-pointer relative">
                      <input type="file" accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileDrop} />
                      <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-white group-hover:text-teal-500 shadow-sm">
                         <UploadCloud size={32} />
                      </div>
                      <p className="text-sm font-bold text-slate-700">
                         {file ? file.name : "Click to upload CSV"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">or drag and drop file here</p>
                   </div>
                   <div className="flex gap-2 items-start p-3 bg-blue-50 rounded-xl text-left">
                      <AlertCircle size={16} className="text-blue-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-blue-700 leading-relaxed">
                         Ensure your CSV has columns for <b>Name</b>, <b>Email</b>, and <b>Phone</b>.
                      </p>
                   </div>
                   <button 
                     disabled={!file}
                     onClick={() => setStep(2)}
                     className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50 hover:bg-slate-800 transition-all"
                   >
                      Continue
                   </button>
                </div>
             )}

             {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <h4 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                         <FileText size={16} /> {file?.name}
                      </h4>
                      <div className="space-y-3">
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Name Column</span>
                            <span className="font-mono font-bold text-green-600">Matched ✓</span>
                         </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Email Column</span>
                            <span className="font-mono font-bold text-green-600">Matched ✓</span>
                         </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Phone Column</span>
                            <span className="font-mono font-bold text-green-600">Matched ✓</span>
                         </div>
                      </div>
                   </div>
                   <button 
                     onClick={processImport}
                     disabled={isProcessing}
                     className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-all flex items-center justify-center gap-2"
                   >
                      {isProcessing ? <Loader2 size={18} className="animate-spin" /> : "Start Import"}
                   </button>
                </div>
             )}

             {step === 3 && (
                <div className="text-center space-y-6 animate-in fade-in slide-in-from-right-4">
                   <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                      <Check size={40} />
                   </div>
                   <div>
                      <h3 className="text-2xl font-bold text-slate-900">Success!</h3>
                      <p className="text-slate-500 mt-2">{importedCount} contacts have been added to your CRM.</p>
                   </div>
                   <button 
                     onClick={onClose}
                     className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all"
                   >
                      Done
                   </button>
                </div>
             )}

          </div>
       </div>
    </div>
  );
};

export default ImportWizard;
