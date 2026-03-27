'use client';

import { useState, useEffect } from 'react';
import { Search, Upload, Plus, AlertCircle, CheckCircle2, Package, Download, Pencil, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import AuthGuard from '@/components/AuthGuard';

interface SKU {
  id: string;
  code: string;
  name: string;
  quantity: number;
  srp: number;
  imageUrl?: string;
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
  const [editingSku, setEditingSku] = useState<SKU | null>(null);
  const [newSku, setNewSku] = useState({ code: '', name: '', quantity: 0, srp: 0, imageUrl: '' });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [bulkEditing, setBulkEditing] = useState(false);
  const [storeName, setStoreName] = useState<string | null>(null);

  const fetchSkus = async (pageNum = 1, append = false) => {
    try {
      if (!append) setLoading(true);
      else setFetchingMore(true);
      
      const res = await fetch(`/api/skus?search=${searchTerm}&page=${pageNum}&limit=20`);
      const result = await res.json();
      
      if (append) {
        setSkus(prev => [...prev, ...(result.data || [])]);
      } else {
        setSkus(result.data || []);
      }
      
      setHasMore((result.data?.length || 0) === 20);
      setPage(pageNum);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setFetchingMore(false);
    }
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewSku({ ...newSku, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
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

  const exportCurrentStock = async () => {
    try {
      setExporting(true);
      // Fetch more items for export (limit 1000 for convenience)
      const res = await fetch(`/api/skus?limit=1000`);
      const result = await res.json();
      const allSkus = result.data || [];

      const data = allSkus.map((sku: SKU) => ({
        SKU: sku.code,
        Name: sku.name,
        Quantity: sku.quantity,
        SRP: sku.srp,
        Threshold: sku.lowStockThreshold
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Current Inventory');
      XLSX.writeFile(wb, `${storeName || 'Inventory'}_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Export failed:', err);
      setMessage({ text: 'Export failed', type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchSkus(1, false);
      setStoreName(localStorage.getItem('store_name'));
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

  const handleBulkEdit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkEditing(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/skus/bulk-edit', {
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
      setMessage({ text: 'Reconciliation failed', type: 'error' });
    } finally {
      setBulkEditing(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleEditClick = (sku: SKU) => {
    setEditingSku(sku);
    setNewSku({
      code: sku.code,
      name: sku.name,
      quantity: sku.quantity,
      srp: sku.srp,
      imageUrl: sku.imageUrl || ''
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingSku(null);
    setNewSku({ code: '', name: '', quantity: 0, srp: 0, imageUrl: '' });
  };

  const handleAddSku = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/skus', {
        method: editingSku ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...newSku, 
          id: editingSku?.id,
          imageUrl: newSku.imageUrl || null, 
          lowStockThreshold: editingSku?.lowStockThreshold || 10 
        }),
      });
      if (res.ok) {
        setMessage({ text: `SKU ${editingSku ? 'updated' : 'added'} successfully`, type: 'success' });
        closeModal();
        fetchSkus();
      } else {
        const err = await res.json();
        setMessage({ text: err.error || `Failed to ${editingSku ? 'update' : 'add'} SKU`, type: 'error' });
      }
    } catch (err) {
      setMessage({ text: `Failed to ${editingSku ? 'update' : 'add'} SKU`, type: 'error' });
    }
  };

  return (
    <AuthGuard>
      <div className="flex flex-col gap-6 md:gap-8 min-h-[100vh]">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl md:text-5xl font-black text-primary tracking-tighter uppercase italic">
              Inventory <span className="text-accent underline decoration-4 decoration-accent/30 underline-offset-8">List</span>
            </h2>
            <p className="text-slate-500 text-sm md:text-lg font-bold uppercase tracking-[0.2em] mt-2 border-l-4 border-accent pl-4">{storeName || 'Stock Management'}</p>
          </div>
          <div className="flex flex-wrap gap-2 md:gap-3 w-full lg:w-auto">
            <button className="btn btn-outline h-11 bg-white hover:bg-muted font-black uppercase text-[10px] tracking-widest px-4 shadow-sm" onClick={downloadTemplate}>
              <Download size={16} /> Template
            </button>
            <button className="btn btn-outline h-11 bg-white hover:bg-muted font-black uppercase text-[10px] tracking-widest px-4 shadow-sm" onClick={exportCurrentStock} disabled={exporting}>
              <Download size={16} /> <span>{exporting ? '...' : 'Export'}</span>
            </button>
            <label className="btn btn-outline h-11 bg-white cursor-pointer relative overflow-hidden font-black uppercase text-[10px] tracking-widest px-4 shadow-sm" title="Add new items (Additive)">
              <Upload size={16} /> <span>{importing ? '...' : 'Import'}</span>
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleImport} disabled={importing} />
            </label>
            <label className="btn btn-outline h-11 bg-black text-white cursor-pointer relative overflow-hidden font-black uppercase text-[10px] tracking-widest px-4 shadow-sm" title="Reconcile existing stock (Absolute Set)">
              <Upload size={16} stroke="white" /> <span>{bulkEditing ? '...' : 'Update Stock'}</span>
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleBulkEdit} disabled={bulkEditing} />
            </label>
            <button className="btn btn-primary h-11 px-6 shadow-xl shadow-accent/20 font-black uppercase text-[10px] tracking-widest bg-accent hover:bg-slate-900" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Add New Product
            </button>
          </div>
        </div>

        {message && (
          <div className={`p-5 rounded-2xl flex items-center gap-3 animate-fade-in border-2 ${
            message.type === 'success' ? 'bg-success/5 text-success border-success/10' : 'bg-error/5 text-error border-error/10'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            <span className="font-bold uppercase tracking-tight">{message.text}</span>
          </div>
        )}

        <div className="card shadow-premium p-4 md:p-8 flex flex-col gap-6 md:gap-8 border-none bg-white/80 backdrop-blur-sm">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-accent transition-colors" size={20} />
            <input
              type="text"
              placeholder="Query SKU code or identify item..."
              className="input pl-12 h-14 bg-muted/20 border-border/40 focus:bg-white text-lg font-medium transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  <th className="pb-4 px-4">IMG</th>
                  <th className="pb-4 px-4">SKU Code</th>
                  <th className="pb-4 px-4">Product Name</th>
                  <th className="pb-4 px-4 text-right">SRP (IDR)</th>
                  <th className="pb-4 px-4">Status</th>
                  <th className="pb-4 px-4 text-right">Stock Level</th>
                  <th className="pb-4 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {loading ? (
                  <tr><td colSpan={7} className="py-20 text-center text-muted-foreground italic font-black uppercase tracking-widest text-xs">Loading Stock...</td></tr>
                ) : skus.length === 0 ? (
                  <tr><td colSpan={7} className="py-20 text-center text-muted-foreground italic font-black uppercase tracking-widest text-xs">No records found.</td></tr>
                ) : skus.map((sku) => (
                  <tr key={sku.id} className="hover:bg-muted/30 transition-all group">
                    <td className="py-4 px-4">
                      <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden border border-border/50 group-hover:border-primary transition-colors">
                        {sku.imageUrl ? <img src={sku.imageUrl} alt={sku.name} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Package size={20} /></div>}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-sm font-black text-accent">{sku.code}</td>
                    <td className="py-4 px-4">
                      <div className="font-black text-primary group-hover:text-accent transition-colors">{sku.name}</div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-mono text-sm font-black text-primary">
                        {new Intl.NumberFormat('id-ID').format(sku.srp || 0)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {sku.quantity <= (sku.lowStockThreshold || 10) ? (
                        <span className="px-3 py-1 rounded-full bg-error/10 text-error text-[9px] font-black uppercase tracking-tight flex items-center gap-1.5 w-fit border border-error/10">
                          <AlertCircle size={12} /> Critical
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-success/10 text-success text-[9px] font-black uppercase tracking-tight flex items-center gap-1.5 w-fit border border-success/10">
                          <CheckCircle2 size={12} /> Optimised
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={`text-xl font-black font-mono scale-110 inline-block transition-transform group-hover:translate-x-[-4px] ${sku.quantity <= (sku.lowStockThreshold || 10) ? 'text-error' : 'text-primary'}`}>
                        {sku.quantity}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button 
                        onClick={() => handleEditClick(sku)}
                        className="p-2 rounded-lg bg-muted/50 hover:bg-accent hover:text-white transition-all shadow-sm"
                        title="Edit Asset"
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Grid */}
          <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-full py-20 text-center text-muted-foreground font-black uppercase tracking-widest text-xs">Accessing Data...</div>
            ) : skus.length === 0 ? (
              <div className="col-span-full py-20 text-center text-muted-foreground font-black uppercase tracking-widest text-xs">No products found.</div>
            ) : skus.map((sku) => (
              <div key={sku.id} className="group p-5 rounded-3xl border border-border/40 bg-white shadow-xl shadow-primary/5 hover:border-accent/30 transition-all flex flex-col gap-4 relative overflow-hidden">
                <button 
                  onClick={() => handleEditClick(sku)}
                  className="absolute top-4 right-4 p-2 rounded-xl bg-muted/50 hover:bg-accent hover:text-white transition-all z-10"
                >
                  <Pencil size={14} />
                </button>
                
                <div className="flex gap-4 items-start">
                  <div className="w-20 h-20 rounded-2xl bg-muted overflow-hidden border border-border/50 shrink-0">
                    {sku.imageUrl ? <img src={sku.imageUrl} alt={sku.name} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Package size={30} /></div>}
                  </div>
                  <div className="flex flex-col flex-grow justify-between py-1">
                    <div>
                      <span className="text-[10px] font-black font-mono text-accent leading-none uppercase tracking-widest">{sku.code}</span>
                      <h3 className="text-xl font-black text-primary mt-1 leading-none pr-8">{sku.name}</h3>
                    </div>
                    <div className="text-sm font-black text-accent mt-2">
                       {new Intl.NumberFormat('id-ID').format(sku.srp || 0)} <span className="text-[8px] font-bold text-muted-foreground uppercase ml-1">SRP</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-border/20">
                   <div className="flex flex-col gap-1">
                     <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Inventory Status</span>
                     {sku.quantity <= (sku.lowStockThreshold || 10) ? (
                        <span className="text-error text-[10px] font-black uppercase flex items-center gap-1">
                          <AlertCircle size={10} /> Depleted
                        </span>
                      ) : (
                        <span className="text-success text-[10px] font-black uppercase flex items-center gap-1">
                          <CheckCircle2 size={10} /> Available
                        </span>
                      )}
                   </div>
                   <div className="flex flex-col items-end gap-1 bg-muted/30 px-4 py-2 rounded-2xl border border-border/20 group-hover:bg-accent group-hover:border-accent transition-all duration-300">
                     <span className="text-2xl font-black font-mono leading-none group-hover:text-white transition-colors">{sku.quantity}</span>
                     <span className="text-[8px] font-black uppercase text-muted-foreground group-hover:text-white/60 transition-colors tracking-widest">Units Stock</span>
                   </div>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-8">
              <button 
                onClick={() => fetchSkus(page + 1, true)}
                disabled={fetchingMore}
                className="btn btn-outline h-12 px-12 font-black uppercase text-[10px] tracking-widest bg-white shadow-xl shadow-primary/5 hover:bg-black hover:text-white transition-all disabled:opacity-50"
              >
                {fetchingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>

        {/* Add/Edit SKU Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[150] p-4">
            <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-lg animate-scale-in shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-accent to-primary" />
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-3xl font-black text-primary uppercase italic tracking-tighter">
                  {editingSku ? 'Update' : 'New'} SKU <span className="text-accent">{editingSku ? 'Record' : 'Protocol'}</span>
                </h3>
                <button onClick={closeModal} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-error/10 hover:text-error transition-all font-bold">✕</button>
              </div>
              
              <form onSubmit={handleAddSku} className="flex flex-col gap-5">
                <div className="flex flex-col md:flex-row gap-5">
                  <div className="w-full md:w-1/2 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Identity Code</label>
                      <input required className="input h-12 bg-muted/30 font-bold border-none" placeholder="SKU-XXX" value={newSku.code} onChange={e => setNewSku({...newSku, code: e.target.value})} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Product Designation</label>
                      <input required className="input h-12 bg-muted/30 font-bold border-none" placeholder="Name" value={newSku.name} onChange={e => setNewSku({...newSku, name: e.target.value})} />
                    </div>
                  </div>
                  
                  <div className="w-full md:w-1/2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 block mb-2">Visual Mapping</label>
                    <div className="relative group/upload h-28">
                      <div className="w-full h-full rounded-2xl border-2 border-dashed border-border group-hover/upload:border-accent transition-all overflow-hidden bg-muted/10 flex items-center justify-center relative">
                        {newSku.imageUrl ? (
                          <img src={newSku.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-muted-foreground group-hover/upload:text-accent transition-colors">
                            <Upload size={24} />
                            <span className="text-[8px] font-black uppercase">Upload Image</span>
                          </div>
                        )}
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleImageFile} />
                      </div>
                      {newSku.imageUrl && (
                        <button type="button" onClick={() => setNewSku({...newSku, imageUrl: ''})} className="absolute -top-2 -right-2 bg-error text-white p-1 rounded-full shadow-lg">✕</button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">{editingSku ? 'Set Quantity' : 'Initial Qty'}</label>
                    <input type="number" required className="input h-12 bg-muted/30 font-bold border-none" value={newSku.quantity} onChange={e => setNewSku({...newSku, quantity: parseInt(e.target.value) || 0})} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">SRP (Retail Val)</label>
                    <input type="number" required className="input h-12 bg-muted/30 font-bold border-none" placeholder="IDR" value={newSku.srp} onChange={e => setNewSku({...newSku, srp: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary h-14 rounded-2xl shadow-xl shadow-accent/20 font-black uppercase tracking-[0.2em] mt-2">
                  {editingSku ? 'Commit Changes' : 'Initialize Inventory SKU'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
