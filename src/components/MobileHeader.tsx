'use client';

import { Menu, X, Box } from 'lucide-react';
import { useState, useEffect } from 'react';
import Navbar from './Navbar';

import { usePathname } from 'next/navigation';

export default function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const [storeName, setStoreName] = useState<string | null>(null);

  // Close sidebar on navigation
  useEffect(() => {
    setIsOpen(false);
    setStoreName(localStorage.getItem('store_name'));
  }, [pathname]);

  if (pathname === '/login') return null;

  return (
    <>
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-black text-white flex items-center justify-between px-6 z-[110] shadow-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white text-black rounded flex items-center justify-center">
            <Box size={18} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight leading-none">EventStock</span>
            {storeName && <span className="text-[9px] font-black uppercase text-white/50 tracking-widest mt-1">{storeName}</span>}
          </div>
        </div>
        
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[105] animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Wrapper for Mobile */}
      <div className={`
        fixed inset-y-0 left-0 z-[106] w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Navbar onMobileItemClick={() => setIsOpen(false)} />
      </div>
    </>
  );
}
