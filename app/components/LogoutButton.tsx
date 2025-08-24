'use client';

import { useRouter } from 'next/navigation';

interface LogoutButtonProps {
  className?: string;
  variant?: 'primary' | 'secondary' | 'minimal';
}

export default function LogoutButton({ className = '', variant = 'secondary' }: LogoutButtonProps) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('competition_token');
    localStorage.removeItem('participant_id');
    router.push('/join');
  };

  const baseStyles = 'px-4 py-2 rounded-lg transition font-medium';
  
  const variantStyles = {
    primary: 'bg-red-600 text-white hover:bg-red-700',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    minimal: 'text-gray-500 underline hover:text-gray-700'
  };

  return (
    <button
      onClick={handleLogout}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      Logout
    </button>
  );
}