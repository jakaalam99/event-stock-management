'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthGuard({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      // 1. Check Session Cache (Faster navigation between internal pages)
      const cachedUser = sessionStorage.getItem('auth_user_cache');
      const cacheTime = sessionStorage.getItem('auth_user_time');
      const now = Date.now();

      if (cachedUser && cacheTime && (now - parseInt(cacheTime) < 60000)) {
        setAuthorized(true);
        return;
      }

      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          // Sync all metadata
          localStorage.setItem('user_role', data.user.role);
          localStorage.setItem('user_name', data.user.name);
          localStorage.setItem('user_id', data.user.userId);
          localStorage.setItem('store_id', data.user.storeId);
          localStorage.setItem('store_name', data.user.storeName);

          // Set Session Cache
          sessionStorage.setItem('auth_user_cache', JSON.stringify(data.user));
          sessionStorage.setItem('auth_user_time', now.toString());

          // Force redirect if not admin - ONLY if adminOnly is explicitly true
          if (adminOnly === true && data.user.role !== 'ADMIN') {
            router.push('/shop-out');
            return;
          }

          setAuthorized(true);
        } else {
          localStorage.clear();
          sessionStorage.clear();
          router.push('/login');
        }
      } catch (err) {
        console.error('Auth verification failed:', err);
        // Fallback to local storage if network fails
        const localRole = localStorage.getItem('user_role');
        if (localRole) {
          if (adminOnly && localRole !== 'ADMIN') {
            router.push('/shop-out');
          } else {
            setAuthorized(true);
          }
        } else {
          router.push('/login');
        }
      }
    };

    checkAuth();
  }, [router, pathname, adminOnly]);

  if (!authorized) return <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground font-medium animate-pulse">Checking Access...</div>;

  return <>{children}</>;
}
