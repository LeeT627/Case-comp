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
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => {
          localStorage.removeItem('competition_token');
          localStorage.removeItem('participant_id');
          window.location.href = '/join';
        }}
        className="text-sm text-gray-500 hover:text-gray-700 underline"
      >
        Logout
      </button>
    </div>
  );
}