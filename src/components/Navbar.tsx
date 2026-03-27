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

  useEffect(() => {
    setRole(localStorage.getItem('user_role'));
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
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
          <Box className="text-black" size={24} />
        </div>
        <h1 className="text-xl font-bold tracking-tight">EventStock</h1>
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
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                isActive 
                  ? "bg-white text-black shadow-lg shadow-white/10" 
                  : "hover:bg-white/10 text-muted-foreground hover:text-white"
              )}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="pt-6 border-t border-muted/20">
        <div className="mb-4 px-4">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Signed in as</div>
          <div className="text-xs font-bold truncate text-white/50">{role === 'ADMIN' ? 'Administrator' : 'Inventory Staff'}</div>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-muted-foreground hover:text-error hover:bg-error/10 transition-all duration-200"
        >
          <LogOut size={20} />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </nav>
  );
}
