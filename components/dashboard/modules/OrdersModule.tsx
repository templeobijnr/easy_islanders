
import React, { useState } from 'react';
import { Package, Truck, CheckCircle, Clock, Search, MoreHorizontal, MapPin, User, Phone, Filter, AlertCircle, Utensils, ChefHat, Bell } from 'lucide-react';
import ModuleHeader from '../shared/ModuleHeader';

// Mock Orders Data (Mixed with restaurant orders)
const MOCK_ORDERS = [
  { id: 'ORD-7829', customer: 'Sarah Jenkins', date: 'Today, 10:23 AM', total: 145.00, status: 'Pending', items: 'Vintage Record Player', location: 'Kyrenia', type: 'retail' },
  { id: 'ORD-7828', customer: 'Mehmet Yilmaz', date: 'Yesterday', total: 45.50, status: 'Processing', items: 'Leather Wallet, Belt', location: 'Nicosia', type: 'retail' },
  { id: 'TBL-12', customer: 'Table 12', date: '12 mins ago', total: 62.00, status: 'Cooking', items: '2x Ribeye Steak, 1x Caesar Salad', location: 'Dine-in', type: 'restaurant', notes: 'Medium Rare' },
  { id: 'TBL-05', customer: 'Table 5', date: '2 mins ago', total: 24.00, status: 'New', items: '1x Margherita Pizza, 2x Coke', location: 'Dine-in', type: 'restaurant' },
  { id: 'DEL-99', customer: 'Alex Chen', date: '25 mins ago', total: 45.00, status: 'Ready', items: 'Sushi Platter (Large)', location: 'Alsancak', type: 'restaurant', notes: 'No Wasabi' },
];

const OrdersModule: React.FC = () => {
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [activeTab, setActiveTab] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kds'>('list');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': case 'New': return 'bg-amber-100 text-amber-700';
      case 'Processing': case 'Cooking': return 'bg-blue-100 text-blue-700';
      case 'Shipped': case 'Ready': return 'bg-purple-100 text-purple-700';
      case 'Delivered': case 'Served': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const handleStatusUpdate = (id: string, newStatus: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
  };

  const filteredOrders = activeTab === 'All' ? orders : orders.filter(o => o.status === activeTab);

  // KITCHEN DISPLAY SYSTEM VIEW
  if (viewMode === 'kds') {
      const kitchenOrders = orders.filter(o => o.type === 'restaurant' && o.status !== 'Served');
      
      return (
          <div className="space-y-6 animate-in fade-in h-screen flex flex-col pb-6">
              <div className="flex justify-between items-center">
                  <div>
                      <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><ChefHat size={24} className="text-orange-600"/> Kitchen Display System</h2>
                      <p className="text-slate-500">Real-time order tracking</p>
                  </div>
                  <button onClick={() => setViewMode('list')} className="bg-white border border-slate-200 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-50">Switch to List View</button>
              </div>

              <div className="flex-1 overflow-x-auto">
                  <div className="flex gap-4 h-full min-w-[1000px]">
                      {['New', 'Cooking', 'Ready'].map(status => {
                          const colOrders = kitchenOrders.filter(o => o.status === status);
                          return (
                              <div key={status} className="flex-1 bg-slate-100/50 rounded-2xl p-4 flex flex-col border border-slate-200">
                                  <div className="flex justify-between items-center mb-4 px-2">
                                      <h3 className="font-bold text-slate-700 uppercase">{status}</h3>
                                      <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold shadow-sm">{colOrders.length}</span>
                                  </div>
                                  <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                                      {colOrders.map(order => (
                                          <div key={order.id} className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${status === 'New' ? 'border-l-amber-500 animate-pulse-slow' : status === 'Cooking' ? 'border-l-blue-500' : 'border-l-green-500'}`}>
                                              <div className="flex justify-between items-start mb-2">
                                                  <span className="font-mono font-bold text-lg">{order.id}</span>
                                                  <span className="text-xs text-slate-500 flex items-center gap-1"><Clock size={12}/> {order.date}</span>
                                              </div>
                                              <div className="text-sm font-medium text-slate-800 mb-2">{order.items}</div>
                                              {order.notes && (
                                                  <div className="text-xs bg-red-50 text-red-600 p-2 rounded mb-3 border border-red-100 font-bold flex gap-1">
                                                      <AlertCircle size={12} className="mt-0.5"/> {order.notes}
                                                  </div>
                                              )}
                                              <button 
                                                onClick={() => handleStatusUpdate(order.id, status === 'New' ? 'Cooking' : status === 'Cooking' ? 'Ready' : 'Served')}
                                                className={`w-full py-2 rounded-lg font-bold text-sm text-white transition-all ${status === 'New' ? 'bg-blue-600 hover:bg-blue-700' : status === 'Cooking' ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-800 hover:bg-slate-900'}`}
                                              >
                                                  {status === 'New' ? 'Start Cooking' : status === 'Cooking' ? 'Mark Ready' : 'Complete'}
                                              </button>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )
                      })}
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      <ModuleHeader 
        title="Order Management" 
        description="Track and fulfill customer orders. Manage shipping labels and status updates."
        action={
            <button onClick={() => setViewMode('kds')} className="bg-orange-600 text-white px-6 py-2.5 rounded-full font-bold flex items-center gap-2 shadow-lg hover:bg-orange-700 transition-all">
                <Utensils size={18} /> Kitchen View
            </button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Clock size={24}/></div>
            <div>
               <div className="text-2xl font-bold text-slate-900">{orders.filter(o => o.status === 'Pending' || o.status === 'New').length}</div>
               <div className="text-xs font-bold text-slate-500 uppercase">Pending</div>
            </div>
         </div>
         <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Package size={24}/></div>
            <div>
               <div className="text-2xl font-bold text-slate-900">{orders.filter(o => o.status === 'Processing' || o.status === 'Cooking').length}</div>
               <div className="text-xs font-bold text-slate-500 uppercase">Active</div>
            </div>
         </div>
         <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Truck size={24}/></div>
            <div>
               <div className="text-2xl font-bold text-slate-900">{orders.filter(o => o.status === 'Shipped' || o.status === 'Ready').length}</div>
               <div className="text-xs font-bold text-slate-500 uppercase">Ready/Transit</div>
            </div>
         </div>
         <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-xl"><CheckCircle size={24}/></div>
            <div>
               <div className="text-2xl font-bold text-slate-900">{orders.filter(o => o.status === 'Delivered' || o.status === 'Served').length}</div>
               <div className="text-xs font-bold text-slate-500 uppercase">Completed</div>
            </div>
         </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[500px]">
         
         {/* Order List */}
         <div className="flex-1 flex flex-col">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
               <div className="flex gap-2 overflow-x-auto scrollbar-hide w-full md:w-auto">
                  {['All', 'Pending', 'Processing', 'Ready'].map(tab => (
                     <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeTab === tab ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                     >
                        {tab}
                     </button>
                  ))}
               </div>
               <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <input 
                     type="text" 
                     placeholder="Search orders..." 
                     className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />
               </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto">
               <table className="w-full text-left">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-100 sticky top-0">
                     <tr>
                        <th className="p-4">Order ID</th>
                        <th className="p-4">Customer</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Total</th>
                        <th className="p-4 text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {filteredOrders.map(order => (
                        <tr 
                           key={order.id} 
                           onClick={() => setSelectedOrder(order.id)}
                           className={`hover:bg-slate-50 cursor-pointer transition-colors ${selectedOrder === order.id ? 'bg-blue-50/50' : ''}`}
                        >
                           <td className="p-4 font-bold text-slate-900">{order.id}</td>
                           <td className="p-4">
                              <div className="font-medium text-slate-900">{order.customer}</div>
                              <div className="text-xs text-slate-500">{order.items}</div>
                           </td>
                           <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                                 {order.status}
                              </span>
                           </td>
                           <td className="p-4 font-mono font-medium">£{order.total.toFixed(2)}</td>
                           <td className="p-4 text-right">
                              <button className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                 <MoreHorizontal size={18}/>
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>

         {/* Order Detail Sidebar (Desktop) */}
         {selectedOrder && (
            <div className="w-full md:w-96 border-l border-slate-200 bg-slate-50 p-6 overflow-y-auto animate-in slide-in-from-right-4">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg text-slate-900">Order Details</h3>
                  <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">Close</button>
               </div>

               {orders.filter(o => o.id === selectedOrder).map(order => (
                  <div key={order.id}>
                     <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
                        <div className="flex justify-between mb-4">
                           <span className="font-mono font-bold text-slate-900 text-lg">{order.id}</span>
                           <span className="text-xs text-slate-500">{order.date}</span>
                        </div>
                        <div className="space-y-3">
                           <div className="flex items-start gap-3">
                              <div className="p-2 bg-slate-100 rounded-full"><User size={16} className="text-slate-500"/></div>
                              <div>
                                 <div className="text-sm font-bold text-slate-900">{order.customer}</div>
                                 <div className="text-xs text-slate-500">Verified Buyer</div>
                              </div>
                           </div>
                           <div className="flex items-start gap-3">
                              <div className="p-2 bg-slate-100 rounded-full"><MapPin size={16} className="text-slate-500"/></div>
                              <div>
                                 <div className="text-sm font-bold text-slate-900">Location / Table</div>
                                 <div className="text-xs text-slate-500">{order.location}</div>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Items</h4>
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-sm text-slate-900">1x {order.items}</span>
                           <span className="text-sm font-bold">£{order.total.toFixed(2)}</span>
                        </div>
                        {order.notes && (
                            <div className="bg-red-50 text-red-700 text-xs p-2 rounded mb-2 border border-red-100 font-medium">
                                Note: {order.notes}
                            </div>
                        )}
                        <div className="border-t border-slate-100 my-2 pt-2 flex justify-between items-center">
                           <span className="text-sm font-bold text-slate-900">Total</span>
                           <span className="text-lg font-bold text-teal-600">£{order.total.toFixed(2)}</span>
                        </div>
                     </div>

                     <div className="space-y-3">
                        {(order.status === 'Pending' || order.status === 'New') && (
                            <button 
                                onClick={() => handleStatusUpdate(order.id, order.type === 'restaurant' ? 'Cooking' : 'Processing')}
                                className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg"
                            >
                                {order.type === 'restaurant' ? 'Start Cooking' : 'Accept & Process'}
                            </button>
                        )}
                        {(order.status === 'Processing' || order.status === 'Cooking') && (
                            <button 
                                onClick={() => handleStatusUpdate(order.id, order.type === 'restaurant' ? 'Ready' : 'Shipped')}
                                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg"
                            >
                                Mark as {order.type === 'restaurant' ? 'Ready' : 'Shipped'}
                            </button>
                        )}
                        {order.type === 'restaurant' && (
                            <button onClick={() => setViewMode('kds')} className="w-full py-3 bg-orange-50 text-orange-700 border border-orange-200 font-bold rounded-xl hover:bg-orange-100">
                               Open Kitchen View
                            </button>
                        )}
                        <div className="text-center">
                           <button className="text-xs text-red-500 font-bold hover:underline">Cancel Order</button>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         )}
      </div>
    </div>
  );
};

export default OrdersModule;
