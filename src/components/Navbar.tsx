'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, Box, ShoppingCart, History, LogOut, Shield } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/inventory', icon: Box, label: 'Inventory' },
  { href: '/shop-out', icon: ShoppingCart, label: 'Shop-Out' },
  { href: '/history', icon: History, label: 'History' },
  { href: '/admin', icon: Shield, label: 'Admin' },
];

export default function Navbar({ onMobileItemClick }: { onMobileItemClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);

  useEffect(() => {
    setRole(localStorage.getItem('user_role'));
    setStoreName(localStorage.getItem('store_name'));
  }, [pathname]);

  if (pathname === '/login') return null;

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/me', { method: 'DELETE' });
    } catch (e) {}
    localStorage.clear();
    setRole(null);
    router.push('/login');
    if (onMobileItemClick) onMobileItemClick();
  };

  const filteredNavItems = navItems.filter(item => {
    if (!role) return false;
    if (role === 'USER') {
      return item.href === '/inventory' || item.href === '/shop-out' || item.href === '/' || item.href === '/history';
    }
    // Only admins see /admin
    if (item.href === '/admin' && role !== 'ADMIN') return false;
    return true; 
  });

  if (!role) return null;

  return (
    <nav className="h-full w-64 bg-black text-white p-6 flex flex-col gap-8 shadow-2xl border-r border-white/5 overflow-y-auto">
      <div className="flex items-center gap-3 px-2">
        <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
          <Box className="text-white" size={24} />
        </div>
        <h1 className="text-xl font-black tracking-tighter uppercase italic">Event<span className="text-accent underline decoration-2 underline-offset-4">Stock</span></h1>
      </div>

      <div className="flex flex-col gap-2 flex-grow">
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onMobileItemClick?.()}
              className={cn(
                "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300",
                isActive 
                  ? "bg-accent text-white shadow-xl shadow-accent/30 scale-[1.02]" 
                  : "hover:bg-white/5 text-slate-400 hover:text-white"
              )}
            >
              <item.icon size={20} className={isActive ? "text-white" : "text-slate-500"} />
              <span className="font-bold text-sm tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="pt-6 border-t border-white/5">
        <div className="mb-6 px-4 py-3 bg-white/5 rounded-2xl border border-white/5">
          <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5">{storeName || 'Current Store'}</div>
          <div className="text-xs font-black text-white/80 flex items-center gap-2">
            <Shield size={12} className={role === 'ADMIN' ? "text-accent" : "text-emerald-500"} />
            {role === 'ADMIN' ? 'Site Administrator' : 'Operations Staff'}
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-slate-500 hover:text-error hover:bg-error/10 transition-all duration-300 group"
        >
          <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
          <span className="font-black text-[10px] uppercase tracking-widest">Logout</span>
        </button>
      </div>
    </nav>
  );
}
