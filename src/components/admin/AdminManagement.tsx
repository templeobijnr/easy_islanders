import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, setDoc, Timestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { db, auth } from '../../services/firebaseConfig';
import { User, Mail, Shield, Trash2, Plus, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface AdminUser {
  id: string;
  displayName: string;
  email: string;
  role: string;
  createdAt: any;
}

const AdminManagement: React.FC = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'admin'));
      const snap = await getDocs(q);
      const adminList = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as AdminUser[];
      setAdmins(adminList);
    } catch (err) {
      console.error('Error fetching admins:', err);
      setMessage({ type: 'error', text: 'Failed to fetch admin users' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setMessage(null);

    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, newAdminEmail, newAdminPassword);
      await updateProfile(userCredential.user, { displayName: newAdminName });

      // Create Firestore user document with admin role
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        displayName: newAdminName,
        email: newAdminEmail,
        role: 'admin',
        type: 'admin',
        createdAt: Timestamp.now(),
        onboarded: true
      });

      setMessage({ type: 'success', text: `Admin "${newAdminName}" created successfully!` });
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPassword('');
      setShowForm(false);
      fetchAdmins();
    } catch (err: unknown) {
      console.error('Error creating admin:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to create admin' });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAdmin = async (adminId: string, adminEmail: string) => {
    if (!confirm(`Are you sure you want to remove admin privileges from ${adminEmail}?`)) return;

    try {
      // Update user role to 'personal' instead of deleting
      await setDoc(doc(db, 'users', adminId), { role: 'personal' }, { merge: true });
      setMessage({ type: 'success', text: `Admin privileges revoked from ${adminEmail}` });
      fetchAdmins();
    } catch (err: unknown) {
      console.error('Error removing admin:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to remove admin' });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield size={24} className="text-cyan-400" />
            Admin Management
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Create and manage admin accounts for the Control Tower.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 transition-colors"
        >
          <Plus size={18} />
          New Admin
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 ${message.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
            : 'bg-red-500/10 text-red-300 border-red-500/30'
          }`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {/* Create Admin Form */}
      {showForm && (
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 animate-in slide-in-from-top">
          <h3 className="text-white font-bold mb-4">Create New Admin</h3>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-slate-500" size={16} />
                  <input
                    type="text"
                    required
                    value={newAdminName}
                    onChange={e => setNewAdminName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                    placeholder="John Doe"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-slate-500" size={16} />
                  <input
                    type="email"
                    required
                    value={newAdminEmail}
                    onChange={e => setNewAdminEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                    placeholder="admin@easyislanders.com"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newAdminPassword}
                  onChange={e => setNewAdminPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-2.5 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Create Admin
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Admin List */}
      <div className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="text-white font-bold">Current Admins</h3>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 size={32} className="animate-spin text-cyan-400" />
          </div>
        ) : admins.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Shield size={40} className="mx-auto mb-4 opacity-50" />
            <p>No admin accounts found.</p>
            <p className="text-sm mt-2">Create the first admin account above.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {admins.map(admin => (
              <div key={admin.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold">
                    {admin.displayName?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <div>
                    <p className="text-white font-medium">{admin.displayName || 'Unnamed Admin'}</p>
                    <p className="text-sm text-slate-400">{admin.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 text-xs font-bold rounded-full">
                    ADMIN
                  </span>
                  <button
                    onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Revoke admin access"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seed First Admin Helper */}
      <div className="bg-slate-900/60 border border-amber-500/20 rounded-2xl p-6">
        <h3 className="text-amber-400 font-bold mb-2 flex items-center gap-2">
          <AlertCircle size={18} />
          First-Time Setup
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          If you need to create the very first admin account (temple@easyislanders.com),
          use the browser console command below while logged in as any user:
        </p>
        <code className="block bg-slate-950 text-cyan-400 p-4 rounded-xl text-sm font-mono overflow-x-auto">
          window.__seedFirstAdmin('temple@easyislanders.com', 'YourSecurePassword123')
        </code>
      </div>
    </div>
  );
};

export default AdminManagement;
