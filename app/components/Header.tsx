'use client';

import { useEffect, useState } from 'react';
import LogoutButton from './LogoutButton';

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('competition_token');
    if (token) {
      setIsLoggedIn(true);
      // Decode JWT to get email (simple base64 decode, not verification)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserEmail(payload.email || '');
      } catch {
        // Invalid token
      }
    }
  }, []);

  if (!isLoggedIn) return null;

  return (
    <div className="fixed top-0 right-0 p-4 z-50 flex items-center gap-4 bg-white/80 backdrop-blur-sm rounded-bl-lg shadow-sm">
      {userEmail && (
        <span className="text-sm text-gray-600">
          {userEmail}
        </span>
      )}
      <LogoutButton variant="secondary" />
    </div>
  );
}