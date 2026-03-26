'use client';

import { useState, useEffect } from 'react';
import { Search, Upload, Plus, AlertCircle, CheckCircle2, Package, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import AuthGuard from '@/components/AuthGuard';

interface SKU {
  id: string;
  code: string;
  name: string;
  quantity: number;
  srp: number;
  lowStockThreshold: number;
  updatedAt: string;
}

export default function InventoryPage() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSku, setNewSku] = useState({ code: '', name: '', quantity: 0, srp: 0 });

  const fetchSkus = async () => {
    try {
      const res = await fetch(`/api/skus?search=${searchTerm}`);
      const data = await res.json();
      setSkus(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const data = [
      ['SKU', 'Name', 'Quantity', 'SRP', 'Threshold'],
      ['SKU-001', 'Sample Item A', '100', '150000', '10'],
      ['SKU-002', 'Sample Item B', '50', '250000', '5'],
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory Template');
    XLSX.writeFile(wb, 'import_template.xlsx');
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchSkus();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/skus/import', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (res.ok) {
        setMessage({ text: result.message, type: 'success' });
        fetchSkus();
      } else {
        setMessage({ text: result.error, type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Import failed', type: 'error' });
    } finally {
      setImporting(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleAddSku = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/skus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSku, lowStockThreshold: 10 }),
      });
      if (res.ok) {
        setMessage({ text: 'SKU added successfully', type: 'success' });
        setShowAddModal(false);
        setNewSku({ code: '', name: '', quantity: 0, srp: 0 });
        fetchSkus();
      } else {
        const err = await res.json();
        setMessage({ text: err.error || 'Failed to add SKU', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Failed to add SKU', type: 'error' });
    }
  };

  return (
    <AuthGuard>
      <div className="flex flex-col gap-6 md:gap-8">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-primary">Inventory Management</h2>
            <p className="text-muted-foreground text-sm mt-1">Manage your SKUs and stock levels</p>
          </div>
          <div className="flex flex-col xs:flex-row gap-2 md:gap-3 w-full sm:w-auto">
            <button className="btn btn-outline flex-grow shadow-sm" onClick={downloadTemplate}>
              <Download size={18} />
              <span>Template</span>
            </button>
            <label className="btn btn-outline cursor-pointer relative overflow-hidden flex-grow shadow-sm">
              <Upload size={18} />
              <span className="inline-block">{importing ? 'Importing...' : 'Bulk Import'}</span>
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleImport} disabled={importing} />
            </label>
            <button className="btn btn-primary flex-grow" onClick={() => setShowAddModal(true)}>
              <Plus size={18} />
              <span>Add SKU</span>
            </button>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-3 animate-fade-in ${
            message.type === 'success' ? 'bg-success/10 text-success border border-success/20' : 'bg-error/10 text-error border border-error/20'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="font-medium text-sm">{message.text}</span>
          </div>
        )}

        <div className="card flex flex-col gap-4 md:gap-6 overflow-hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Search by SKU code or name..."
              className="input pl-10 h-10 md:h-12 text-sm md:text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Desktop Table: Hidden on Mobile */}
          <div className="hidden md:block overflow-x-auto -mx-6 px-6 pb-2">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-medium text-sm">
                  <th className="pb-4 px-4 w-40">SKU Code</th>
                  <th className="pb-4 px-4">Item Name</th>
                  <th className="pb-4 px-4 w-40 text-right">SRP (IDR)</th>
                  <th className="pb-4 px-4 w-32">Status</th>
                  <th className="pb-4 px-4 w-32 text-right">Stock Level</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="py-12 text-center text-muted-foreground italic font-medium">Syncing warehouse...</td></tr>
                ) : skus.length === 0 ? (
                  <tr><td colSpan={4} className="py-12 text-center text-muted-foreground italic font-medium">No items found in system.</td></tr>
                ) : skus.map((sku) => (
                  <tr key={sku.id} className="border-b border-border/10 hover:bg-muted/30 transition-all group cursor-default">
                    <td className="py-4 px-4 font-mono text-sm font-bold text-accent">{sku.code}</td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-primary">{sku.name}</div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-mono text-sm font-bold text-primary">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(sku.srp || 0)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {sku.quantity <= sku.lowStockThreshold ? (
                        <span className="px-2 py-1 rounded-full bg-error/10 text-error text-[10px] font-black uppercase tracking-tight flex items-center gap-1 w-fit border border-error/10">
                          <AlertCircle size={10} /> Low Stock
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full bg-success/10 text-success text-[10px] font-black uppercase tracking-tight flex items-center gap-1 w-fit border border-success/10">
                          <CheckCircle2 size={10} /> Optimal
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={`text-xl font-black font-mono ${sku.quantity <= sku.lowStockThreshold ? 'text-error' : 'text-primary'}`}>
                        {sku.quantity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards: Visible on Small Screens */}
          <div className="md:hidden flex flex-col gap-3">
            {loading ? (
              <div className="text-center py-20 text-muted-foreground italic font-medium">Syncing...</div>
            ) : skus.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground italic font-medium">Empty catalog.</div>
            ) : skus.map((sku) => (
              <div key={sku.id} className="p-4 rounded-xl border border-border/40 bg-white/50 backdrop-blur-sm hover:border-accent/30 transition-all flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black font-mono text-accent leading-none uppercase tracking-widest">{sku.code}</span>
                    <h3 className="text-lg font-bold text-primary mt-1 leading-tight">{sku.name}</h3>
                    <div className="text-xs font-bold text-accent mt-1">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(sku.srp || 0)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-2xl font-black font-mono leading-none ${sku.quantity <= sku.lowStockThreshold ? 'text-error' : 'text-primary'}`}>
                      {sku.quantity}
                    </span>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Units</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-border/20">
                  {sku.quantity <= sku.lowStockThreshold ? (
                    <span className="px-2 py-1 rounded-full bg-error/10 text-error text-[9px] font-black uppercase flex items-center gap-1 border border-error/5">
                      <AlertCircle size={10} /> Stock Critical
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full bg-success/10 text-success text-[9px] font-black uppercase flex items-center gap-1 border border-success/5">
                      <CheckCircle2 size={10} /> Stock Stable
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground font-medium italic">
                    Updated {new Date(sku.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add SKU Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md animate-fade-in shadow-2xl">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Package className="text-accent" /> Add New SKU
              </h3>
              <form onSubmit={handleAddSku} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">SKU Code</label>
                  <input 
                    required 
                    className="input" 
                    placeholder="e.g. LAP-001" 
                    value={newSku.code}
                    onChange={e => setNewSku({...newSku, code: e.target.value})}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Item Name</label>
                  <input 
                    required 
                    className="input" 
                    placeholder="e.g. MacBook Pro" 
                    value={newSku.name}
                    onChange={e => setNewSku({...newSku, name: e.target.value})}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Initial Quantity</label>
                  <input 
                    type="number" 
                    required 
                    className="input" 
                    value={newSku.quantity}
                    onChange={e => setNewSku({...newSku, quantity: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Suggested Retail Price (SRP)</label>
                  <input 
                    type="number" 
                    required 
                    className="input" 
                    placeholder="e.g. 50000" 
                    value={newSku.srp}
                    onChange={e => setNewSku({...newSku, srp: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="button" className="btn btn-outline flex-grow" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary flex-grow">Save SKU</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
