'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthGuard({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      const role = localStorage.getItem('user_role');
      
      if (!role) {
        // Double check with server just in case
        try {
          const res = await fetch('/api/auth/me');
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem('user_role', data.user.role);
            localStorage.setItem('user_name', data.user.name);
            localStorage.setItem('user_id', data.user.userId);
            setAuthorized(true);
            return;
          }
        } catch (e) {}
        
        router.push('/login');
        return;
      }

      if (adminOnly && role !== 'ADMIN') {
        router.push('/shop-out'); // Redirect staff away from admin pages
        return;
      }

      setAuthorized(true);
    };

    checkAuth();
  }, [router, pathname, adminOnly]);

  if (!authorized) return <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground font-medium animate-pulse">Verifying Permissions...</div>;

  return <>{children}</>;
}
