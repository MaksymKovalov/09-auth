'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSession } from '@/lib/api/clientApi';
import { useAuthStore, type AuthState } from '@/lib/store/authStore';

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProvider = ({ children }: AuthProviderProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const setUser = useAuthStore((state: AuthState) => state.setUser);
  const clearIsAuthenticated = useAuthStore((state: AuthState) => state.clearIsAuthenticated);
  const isAuthenticated = useAuthStore((state: AuthState) => state.isAuthenticated);

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
          // Якщо користувач неавторизований і намагається перейти на приватну сторінку
          if (isPrivateRoute) {
            router.push('/sign-in');
          }
        }
      } catch (error) {
        clearIsAuthenticated();
        if (isPrivateRoute) {
          router.push('/sign-in');
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [pathname, setUser, clearIsAuthenticated, router, isPrivateRoute]);

  // Під час перевірки показуємо лоадер
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

  // Якщо користувач неавторизований на приватній сторінці - не показуємо контент
  if (!isAuthenticated && isPrivateRoute && !isLoading) {
    return null;
  }

  return <>{children}</>;
};

export default AuthProvider;