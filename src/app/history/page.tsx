'use client';

import { useState, useEffect } from 'react';
import { Calendar, User, ChevronDown, ChevronRight, Hash, RotateCcw } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';

interface Transaction {
  id: string;
  groupId: string;
  type: 'SHOP_OUT' | 'REVERSAL';
  status: 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  items: {
    id: string;
    quantity: number;
    sku: {
      name: string;
      code: string;
    };
  }[];
}

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [reversingId, setReversingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/transactions');
      const data = await res.json();
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    setRole(localStorage.getItem('user_role'));
  }, []);

  const toggleGroup = (groupId: string) => {
    const next = new Set(expandedGroups);
    if (next.has(groupId)) next.delete(groupId);
    else next.add(groupId);
    setExpandedGroups(next);
  };

  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleReverse = async (groupId: string) => {
    // Stage 1: Ask for confirmation using UI state instead of native confirm()
    if (confirmId !== groupId) {
      setConfirmId(groupId);
      setTimeout(() => setConfirmId(null), 3000); // Reset after 3 seconds
      return;
    }

    // Stage 2: Actually perform the reversal
    setReversingId(groupId);
    setConfirmId(null);
    setMessage(null);
    
    const userId = localStorage.getItem('user_id') || 'user_admin';
    const userName = localStorage.getItem('user_name') || 'Administrator';

    try {
      const res = await fetch(`/api/transactions/${groupId}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userName }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: 'Batch reversed successfully!', type: 'success' });
        fetchHistory();
      } else {
        setMessage({ text: data.error || 'Reversal failed', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'A network error occurred', type: 'error' });
    } finally {
      setReversingId(null);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // Group transactions by groupId
  const grouped = transactions.reduce((acc, current) => {
    if (!acc[current.groupId]) acc[current.groupId] = [];
    acc[current.groupId].push(current);
    return acc;
  }, {} as Record<string, Transaction[]>);

  return (
    <AuthGuard>
      <div className="flex flex-col gap-6 md:gap-8 min-h-[100vh]">
        <header className="flex flex-col gap-1 items-stretch">
          <h2 className="text-3xl md:text-5xl font-black text-primary uppercase italic tracking-tighter">
            Audit <span className="text-accent underline decoration-4 decoration-accent/30 underline-offset-8">Trail</span>
          </h2>
          <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Global operation logs & recovery matrix</p>
        </header>
        
        {message && (
          <div className={`p-5 rounded-2xl flex items-center gap-3 animate-fade-in border-2 ${
            message.type === 'success' ? 'bg-success/5 text-success border-success/10' : 'bg-error/5 text-error border-error/10'
          }`}>
            <span className="font-black uppercase tracking-tight">{message.text}</span>
          </div>
        )}

        <div className="flex flex-col gap-5 pb-20">
          {loading ? (
            <div className="text-center py-24 text-muted-foreground italic font-black uppercase tracking-widest text-xs">Accessing Secure Ledger...</div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="text-center py-24 text-muted-foreground italic font-black uppercase tracking-widest text-xs">No entries in matrix.</div>
          ) : Object.entries(grouped).sort((a, b) => b[1][0].createdAt.localeCompare(a[1][0].createdAt)).map(([groupId, groupTransactions]) => {
            const isExpanded = expandedGroups.has(groupId);
            const isCancelled = groupTransactions.some(t => t.status === 'CANCELLED');
            const originalAction = groupTransactions.find(t => t.type === 'SHOP_OUT');
            const reversalAction = groupTransactions.find(t => t.type === 'REVERSAL');
            
            return (
              <div key={groupId} className={`group rounded-[2rem] bg-white border border-border/40 shadow-xl shadow-primary/5 p-0 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:border-accent/30 relative ${isCancelled ? 'opacity-70' : ''}`}>
                <div 
                  className={`absolute top-0 left-0 w-2 h-full transition-colors ${isCancelled ? 'bg-error/40' : 'bg-accent group-hover:bg-primary'}`}
                />
                
                <div 
                  className="p-6 md:p-8 flex flex-col xl:flex-row xl:items-center gap-6 xl:gap-12 cursor-pointer"
                  onClick={() => toggleGroup(groupId)}
                >
                  {/* Batch Header */}
                  <div className="flex flex-col gap-2 min-w-[220px]">
                    <div className="flex items-center gap-2 text-[10px] font-black text-accent uppercase tracking-[0.2em]">
                      <Hash size={14} className="group-hover:rotate-12 transition-transform" /> {groupId.slice(0, 8)}
                    </div>
                    <div className="flex items-center gap-3">
                       <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border shadow-sm ${isCancelled ? 'bg-error/5 text-error border-error/10' : 'bg-success/5 text-success border-success/10'}`}>
                         {isCancelled ? 'Nullified' : 'Active Log'}
                       </span>
                       <span className="text-sm font-black text-primary">
                         {groupTransactions.flatMap(t => t.items).length} Assets
                       </span>
                    </div>
                  </div>

                  {/* Operator Info */}
                  <div className="flex flex-col gap-2 sm:min-w-[200px]">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none opacity-50">Origin Operator</span>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-muted/30 flex items-center justify-center text-primary border border-border/50 group-hover:bg-accent group-hover:text-white transition-all">
                        <User size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-sm uppercase tracking-tight">{originalAction?.user?.name || 'Ghost Admin'}</span>
                        <div className="text-[10px] text-muted-foreground font-bold flex items-center gap-1.5 mt-0.5">
                          <Calendar size={10} /> {new Date(originalAction?.createdAt || '').toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reversal Marker */}
                  {reversalAction && (
                    <div className="flex flex-col gap-2 sm:min-w-[220px] bg-error/[0.03] p-4 rounded-2xl border border-error/10 animate-scale-in">
                      <span className="text-[9px] font-black text-error uppercase tracking-widest leading-none flex items-center gap-1.5">
                        <RotateCcw size={12} /> Nullification Agent
                      </span>
                      <div className="flex items-center gap-3 text-error">
                        <div className="w-8 h-8 rounded-xl bg-error/10 flex items-center justify-center border border-error/10">
                          <User size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-xs uppercase tracking-tight">{reversalAction.user?.name || 'System'}</span>
                          <span className="text-[9px] font-bold opacity-70 italic">{new Date(reversalAction.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Section */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:ml-auto border-t sm:border-t-0 pt-6 sm:pt-0 border-border/20">
                    {!isCancelled && (
                      <button 
                        className={`h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          reversingId === groupId ? 'bg-muted text-muted-foreground cursor-wait' : 
                          confirmId === groupId ? 'bg-error text-white shadow-xl shadow-error/20 animate-pulse border-none' : 
                          'bg-white text-error border-2 border-error/10 hover:bg-error hover:text-white hover:shadow-xl hover:shadow-error/10'
                        }`}
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleReverse(groupId); 
                        }}
                        disabled={reversingId === groupId}
                      >
                        {reversingId === groupId ? 'Syncing...' : 
                         confirmId === groupId ? 'CONFIRM REVERSAL' : 'Reverse Action'}
                      </button>
                    )}
                    
                    <div className={`p-2 rounded-2xl transition-all ${isExpanded ? 'bg-accent text-white rotate-180' : 'bg-muted text-muted-foreground hover:bg-accent hover:text-white hover:scale-110'}`}>
                      <ChevronDown size={20} />
                    </div>
                  </div>
                </div>

                {/* Detail View */}
                {isExpanded && (
                  <div className="px-6 md:px-10 pb-10 pt-2 border-t border-border/30 bg-muted/5 animate-fade-in">
                    <div className="overflow-x-auto">
                      <table className="w-full mt-6">
                        <thead>
                          <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-border/30">
                            <th className="pb-3 text-left w-32">Ident Code</th>
                            <th className="pb-3 text-left">Asset Designation</th>
                            <th className="pb-3 text-right">Delta</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/10">
                          {groupTransactions.flatMap(t => t.items || []).map((item, idx) => (
                            <tr key={idx} className="group/row">
                              <td className="py-4 font-mono font-black text-accent text-xs group-hover/row:translate-x-1 transition-transform inline-block mt-4">{item.sku.code}</td>
                              <td className="py-4 font-black text-sm text-primary uppercase italic tracking-tight">{item.sku.name}</td>
                              <td className="py-4 text-right">
                                <span className={`text-lg font-black font-mono ${isCancelled ? 'text-muted-foreground line-through' : 'text-error'}`}>
                                  -{item.quantity}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AuthGuard>
  );
}
