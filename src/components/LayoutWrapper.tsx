'use client';

import { usePathname } from 'next/navigation';
import MobileHeader from '@/components/MobileHeader';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {!isLoginPage && <MobileHeader />}
      <main className={`flex-grow ${isLoginPage ? '' : 'lg:ml-64'} min-h-screen p-4 md:p-8 ${isLoginPage ? '' : 'pt-20 lg:pt-8'} transition-all duration-300`}>
        <div className={`animate-fade-in ${isLoginPage ? '' : 'max-w-7xl mx-auto'}`}>
          {children}
        </div>
      </main>
    </div>
  );
}
