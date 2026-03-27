'use client';

import { useState, useEffect } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, CheckCircle2, AlertCircle } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';

interface SKU {
  id: string;
  code: string;
  name: string;
  quantity: number;
  srp: number;
  imageUrl?: string;
}

interface CartItem {
  skuId: string;
  name: string;
  code: string;
  quantity: number;
  maxQuantity: number;
  srp: number;
  imageUrl?: string;
}

export default function ShopOutPage() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkingOut, setCheckingOut] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const fetchSkus = async (pageNum = 1, append = false) => {
    try {
      if (!append) setLoading(true);
      else setFetchingMore(true);

      const res = await fetch(`/api/skus?search=${searchTerm}&page=${pageNum}&limit=12`);
      const result = await res.json();
      
      if (append) {
        setSkus(prev => [...prev, ...(result.data || [])]);
      } else {
        setSkus(result.data || []);
      }
      
      setHasMore((result.data?.length || 0) === 12);
      setPage(pageNum);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setFetchingMore(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchSkus(1, false);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const addToCart = (sku: SKU) => {
    if (sku.quantity <= 0) return;
    
    setCart(prev => {
      const existing = prev.find(item => item.skuId === sku.id);
      if (existing) {
        if (existing.quantity >= sku.quantity) return prev;
        return prev.map(item => item.skuId === sku.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { skuId: sku.id, quantity: 1, name: sku.name, code: sku.code, maxQuantity: sku.quantity, srp: sku.srp, imageUrl: sku.imageUrl }];
    });

    setRecentlyAddedId(sku.id);
    setTimeout(() => setRecentlyAddedId(null), 1500);
  };

  const updateQuantity = (skuId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.skuId !== skuId) return item;
      const next = item.quantity + delta;
      if (next <= 0) return item;
      if (next > item.maxQuantity) return item;
      return { ...item, quantity: next };
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (skuId: string) => {
    setCart(prev => prev.filter(item => item.skuId !== skuId));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setCheckingOut(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: localStorage.getItem('user_id'),
          userName: localStorage.getItem('user_name') || 'Guest User',
          items: cart.map(item => ({ skuId: item.skuId, quantity: item.quantity }))
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setMessage({ text: 'Shop-out successful!', type: 'success' });
        setCart([]);
        setIsCartOpen(false);
        fetchSkus(1, false);
      } else {
        setMessage({ text: result.error || 'Checkout failed', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Checkout failed', type: 'error' });
    } finally {
      setCheckingOut(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const renderCart = (isSidebar = false) => (
    <div className={`flex flex-col bg-white ${isSidebar ? 'lg:h-full border border-border/50 rounded-2xl shadow-xl sticky top-6' : 'h-full w-full max-w-md ml-auto shadow-2xl animate-slide-in-right'}`}>
      <div className="p-6 border-b border-border/50 bg-muted/30 flex items-center justify-between">
        <h3 className="font-black text-xl flex items-center gap-2 text-primary uppercase tracking-tight">
          <ShoppingCart size={24} className="text-primary" />
          Checkout Cart
          <span className="ml-auto bg-primary text-white text-xs px-2.5 py-1 rounded-full font-bold">{cart.length}</span>
        </h3>
        {!isSidebar && (
          <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors font-black text-xs uppercase tracking-widest">Close</button>
        )}
      </div>

      <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-4">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-4 opacity-50">
            <ShoppingCart size={64} strokeWidth={1} />
            <p className="font-black uppercase tracking-widest text-xs text-center">Select items to start<br/>operational shop-out</p>
          </div>
        ) : cart.map((item) => (
          <div key={item.skuId} className="flex flex-col gap-3 p-4 bg-muted/20 rounded-xl border border-border/50 transition-all hover:bg-white hover:shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-primary">{item.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-1 rounded">{item.code}</div>
                  <div className="text-[10px] font-black text-primary">IDR {item.srp?.toLocaleString()}</div>
                </div>
              </div>
              <button onClick={() => removeFromCart(item.skuId)} className="p-2 -mr-2 text-muted-foreground hover:text-black transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
            <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-border/30">
              <div className="flex items-center gap-4">
                <button onClick={() => updateQuantity(item.skuId, -1)} className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded-lg transition-colors"><Minus size={14} /></button>
                <span className="font-black text-base w-4 text-center">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.skuId, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded-lg transition-colors"><Plus size={14} /></button>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-muted-foreground uppercase">Stock</span>
                <span className="text-[10px] font-bold text-muted-foreground">{item.maxQuantity}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {message && (
        <div className={`mx-6 mb-4 p-4 rounded-xl flex items-center gap-3 text-sm font-black uppercase tracking-tight animate-fade-in shadow-sm ${
          message.type === 'success' ? 'bg-black/5 text-black border border-black/10' : 'bg-muted text-muted-foreground border border-border'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="p-6 bg-muted/40 border-t border-border/50 mt-auto">
        <div className="flex justify-between text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 px-1">
          <span>Total qty</span>
          <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
        </div>
        <div className="flex justify-between text-xl font-black mb-6 border-t border-border/50 pt-4 px-1">
          <span className="text-primary tracking-tighter">TOTAL</span>
          <span className="text-primary tracking-tighter">IDR {cart.reduce((sum, item) => sum + (item.quantity * item.srp), 0).toLocaleString()}</span>
        </div>
        <button 
          disabled={cart.length === 0 || checkingOut}
          onClick={handleCheckout}
          className="w-full btn btn-primary py-5 rounded-2xl shadow-xl shadow-primary/20 disabled:opacity-50 disabled:grayscale transition-all font-black uppercase tracking-widest text-sm hover:bg-neutral-800"
        >
          {checkingOut ? 'Processing...' : 'CONFIRM TRANSACTION'}
        </button>
      </div>
    </div>
  );

  return (
    <AuthGuard>
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8 min-h-[calc(100vh-120px)] relative pb-20 lg:pb-0">
        {/* Product Grid */}
        <div className="lg:col-span-12 xl:col-span-8 flex flex-col gap-6">
          <header className="flex flex-col gap-1 items-stretch">
            <h2 className="text-3xl md:text-5xl font-black text-primary uppercase italic tracking-tighter">
              Shop-<span className="text-primary underline decoration-4 decoration-border underline-offset-8">Out</span>
            </h2>
            <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Rapid Asset Deployment & Deduction</p>
          </header>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
            <input
              type="text"
              placeholder="Query SKU code or identify item..."
              className="input pl-12 h-14 bg-white border-none shadow-xl shadow-primary/5 font-bold text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex-grow pb-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {loading && !fetchingMore ? (
                <div className="col-span-full py-20 text-center text-muted-foreground font-black uppercase tracking-widest text-xs italic">Syncing Matrix...</div>
              ) : skus.length === 0 ? (
                <div className="col-span-full py-20 text-center text-muted-foreground font-black uppercase tracking-widest text-xs italic">No Records Identified.</div>
              ) : skus.map((sku) => {
                const isRecentlyAdded = recentlyAddedId === sku.id;
                return (
                  <div 
                    key={sku.id} 
                    onClick={() => addToCart(sku)}
                    className={`group p-0 rounded-[2.5rem] bg-white border border-border/40 shadow-xl shadow-primary/5 hover:border-primary hover:shadow-2xl transition-all duration-500 cursor-pointer overflow-hidden relative ${sku.quantity <= 0 ? 'opacity-50 grayscale pointer-events-none' : ''}`}
                  >
                    {/* Image Container */}
                    <div className="h-60 w-full bg-muted/20 relative overflow-hidden">
                      {sku.imageUrl ? (
                        <img src={sku.imageUrl} alt={sku.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                            <ShoppingCart size={80} strokeWidth={1} />
                        </div>
                      )}
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-lg border border-border/50">
                          <span className={`text-xs font-black uppercase tracking-widest ${sku.quantity <= 10 ? 'text-primary border-b-2 border-primary' : 'text-primary'}`}>
                            {sku.quantity} units
                          </span>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black font-mono text-muted-foreground leading-none uppercase tracking-[0.2em]">{sku.code}</span>
                        <h3 className="text-xl font-black text-primary leading-tight group-hover:text-black transition-colors">{sku.name}</h3>
                        <div className="text-sm font-black text-primary mt-2">
                          IDR {sku.srp?.toLocaleString()}
                        </div>
                      </div>
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); addToCart(sku); }}
                        className={`mt-6 w-full h-12 rounded-2xl transition-all font-black uppercase tracking-[0.2em] text-[10px] active:scale-95 flex items-center justify-center gap-2 ${
                            isRecentlyAdded 
                            ? 'bg-black text-white shadow-xl scale-105' 
                            : 'bg-muted/30 group-hover:bg-primary group-hover:text-white'
                        }`}
                      >
                        {isRecentlyAdded ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                        {isRecentlyAdded ? 'Added!' : 'Add To Cart'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div className="flex justify-center pt-10">
                <button 
                  onClick={() => fetchSkus(page + 1, true)}
                  disabled={fetchingMore}
                  className="btn btn-outline h-12 px-12 font-black uppercase text-[10px] tracking-widest bg-white shadow-xl shadow-primary/5 hover:bg-black hover:text-white transition-all disabled:opacity-50"
                >
                  {fetchingMore ? 'Expanding...' : 'Expand Matrix'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Floating Cart Trigger (Visible on all screens smaller than XL) */}
        {cart.length > 0 && (
          <button 
            onClick={() => setIsCartOpen(!isCartOpen)}
            className="xl:hidden fixed bottom-6 right-6 z-[120] bg-black text-white p-5 rounded-full shadow-2xl flex items-center gap-2 scale-110 active:scale-95 transition-all animate-bounce hover:animate-none"
          >
            <ShoppingCart size={24} />
            <span className="font-bold border-l border-white/20 pl-2">{cart.reduce((s, i) => s + i.quantity, 0)}</span>
          </button>
        )}

        {/* Mobile Sidebar Overlay (Drawer) */}
        {isCartOpen && (
          <div className="xl:hidden fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm animate-fade-in flex justify-end" onClick={() => setIsCartOpen(false)}>
            <div className="w-full max-w-sm h-full" onClick={e => e.stopPropagation()}>
                {renderCart(false)}
            </div>
          </div>
        )}

        {/* Desktop Sidebar Cart */}
        <aside className="hidden xl:block xl:col-span-4 h-full">
            {renderCart(true)}
        </aside>
      </div>
    </AuthGuard>
  );
}
