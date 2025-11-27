
import React, { useState, useEffect } from 'react';
import { 
  Users, Search, MoreHorizontal, Plus, LayoutList, 
  LayoutGrid, UploadCloud, RefreshCw, Filter, DollarSign, 
  TrendingUp, PieChart, Phone, Mail, Calendar
} from 'lucide-react';
import { Client, PipelineStage } from '../../../types';
import { StorageService } from '../../services/storageService';
import ModuleHeader from '../shared/ModuleHeader';
import ClientDetailModal from './crm/ClientDetailModal';
import ImportWizard from './crm/ImportWizard';

const PIPELINE_STAGES: PipelineStage[] = ['New Lead', 'Contacted', 'Viewing Scheduled', 'Negotiation', 'Closed'];
const STAGE_COLORS: Record<string, string> = {
  'New Lead': 'bg-blue-100 text-blue-700 border-blue-200',
  'Contacted': 'bg-purple-100 text-purple-700 border-purple-200',
  'Viewing Scheduled': 'bg-orange-100 text-orange-700 border-orange-200',
  'Negotiation': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Closed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Lost': 'bg-slate-100 text-slate-600 border-slate-200'
};

const CRMModule: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    const data = await StorageService.getClients();
    // Sort by most recent
    setClients(data.sort((a, b) => new Date(b.lastContact).getTime() - new Date(a.lastContact).getTime()));
  };

  const handleSyncLeads = async () => {
    setIsSyncing(true);
    setSyncMessage('Scanning bookings...');
    
    // Simulate fetching data from other modules
    const [bookings, requests] = await Promise.all([
        StorageService.getUserBookings(),
        StorageService.getConsumerRequests()
    ]);

    let newLeadsCount = 0;
    const currentEmails = new Set(clients.map(c => c.email));
    const newClients: Client[] = [];

    // Convert Bookings to Clients
    bookings.forEach(b => {
        // Basic check - in real app would be more robust parsing
        const email = b.customerContact?.includes('@') ? b.customerContact : `${b.customerName.replace(' ', '.').toLowerCase()}@example.com`; 
        
        if (!currentEmails.has(email)) {
            newClients.push({
                id: `cli-${Date.now()}-${Math.random()}`,
                name: b.customerName,
                email: email,
                phone: b.customerContact?.includes('@') ? '' : b.customerContact || '',
                status: 'New Lead',
                source: 'Website',
                lastContact: new Date().toISOString(),
                assignedAgent: 'System',
                tags: ['Booking Request', b.domain],
                createdAt: new Date().toISOString(),
                preferences: `Interested in ${b.itemTitle}`,
                activityHistory: [{
                    id: `act-${Date.now()}`,
                    type: 'system',
                    content: `Created from booking request: ${b.itemTitle}`,
                    timestamp: new Date().toISOString(),
                    author: 'System'
                }]
            });
            currentEmails.add(email); // Prevent dupes in same batch
            newLeadsCount++;
        }
    });

    // Convert Requests to Clients
    requests.forEach(r => {
        const mockEmail = `user-${r.userId}@example.com`;
        if (!currentEmails.has(mockEmail)) {
            newClients.push({
                id: `cli-req-${r.id}`,
                name: 'Anonymous Request',
                email: mockEmail,
                phone: '',
                status: 'New Lead',
                source: 'Website',
                lastContact: new Date().toISOString(),
                assignedAgent: 'System',
                tags: ['Consumer Request', r.domain],
                budget: r.budget,
                createdAt: new Date().toISOString(),
                preferences: r.content,
                activityHistory: [{
                    id: `act-${Date.now()}`,
                    type: 'system',
                    content: `Submitted request: "${r.content}"`,
                    timestamp: new Date().toISOString(),
                    author: 'System'
                }]
            });
            newLeadsCount++;
        }
    });

    if (newClients.length > 0) {
        const updatedList = [...newClients, ...clients];
        setClients(updatedList);
        // Ideally save all, but for mock we just save one by one or assume session storage handles it
        // For robustness in this demo, we just update local state predominantly
        newClients.forEach(c => StorageService.saveClient(c));
    }

    setTimeout(() => {
        setIsSyncing(false);
        setSyncMessage(newLeadsCount > 0 ? `Found ${newLeadsCount} new leads!` : 'No new leads found.');
        setTimeout(() => setSyncMessage(''), 3000);
    }, 1000);
  };

  const handleSaveClient = async (updated: Client) => {
      const newList = clients.map(c => c.id === updated.id ? updated : c);
      setClients(newList);
      await StorageService.saveClient(updated);
      // If modal is open, close it (handled by parent mostly, but here for safety)
      // setSelectedClient(null); 
  };

  const handleImport = async (importedData: any[]) => {
      const newClients: Client[] = importedData.map((d, i) => ({
          id: `imp-${Date.now()}-${i}`,
          name: d.name,
          email: d.email,
          phone: d.phone,
          status: 'New Lead',
          source: 'Import',
          lastContact: new Date().toISOString(),
          assignedAgent: 'Unassigned',
          tags: ['Imported'],
          createdAt: new Date().toISOString(),
          activityHistory: []
      }));
      
      const updated = [...newClients, ...clients];
      setClients(updated);
      newClients.forEach(c => StorageService.saveClient(c));
      setIsImportOpen(false);
  };

  const filteredClients = clients.filter(c => 
     c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- Stats Calculation ---
  const totalLeads = clients.length;
  const pipelineValue = clients.reduce((acc, c) => acc + (c.budget || 0), 0);
  const conversionRate = Math.round((clients.filter(c => c.status === 'Closed').length / (totalLeads || 1)) * 100);

  return (
    <div className="space-y-6 animate-in fade-in h-full flex flex-col pb-10">
       <ModuleHeader 
          title="Client Management" 
          description="Track your leads from initial contact to closed deal. Manage contact details and pipeline status."
          action={
             <div className="flex gap-2">
                <button 
                  onClick={handleSyncLeads}
                  disabled={isSyncing}
                  className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all"
                >
                   {isSyncing ? <RefreshCw size={16} className="animate-spin"/> : <RefreshCw size={16}/>} 
                   {syncMessage || "Sync Leads"}
                </button>
                <button 
                  onClick={() => setIsImportOpen(true)}
                  className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all"
                >
                   <UploadCloud size={16} /> Import
                </button>
                <button className="bg-slate-900 text-white px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-slate-800 shadow-lg transition-all">
                   <Plus size={16} /> Add Client
                </button>
             </div>
          }
       />

       {/* Stats Row */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
               <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Users size={24}/></div>
               <div>
                  <div className="text-2xl font-bold text-slate-900">{totalLeads}</div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Total Clients</div>
               </div>
           </div>
           <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
               <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><DollarSign size={24}/></div>
               <div>
                  <div className="text-2xl font-bold text-slate-900">£{pipelineValue.toLocaleString()}</div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Pipeline Value</div>
               </div>
           </div>
           <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
               <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><PieChart size={24}/></div>
               <div>
                  <div className="text-2xl font-bold text-slate-900">{conversionRate}%</div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Conversion Rate</div>
               </div>
           </div>
       </div>

       {/* Toolbar */}
       <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
             <Search size={18} className="absolute left-3 top-3 text-slate-400" />
             <input 
               type="text" 
               placeholder="Search clients by name, email..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all"
             />
          </div>
          
          <div className="flex bg-white p-1 rounded-xl border border-slate-200">
             <button 
               onClick={() => setViewMode('list')}
               className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
             >
                <LayoutList size={18} />
             </button>
             <button 
               onClick={() => setViewMode('kanban')}
               className={`p-2 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
             >
                <LayoutGrid size={18} />
             </button>
          </div>
       </div>

       {/* Views */}
       <div className="flex-1 overflow-hidden bg-slate-50/50 rounded-2xl border border-slate-200 relative">
          
          {viewMode === 'list' && (
             <div className="overflow-y-auto h-full">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-white sticky top-0 z-10 shadow-sm">
                      <tr>
                         <th className="p-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-100">Client Name</th>
                         <th className="p-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-100">Contact Info</th>
                         <th className="p-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-100">Stage / Status</th>
                         <th className="p-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-100">Source</th>
                         <th className="p-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-100">Last Contact</th>
                         <th className="p-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-100 text-right">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredClients.map(client => (
                         <tr key={client.id} onClick={() => setSelectedClient(client)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                            <td className="p-4">
                               <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm">
                                     {client.avatar ? <img src={client.avatar} className="w-full h-full rounded-full object-cover"/> : client.name.charAt(0)}
                                  </div>
                                  <div>
                                     <div className="font-bold text-slate-900">{client.name}</div>
                                     <div className="flex gap-1 mt-1">
                                        {client.tags.slice(0, 2).map(t => (
                                           <span key={t} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">{t}</span>
                                        ))}
                                     </div>
                                  </div>
                               </div>
                            </td>
                            <td className="p-4">
                               <div className="flex flex-col gap-1">
                                  <div className="text-sm text-slate-600 flex items-center gap-1"><Mail size={12} className="text-slate-400"/> {client.email}</div>
                                  <div className="text-sm text-slate-600 flex items-center gap-1"><Phone size={12} className="text-slate-400"/> {client.phone}</div>
                               </div>
                            </td>
                            <td className="p-4">
                               <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${STAGE_COLORS[client.status] || 'bg-slate-100'}`}>
                                  {client.status}
                               </span>
                            </td>
                            <td className="p-4 text-sm text-slate-500">{client.source}</td>
                            <td className="p-4 text-sm text-slate-500 font-mono">{new Date(client.lastContact).toLocaleDateString()}</td>
                            <td className="p-4 text-right">
                               <button className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"><MoreHorizontal size={18}/></button>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          )}

          {viewMode === 'kanban' && (
             <div className="h-full overflow-x-auto flex gap-4 p-6">
                {PIPELINE_STAGES.slice(0, 5).map(stage => {
                   const stageClients = filteredClients.filter(c => c.status === stage);
                   return (
                      <div key={stage} className="flex-shrink-0 w-72 flex flex-col">
                         <div className="flex justify-between items-center mb-4 px-2">
                            <h4 className="font-bold text-sm text-slate-900 uppercase">{stage}</h4>
                            <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{stageClients.length}</span>
                         </div>
                         <div className="flex-1 bg-slate-100/50 rounded-2xl p-2 space-y-3 overflow-y-auto border border-slate-100">
                            {stageClients.map(client => (
                               <div 
                                 key={client.id} 
                                 onClick={() => setSelectedClient(client)}
                                 className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
                               >
                                  <div className="flex justify-between items-start mb-2">
                                     <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><Calendar size={10}/> {new Date(client.lastContact).toLocaleDateString()}</span>
                                     {client.budget && <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">£{client.budget.toLocaleString()}</span>}
                                  </div>
                                  <h5 className="font-bold text-slate-900 mb-1">{client.name}</h5>
                                  <p className="text-xs text-slate-500 truncate">{client.preferences || "No specific preferences"}</p>
                                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50">
                                     <div className="w-6 h-6 rounded-full bg-slate-100 text-[10px] flex items-center justify-center font-bold text-slate-500">
                                        {client.name.charAt(0)}
                                     </div>
                                     <div className="flex-1"></div>
                                     <div className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">{client.source}</div>
                                  </div>
                               </div>
                            ))}
                            {stageClients.length === 0 && (
                               <div className="text-center py-10 text-slate-300 text-xs font-medium italic">No clients in this stage</div>
                            )}
                         </div>
                      </div>
                   )
                })}
             </div>
          )}

       </div>
       
       {selectedClient && (
          <ClientDetailModal 
             client={selectedClient} 
             onClose={() => setSelectedClient(null)} 
             onSave={handleSaveClient}
          />
       )}

       {isImportOpen && (
          <ImportWizard 
             onClose={() => setIsImportOpen(false)} 
             onImport={handleImport} 
          />
       )}
    </div>
  );
};

export default CRMModule;
