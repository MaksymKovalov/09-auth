'use client';

import { Suspense, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getSession } from '@/lib/api/clientApi';
import { useAuthStore, type AuthState } from '@/lib/store/authStore';

const PUBLIC_ONLY_ROUTES = ['/sign-in', '/sign-up'];
const PROTECTED_PREFIXES = ['/notes', '/profile'];

const isProtectedRoute = (pathname: string) =>
  PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

const isPublicOnlyRoute = (pathname: string) => PUBLIC_ONLY_ROUTES.includes(pathname);

const sanitizeRedirectTarget = (target: string | null) => {
  if (!target) return null;
  return target.startsWith('/') ? target : null;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProviderInner = ({ children }: AuthProviderProps) => {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((state: AuthState) => state.setUser);
  const clearIsAuthenticated = useAuthStore((state: AuthState) => state.clearIsAuthenticated);
  const redirectTargetRef = useRef<string | null>(null);

  const searchParamsString = searchParams?.toString();
  const redirectParam = searchParams?.get('redirect') ?? null;

  useEffect(() => {
    let ignore = false;

    const checkAuth = async () => {
      try {
        const sessionUser = await getSession();

        if (!sessionUser) {
          clearIsAuthenticated();

          if (isProtectedRoute(pathname)) {
            const redirectValue = searchParamsString
              ? `${pathname}?${searchParamsString}`
              : pathname;
            const sanitizedRedirect = sanitizeRedirectTarget(redirectValue);
            const signInPath = sanitizedRedirect
              ? `/sign-in?redirect=${encodeURIComponent(sanitizedRedirect)}`
              : '/sign-in';
            if (!ignore) {
              router.replace(signInPath);
            }
          }
          return;
        }

  if (ignore) return;

  setUser(sessionUser);

        if (isPublicOnlyRoute(pathname)) {
          const target = sanitizeRedirectTarget(redirectTargetRef.current) ?? '/profile';
          router.replace(target);
        }
      } catch {
        if (ignore) return;

        clearIsAuthenticated();

        if (isProtectedRoute(pathname)) {
          router.replace('/sign-in');
        }
      }
    };

    redirectTargetRef.current = sanitizeRedirectTarget(redirectParam);
    checkAuth();

    return () => {
      ignore = true;
    };
  }, [pathname, redirectParam, searchParamsString, router, setUser, clearIsAuthenticated]);

  return children;
};

const AuthProvider = ({ children }: AuthProviderProps) => {
  return (
    <Suspense fallback={null}>
      <AuthProviderInner>{children}</AuthProviderInner>
    </Suspense>
  );
};

export default AuthProvider;
