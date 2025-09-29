'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getSession } from '@/lib/api/clientApi';
import { useAuthStore, type AuthState } from '@/lib/store/authStore';

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const setUser = useAuthStore((state: AuthState) => state.setUser);
  const clearIsAuthenticated = useAuthStore((state: AuthState) => state.clearIsAuthenticated);

  // Приватні маршрути
  const isPrivateRoute = pathname?.startsWith('/profile') || pathname?.startsWith('/notes');

  useEffect(() => {
    const checkSession = async () => {
      try {
        setIsLoading(true);
        const sessionUser = await getSession();

        if (sessionUser) {
          setUser(sessionUser);
        } else {
          clearIsAuthenticated();
        }
      } catch {
        clearIsAuthenticated();
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [setUser, clearIsAuthenticated]);

  // Показуємо лоадер тільки на приватних сторінках під час завантаження
  if (isLoading && isPrivateRoute) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  // Завжди показуємо children (middleware контролює доступ)
  return <>{children}</>;
};

export default AuthProvider;