'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getSession } from '@/lib/api/clientApi';
import { useAuthStore, type AuthState } from '@/lib/store/authStore';

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProvider = ({ children }: AuthProviderProps) => {
  const pathname = usePathname();
  const setUser = useAuthStore((state: AuthState) => state.setUser);
  const clearIsAuthenticated = useAuthStore((state: AuthState) => state.clearIsAuthenticated);

  useEffect(() => {
    // Only check session, don't do redirects (middleware handles that)
    const checkSession = async () => {
      try {
        const sessionUser = await getSession();
        if (sessionUser) {
          setUser(sessionUser);
        } else {
          clearIsAuthenticated();
        }
      } catch {
        clearIsAuthenticated();
      }
    };

    checkSession();
  }, [pathname, setUser, clearIsAuthenticated]);

  return <>{children}</>;
};

export default AuthProvider;