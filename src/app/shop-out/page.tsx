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
}

interface CartItem {
  skuId: string;
  name: string;
  code: string;
  quantity: number;
  maxQuantity: number;
  srp: number;
}

export default function ShopOutPage() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkingOut, setCheckingOut] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchSkus = async () => {
    try {
      const res = await fetch(`/api/skus?search=${searchTerm}`);
      const data = await res.json();
      setSkus(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSkus();
  }, [searchTerm]);

  const addToCart = (sku: SKU) => {
    if (sku.quantity <= 0) return;
    
    setCart(prev => {
      const existing = prev.find(item => item.skuId === sku.id);
      if (existing) {
        if (existing.quantity >= sku.quantity) return prev;
        return prev.map(item => item.skuId === sku.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { skuId: sku.id, quantity: 1, name: sku.name, code: sku.code, maxQuantity: sku.quantity, srp: sku.srp }];
    });
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
        fetchSkus();
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

  return (
    <AuthGuard>
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8 lg:h-[calc(100vh-120px)] relative pb-20 lg:pb-0">
        {/* Product Grid */}
        <div className="lg:col-span-12 xl:col-span-8 flex flex-col gap-6 overflow-hidden min-h-0">
          <header className="flex flex-col gap-1 items-stretch">
            <h2 className="text-2xl md:text-3xl font-bold text-primary">Shop-Out System</h2>
            <p className="text-muted-foreground text-sm font-medium">Deduct stock for operational use</p>
          </header>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Quick search SKU..."
              className="input pl-10 h-12 text-base md:text-lg shadow-sm border-none bg-white font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2 pb-4 max-h-[350px] lg:max-h-none min-h-0 border-b border-border/10">
            {skus.map((sku) => (
              <div 
                key={sku.id} 
                onClick={() => addToCart(sku)}
                className={`card p-4 md:p-5 cursor-pointer transition-all hover:border-accent group relative border-none shadow-sm hover:shadow-xl ${sku.quantity <= 0 ? 'opacity-50 grayscale pointer-events-none' : ''}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2 rounded-lg bg-muted group-hover:bg-accent/10 transition-colors">
                    <ShoppingCart size={18} className="text-muted-foreground group-hover:text-accent" />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${sku.quantity <= 10 ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>
                    {sku.quantity} in stock
                  </span>
                </div>
                <div className="font-bold text-base md:text-lg text-primary">{sku.name}</div>
                <div className="flex justify-between items-center mt-1">
                  <div className="text-[10px] text-muted-foreground font-mono font-bold">{sku.code}</div>
                  <div className="text-xs font-black text-accent">IDR {sku.srp?.toLocaleString()}</div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); addToCart(sku); }}
                  className="mt-4 w-full btn btn-outline text-xs h-10 border-muted group-hover:bg-accent group-hover:text-white group-hover:border-accent font-black uppercase tracking-widest active:scale-95 transition-transform"
                >
                  Add to Cart
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Floating Cart Trigger (Mobile Only) */}
        {cart.length > 0 && (
          <button 
            onClick={() => {
              const cartElement = document.getElementById('checkout-cart');
              cartElement?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="xl:hidden fixed bottom-6 right-6 z-[200] bg-accent text-white p-4 rounded-full shadow-2xl flex items-center gap-2 animate-bounce hover:animate-none active:scale-95"
          >
            <ShoppingCart size={24} />
            <span className="font-bold">{cart.length}</span>
          </button>
        )}

        {/* Sidebar Cart */}
        <div id="checkout-cart" className="lg:col-span-12 xl:col-span-4 flex flex-col bg-white border border-border/50 rounded-2xl shadow-xl relative min-h-[450px] lg:h-full z-10 transition-all">
          <div className="p-6 border-b border-border/50 bg-muted/30">
            <h3 className="font-black text-xl flex items-center gap-2 text-primary uppercase tracking-tight">
              <ShoppingCart size={24} className="text-accent" />
              Checkout Cart
              <span className="ml-auto bg-accent text-white text-xs px-2.5 py-1 rounded-full font-bold">{cart.length}</span>
            </h3>
          </div>

          <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-4 min-h-[200px]">
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
                      <div className="text-[10px] font-black text-accent">IDR {item.srp?.toLocaleString()}</div>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(item.skuId)} className="p-2 -mr-2 text-muted-foreground hover:text-error transition-colors">
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
              message.type === 'success' ? 'bg-success/10 text-success border border-success/20' : 'bg-error/10 text-error border border-error/20'
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
              <span className="text-accent tracking-tighter">IDR {cart.reduce((sum, item) => sum + (item.quantity * item.srp), 0).toLocaleString()}</span>
            </div>
            <button 
              disabled={cart.length === 0 || checkingOut}
              onClick={handleCheckout}
              className="w-full btn btn-primary py-5 rounded-2xl shadow-xl shadow-accent/20 disabled:opacity-50 disabled:grayscale transition-all font-black uppercase tracking-widest text-sm hover:-translate-y-0.5 active:translate-y-0"
            >
              {checkingOut ? 'Processing...' : 'CONFIRM TRANSACTION'}
            </button>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
