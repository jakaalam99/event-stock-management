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
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8 lg:h-[calc(100vh-120px)]">
        {/* Product Grid */}
        <div className="lg:col-span-12 xl:col-span-8 flex flex-col gap-6 overflow-hidden">
          <header className="flex flex-col gap-1 items-stretch">
            <h2 className="text-2xl md:text-3xl font-bold text-primary">Shop-Out System</h2>
            <p className="text-muted-foreground text-sm">Deduct stock for operational use</p>
          </header>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Quick search SKU..."
              className="input pl-10 h-10 md:h-12 text-sm md:text-lg shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2 pb-8 max-h-[500px] lg:max-h-none">
            {skus.map((sku) => (
              <div 
                key={sku.id} 
                onClick={() => addToCart(sku)}
                className={`card p-4 md:p-5 cursor-pointer transition-all hover:border-accent group ${sku.quantity <= 0 ? 'opacity-50 grayscale pointer-events-none' : 'hover:shadow-md'}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2 rounded-lg bg-muted group-hover:bg-accent/10 transition-colors">
                    <ShoppingCart size={18} className="text-muted-foreground group-hover:text-accent" />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${sku.quantity <= 10 ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>
                    {sku.quantity} in stock
                  </span>
                </div>
                <div className="font-bold text-base md:text-lg">{sku.name}</div>
                <div className="flex justify-between items-center mt-1">
                  <div className="text-[10px] text-muted-foreground font-mono">{sku.code}</div>
                  <div className="text-xs font-bold text-accent">IDR {sku.srp?.toLocaleString()}</div>
                </div>
                <button className="mt-4 w-full btn btn-outline text-xs h-9 md:h-10 group-hover:bg-accent group-hover:text-white group-hover:border-accent">
                  Add to Cart
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Cart */}
        <div className="lg:col-span-12 xl:col-span-4 flex flex-col bg-white border border-border rounded-2xl shadow-xl overflow-hidden relative min-h-[400px]">
          <div className="p-6 border-b border-border bg-muted/30">
            <h3 className="font-bold text-xl flex items-center gap-2">
              <ShoppingCart size={24} className="text-accent" />
              Checkout Cart
              <span className="ml-auto bg-accent text-white text-xs px-2 py-1 rounded-full">{cart.length}</span>
            </h3>
          </div>

          <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 opacity-50">
                <ShoppingCart size={48} strokeWidth={1} />
                <p className="font-medium">Direct selection to start</p>
              </div>
            ) : cart.map((item) => (
              <div key={item.skuId} className="flex flex-col gap-3 p-4 bg-muted/20 rounded-xl border border-border/50">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold">{item.name}</div>
                    <div className="flex items-center gap-2">
                      <div className="text-[10px] font-mono text-muted-foreground">{item.code}</div>
                      <div className="text-[10px] font-bold text-accent">IDR {item.srp?.toLocaleString()}</div>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(item.skuId)} className="text-muted-foreground hover:text-error transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex justify-between items-center bg-white p-2 rounded-lg shadow-sm">
                  <div className="flex items-center gap-3">
                    <button onClick={() => updateQuantity(item.skuId, -1)} className="p-1 hover:bg-muted rounded"><Minus size={14} /></button>
                    <span className="font-bold w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.skuId, 1)} className="p-1 hover:bg-muted rounded"><Plus size={14} /></button>
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground">Max: {item.maxQuantity}</span>
                </div>
              </div>
            ))}
          </div>

          {message && (
            <div className={`mx-6 mb-4 p-3 rounded-lg flex items-center gap-2 text-sm font-bold animate-fade-in ${
              message.type === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
            }`}>
              {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {message.text}
            </div>
          )}

          <div className="p-6 bg-muted/30 border-t border-border mt-auto">
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>Total Quantity</span>
              <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
            <div className="flex justify-between text-lg font-black mb-6 border-t border-border pt-2">
              <span>Total Value</span>
              <span className="text-accent">IDR {cart.reduce((sum, item) => sum + (item.quantity * item.srp), 0).toLocaleString()}</span>
            </div>
            <button 
              disabled={cart.length === 0 || checkingOut}
              onClick={handleCheckout}
              className="w-full btn btn-primary py-4 rounded-xl shadow-lg shadow-accent/20 disabled:opacity-50 disabled:grayscale transition-all"
            >
              {checkingOut ? 'Processing...' : 'CONFIRM SHOP-OUT'}
            </button>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
