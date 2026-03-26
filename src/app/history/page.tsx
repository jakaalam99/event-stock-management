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
      <div className="flex flex-col gap-6 md:gap-8">
        <header className="flex flex-col gap-1">
          <h2 className="text-2xl md:text-3xl font-bold text-primary">Transaction History</h2>
          <p className="text-muted-foreground text-sm">Audit log and stock reversal system</p>
        </header>
        
        {message && (
          <div className={`p-4 rounded-xl flex items-center gap-3 animate-fade-in border ${
            message.type === 'success' ? 'bg-success/10 text-success border-success/20' : 'bg-error/10 text-error border-error/20'
          }`}>
            <span className="font-bold text-sm">{message.text}</span>
          </div>
        )}

        <div className="flex flex-col gap-4 pb-12">
          {loading ? (
            <div className="text-center py-20 text-muted-foreground italic">Syncing with ledger...</div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">No operations logged yet.</div>
          ) : Object.entries(grouped).map(([groupId, groupTransactions]) => {
            const isExpanded = expandedGroups.has(groupId);
            const isCancelled = groupTransactions.some(t => t.status === 'CANCELLED');
            const originalAction = groupTransactions.find(t => t.type === 'SHOP_OUT');
            const reversalAction = groupTransactions.find(t => t.type === 'REVERSAL');
            
            return (
              <div key={groupId} className={`card p-0 overflow-hidden border-l-4 ${isCancelled ? 'border-l-error/50 bg-error/5' : 'border-l-accent'}`}>
                <div 
                  className="p-4 md:p-5 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => toggleGroup(groupId)}
                >
                  {/* Basic Info */}
                  <div className="flex flex-col gap-1 min-w-[200px]">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      <Hash size={12} /> Batch {groupId.slice(0, 8)}
                    </div>
                    <div className="flex items-center gap-2">
                       <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${isCancelled ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>
                         {isCancelled ? 'REVERSED' : 'COMPLETED'}
                       </span>
                       <span className="text-xs font-bold text-primary">
                         {groupTransactions.flatMap(t => t.items).length} items
                       </span>
                    </div>
                  </div>

                  {/* Creator Trail */}
                  <div className="flex flex-col gap-1 sm:min-w-[180px]">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1 opacity-60">Created By</div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                        <User size={12} />
                      </div>
                      <span className="font-bold text-xs md:text-sm">{originalAction?.user?.name || 'Unknown'}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                      <Calendar size={10} /> {new Date(originalAction?.createdAt || '').toLocaleString()}
                    </div>
                  </div>

                  {/* Reverser Trail */}
                  {reversalAction && (
                    <div className="flex flex-col gap-1 sm:min-w-[180px] border-l border-border/20 pl-4 animate-fade-in shadow-inner bg-error/[0.02] p-2 rounded-lg">
                      <div className="text-[10px] font-bold text-error uppercase tracking-widest leading-none mb-1 opacity-80 flex items-center gap-1">
                        <RotateCcw size={10} /> Reversed By
                      </div>
                      <div className="flex items-center gap-2 text-error">
                        <div className="w-6 h-6 rounded-full bg-error/10 flex items-center justify-center">
                          <User size={12} />
                        </div>
                        <span className="font-bold text-xs md:text-sm">{reversalAction.user?.name || 'Unknown'}</span>
                      </div>
                      <div className="text-[10px] text-error/60 font-medium flex items-center gap-1">
                        <Calendar size={10} /> {new Date(reversalAction.createdAt).toLocaleString()}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between sm:justify-end gap-4 sm:ml-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-border/30">
                    {!isCancelled && (
                      <button 
                        className={`btn py-1.5 md:py-2 px-2 md:px-3 text-[10px] md:text-xs transition-all ${
                          reversingId === groupId ? 'opacity-50 cursor-wait' : 
                          confirmId === groupId ? 'bg-error text-white border-error shadow-lg animate-pulse' : 
                          'btn-outline bg-white hover:text-error hover:bg-error/10'
                        }`}
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleReverse(groupId); 
                        }}
                        disabled={reversingId === groupId}
                      >
                        <RotateCcw size={12} className={reversingId === groupId ? 'animate-spin' : ''} />
                        {reversingId === groupId ? 'Reversing...' : 
                         confirmId === groupId ? 'CLICK TO CONFIRM' : 'Reverse'}
                      </button>
                    )}
                    
                    <div className="p-1 rounded-full hover:bg-muted transition-colors">
                      {isExpanded ? <ChevronDown size={18} className="text-muted-foreground" /> : <ChevronRight size={18} className="text-muted-foreground" />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 md:px-5 pb-5 border-t border-border/50 animate-fade-in overflow-hidden">
                    <div className="hidden sm:block overflow-x-auto -mx-4 md:-mx-5 px-4 md:px-5">
                      <table className="w-full mt-4 text-xs md:text-sm min-w-[400px]">
                        <thead>
                          <tr className="text-muted-foreground font-bold border-b border-border/30">
                            <th className="py-2 text-left">SKU Code</th>
                            <th className="py-2 text-left">Item Name</th>
                            <th className="py-2 text-right">Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupTransactions.flatMap(t => t.items || []).map((item, idx) => (
                            <tr key={idx} className="border-b border-border/10 last:border-0">
                              <td className="py-3 font-mono font-bold text-accent">{item.sku.code}</td>
                              <td className="py-3 font-medium">{item.sku.name}</td>
                              <td className="py-3 text-right font-bold text-error">-{item.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="sm:hidden flex flex-col gap-2 mt-4">
                      {groupTransactions.flatMap(t => t.items || []).map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-2 border-b border-border/10 last:border-0">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-accent font-mono">{item.sku.code}</span>
                            <span className="text-xs font-semibold text-primary">{item.sku.name}</span>
                          </div>
                          <span className="font-bold text-error">-{item.quantity}</span>
                        </div>
                      ))}
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
