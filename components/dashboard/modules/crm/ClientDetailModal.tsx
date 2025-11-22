
import React, { useState } from 'react';
import { X, Phone, Mail, Calendar, Tag, Edit3, Clock, CheckCircle, MessageSquare, Plus, Save } from 'lucide-react';
import { Client, ClientActivity, PipelineStage } from '../../../types';

interface ClientDetailModalProps {
  client: Client;
  onClose: () => void;
  onSave: (updatedClient: Client) => void;
}

const PIPELINE_STAGES: PipelineStage[] = ['New Lead', 'Contacted', 'Viewing Scheduled', 'Negotiation', 'Contract Sent', 'Closed', 'Lost'];

const ClientDetailModal: React.FC<ClientDetailModalProps> = ({ client, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'notes'>('overview');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Client>(client);
  const [newNote, setNewNote] = useState('');

  const handleSave = () => {
    onSave(formData);
    setEditMode(false);
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const noteActivity: ClientActivity = {
      id: Date.now().toString(),
      type: 'note',
      content: newNote,
      timestamp: new Date().toISOString(),
      author: 'You'
    };
    const updatedClient = {
      ...formData,
      activityHistory: [noteActivity, ...(formData.activityHistory || [])]
    };
    setFormData(updatedClient);
    onSave(updatedClient);
    setNewNote('');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl z-10 overflow-hidden flex flex-col h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div className="flex items-center gap-4">
               <div className="w-14 h-14 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xl font-bold border-4 border-white shadow-sm">
                  {formData.avatar ? <img src={formData.avatar} className="w-full h-full rounded-full object-cover"/> : formData.name.charAt(0)}
               </div>
               <div>
                  <h2 className="text-2xl font-bold text-slate-900">{formData.name}</h2>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                     <span className="px-2 py-0.5 bg-slate-200 rounded text-xs font-bold uppercase text-slate-600">{formData.source}</span>
                     <span>•</span>
                     <span>Added {new Date(formData.createdAt || Date.now()).toLocaleDateString()}</span>
                  </div>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <button onClick={() => setEditMode(!editMode)} className={`p-2 rounded-full transition-colors ${editMode ? 'bg-slate-200 text-slate-800' : 'bg-white hover:bg-slate-100 text-slate-500'}`}>
                  <Edit3 size={20} />
               </button>
               <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                  <X size={20} />
               </button>
            </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
           {/* Sidebar */}
           <div className="w-1/3 border-r border-slate-100 p-6 bg-white overflow-y-auto">
              <div className="space-y-6">
                 {/* Status */}
                 <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Pipeline Stage</label>
                    {editMode ? (
                       <select 
                         className="w-full p-2 border border-slate-200 rounded-lg font-medium text-sm"
                         value={formData.status}
                         onChange={(e) => setFormData({...formData, status: e.target.value as PipelineStage})}
                       >
                          {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                    ) : (
                       <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          formData.status === 'Closed' ? 'bg-green-100 text-green-700' : 
                          formData.status === 'New Lead' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                       }`}>
                          {formData.status}
                       </span>
                    )}
                 </div>

                 {/* Contact Info */}
                 <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                       <div className="p-2 bg-white rounded-lg text-slate-400"><Mail size={16}/></div>
                       <div className="flex-1 overflow-hidden">
                          <div className="text-xs font-bold text-slate-400 uppercase">Email</div>
                          <div className="text-sm font-medium text-slate-900 truncate">{formData.email}</div>
                       </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                       <div className="p-2 bg-white rounded-lg text-slate-400"><Phone size={16}/></div>
                       <div className="flex-1 overflow-hidden">
                          <div className="text-xs font-bold text-slate-400 uppercase">Phone</div>
                          <div className="text-sm font-medium text-slate-900">{formData.phone}</div>
                       </div>
                    </div>
                 </div>

                 {/* Budget & Prefs */}
                 <div className="pt-4 border-t border-slate-100 space-y-4">
                    <div>
                       <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Budget</label>
                       {editMode ? (
                          <input 
                             type="number" 
                             className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                             value={formData.budget || ''}
                             onChange={(e) => setFormData({...formData, budget: parseInt(e.target.value)})}
                             placeholder="£0"
                          />
                       ) : (
                          <div className="text-lg font-bold text-slate-900">£{(formData.budget || 0).toLocaleString()}</div>
                       )}
                    </div>
                    <div>
                       <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Preferences</label>
                       {editMode ? (
                          <textarea 
                             className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                             value={formData.preferences || ''}
                             onChange={(e) => setFormData({...formData, preferences: e.target.value})}
                             rows={3}
                          />
                       ) : (
                          <p className="text-sm text-slate-600 italic">"{formData.preferences || 'No preferences recorded.'}"</p>
                       )}
                    </div>
                 </div>

                 {editMode && (
                    <button onClick={handleSave} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all">
                       <Save size={16} /> Save Changes
                    </button>
                 )}
              </div>
           </div>

           {/* Main Content */}
           <div className="flex-1 bg-slate-50 flex flex-col">
              <div className="flex border-b border-slate-200 bg-white px-6">
                 {['overview', 'activity', 'notes'].map((tab) => (
                    <button
                       key={tab}
                       onClick={() => setActiveTab(tab as any)}
                       className={`px-6 py-4 text-sm font-bold capitalize border-b-2 transition-all ${
                          activeTab === tab ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                       }`}
                    >
                       {tab}
                    </button>
                 ))}
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                 {activeTab === 'overview' && (
                    <div className="space-y-6">
                       {/* Pipeline Visualization */}
                       <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                          <h3 className="font-bold text-slate-900 mb-4">Opportunity Pipeline</h3>
                          <div className="flex justify-between items-center relative">
                             <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -z-10"></div>
                             {['New Lead', 'Contacted', 'Negotiation', 'Closed'].map((step, i) => {
                                const currentIndex = PIPELINE_STAGES.indexOf(formData.status);
                                const stepIndex = PIPELINE_STAGES.indexOf(step as PipelineStage);
                                const isPassed = currentIndex >= stepIndex;
                                
                                return (
                                   <div key={step} className="flex flex-col items-center gap-2 bg-white px-2">
                                      <div className={`w-4 h-4 rounded-full border-2 ${isPassed ? 'bg-teal-500 border-teal-500' : 'bg-white border-slate-300'}`}></div>
                                      <span className={`text-[10px] font-bold uppercase ${isPassed ? 'text-teal-600' : 'text-slate-400'}`}>{step}</span>
                                   </div>
                                )
                             })}
                          </div>
                       </div>
                       
                       {/* Tags */}
                       <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Tag size={18}/> Tags</h3>
                          <div className="flex flex-wrap gap-2">
                             {formData.tags.map(t => (
                                <span key={t} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">{t}</span>
                             ))}
                             <button className="px-3 py-1 border border-dashed border-slate-300 text-slate-400 rounded-full text-xs font-bold hover:border-teal-500 hover:text-teal-600">+ Add</button>
                          </div>
                       </div>
                    </div>
                 )}

                 {(activeTab === 'activity' || activeTab === 'notes') && (
                    <div className="space-y-6">
                       {/* Add Note Input */}
                       <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                          <textarea 
                             value={newNote}
                             onChange={(e) => setNewNote(e.target.value)}
                             placeholder="Add a note or log a call..."
                             className="w-full p-0 border-none outline-none text-sm resize-none min-h-[60px]"
                          />
                          <div className="flex justify-between items-center pt-2 border-t border-slate-100 mt-2">
                             <div className="flex gap-2">
                                <button className="p-1.5 hover:bg-slate-100 rounded text-slate-400" title="Log Call"><Phone size={16}/></button>
                                <button className="p-1.5 hover:bg-slate-100 rounded text-slate-400" title="Log Meeting"><Calendar size={16}/></button>
                             </div>
                             <button onClick={handleAddNote} disabled={!newNote.trim()} className="px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50">
                                Post Note
                             </button>
                          </div>
                       </div>

                       {/* Timeline */}
                       <div className="space-y-4 relative pl-4 border-l-2 border-slate-200 ml-2">
                          {formData.activityHistory?.map((act) => (
                             <div key={act.id} className="relative pl-6">
                                <div className={`absolute -left-[25px] top-0 w-8 h-8 rounded-full border-4 border-slate-50 flex items-center justify-center ${
                                   act.type === 'system' ? 'bg-slate-200 text-slate-500' : 
                                   act.type === 'note' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'
                                }`}>
                                   {act.type === 'note' ? <MessageSquare size={14}/> : act.type === 'system' ? <Clock size={14}/> : <CheckCircle size={14}/>}
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                   <div className="flex justify-between items-start mb-1">
                                      <span className="text-xs font-bold text-slate-900">{act.author}</span>
                                      <span className="text-[10px] text-slate-400">{new Date(act.timestamp).toLocaleString()}</span>
                                   </div>
                                   <p className="text-sm text-slate-600">{act.content}</p>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDetailModal;
