'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem('competition_token');
    const participantId = localStorage.getItem('participant_id');
    
    // Public routes that don't need auth
    const publicRoutes = ['/', '/join'];
    const isPublicRoute = publicRoutes.includes(pathname);
    
    if (!token || !participantId) {
      // No auth, redirect to join if trying to access protected route
      if (!isPublicRoute) {
        router.push('/join');
      }
    } else {
      // Has auth, redirect to dashboard if on public route
      if (isPublicRoute && pathname !== '/') {
        router.push('/dashboard');
      }
    }
  }, [pathname, router]);

  return <>{children}</>;
}