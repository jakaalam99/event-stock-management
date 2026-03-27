'use client';

import { useState, useEffect } from 'react';
import { Shield, Trash2, RefreshCw, AlertTriangle, CheckCircle2, UserPlus, Users, Edit2, Key, X } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  createdAt: string;
}

export default function AdminPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'USER' });

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok) setUsers(data);
    } catch (err) {}
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAction = async (action: 'clear-inventory' | 'reset-history') => {
    const confirm = window.confirm(
      action === 'clear-inventory' 
        ? "Warning: This will PERMANENTLY delete all SKUs and all transaction history. Proceed?" 
        : "Warning: This will delete all transaction history but keep SKUs. Proceed?"
    );

    if (!confirm) return;

    setLoading(action);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/${action}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: data.message, type: 'success' });
      } else {
        setMessage({ text: data.error || 'Failed', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Error', type: 'error' });
    } finally {
      setLoading(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading('createUser');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: 'User created!', type: 'success' });
        setShowAddModal(false);
        setNewUser({ email: '', password: '', name: '', role: 'USER' });
        fetchUsers();
      } else {
        setMessage({ text: data.error, type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Failed to create user', type: 'error' });
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage({ text: 'User deleted!', type: 'success' });
        fetchUsers();
      } else {
        const data = await res.json();
        setMessage({ text: data.error, type: 'error' });
      }
    } catch (err) {}
  };

  const handleUpdateRole = async (user: User, newRole: 'ADMIN' | 'USER') => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setMessage({ text: 'Role updated!', type: 'success' });
        fetchUsers();
      }
    } catch (err) {}
  };

  return (
    <AuthGuard adminOnly>
      <div className="flex flex-col gap-8 max-w-6xl">
        <div className="flex justify-between items-end">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-black text-primary flex items-center gap-3">
              <Shield className="text-accent" size={32} /> Admin Dashboard
            </h2>
            <p className="text-muted-foreground font-medium">System management and user access control.</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <UserPlus size={20} /> Add New User
          </button>
        </div>

        {message && (
          <div className={`p-4 rounded-xl flex items-center gap-3 animate-fade-in border ${
            message.type === 'success' ? 'bg-success/10 text-success border-success/20' : 'bg-error/10 text-error border-error/20'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
            <span className="font-bold">{message.text}</span>
          </div>
        )}

        {/* User Management Table */}
        <div className="card p-0 overflow-hidden border-border/40">
          <div className="p-6 border-b border-border bg-muted/20 flex items-center gap-3 font-bold text-lg text-black uppercase tracking-tight">
            <Users size={22} className="text-black" /> Account Management
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/30 text-[10px] uppercase tracking-widest font-black text-muted-foreground border-b border-border">
                  <th className="p-4 px-6 md:p-6">Full Name</th>
                  <th className="p-4 px-6 md:p-6">Email Address</th>
                  <th className="p-4 px-6 md:p-6">System Role</th>
                  <th className="p-4 px-6 md:p-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-4 px-6 md:p-6 font-bold text-primary">{user.name}</td>
                    <td className="p-4 px-6 md:p-6 text-muted-foreground">{user.email}</td>
                    <td className="p-4 px-6 md:p-6">
                      <select 
                        value={user.role}
                        onChange={(e) => handleUpdateRole(user, e.target.value as any)}
                        className={`text-xs font-black px-4 py-1.5 rounded-full border-0 focus:ring-2 focus:ring-black/20 transition-all ${
                          user.role === 'ADMIN' ? 'bg-black text-white' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <option value="USER">Staff</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                    <td className="p-4 px-6 md:p-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-muted-foreground hover:text-error hover:bg-error/10 rounded-lg transition-all"
                          title="Delete User"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card border-border/40 flex flex-col gap-6 group hover:border-accent/30 transition-all">
            <div className="flex flex-col gap-2">
              <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all">
                <RefreshCw size={24} />
              </div>
              <h3 className="text-xl font-bold text-primary mt-2">Reset Analytics</h3>
              <p className="text-sm text-muted-foreground">Clears all transaction logs. SKU catalog remains intact.</p>
            </div>
            <button disabled={!!loading} onClick={() => handleAction('reset-history')} className="btn btn-outline border-black text-black hover:bg-black hover:text-white mt-auto py-4 font-black uppercase tracking-widest text-[10px]">
              {loading === 'reset-history' ? 'Resetting...' : 'Reset History'}
            </button>
          </div>

          <div className="card border-border/40 flex flex-col gap-6 group hover:border-error/30 transition-all">
            <div className="flex flex-col gap-2">
              <div className="w-12 h-12 rounded-xl bg-error/10 text-error flex items-center justify-center group-hover:bg-error group-hover:text-white transition-all">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-bold text-primary mt-2">Clear Inventory</h3>
              <p className="text-sm text-muted-foreground">Deletes ALL SKUs and transaction records.</p>
            </div>
            <button disabled={!!loading} onClick={() => handleAction('clear-inventory')} className="btn btn-outline border-black text-black hover:bg-black hover:text-white mt-auto py-4 font-black uppercase tracking-widest text-[10px]">
              {loading === 'clear-inventory' ? 'Clearing...' : 'Wipe System'}
            </button>
          </div>
        </div>

        {/* Add User Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
              <div className="p-6 border-b border-border flex justify-between items-center bg-muted/10">
                <h3 className="text-xl font-black text-primary flex items-center gap-2">
                  <UserPlus size={24} className="text-accent" /> Create Account
                </h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-muted rounded-full transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleCreateUser} className="p-6 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Full Name</label>
                  <input required className="input h-12" placeholder="e.g. John Doe" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Email Address</label>
                  <input required type="email" className="input h-12" placeholder="name@company.com" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Initial Password</label>
                  <input required type="password" className="input h-12" placeholder="••••••••" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Account Permission</label>
                  <select className="input h-12" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                    <option value="USER">Staff (Inventory Actions Only)</option>
                    <option value="ADMIN">Admin (Full Control)</option>
                  </select>
                </div>
                <button disabled={loading === 'createUser'} className="btn btn-primary py-4 rounded-xl shadow-lg mt-2">
                  {loading === 'createUser' ? 'Creating...' : 'Register Account'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
