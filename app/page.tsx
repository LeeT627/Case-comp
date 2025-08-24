'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if logged in
    const token = localStorage.getItem('competition_token');
    if (token) {
      router.push('/upload');
    } else {
      router.push('/join');
    }
  }, [router]);

  return null;
}