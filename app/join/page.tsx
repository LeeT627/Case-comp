'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Join() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem('competition_token');
    if (token) {
      router.push('/upload');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Validate passwords match for signup
    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    // Validate password length
    if (!isLogin && password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch('/api/auth/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password,
          isLogin 
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to join');
      }
      
      setSuccess(true);
      localStorage.setItem('competition_token', data.token);
      localStorage.setItem('participant_id', data.participant_id);
      
      // Redirect to upload page
      window.location.href = '/upload';
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-2">
          GPai Case Competition
        </h1>
        <p className="text-center text-gray-600 mb-8">
          {isLogin ? 'Welcome back!' : 'Join the competition'}
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={loading}
              minLength={6}
            />
          </div>
          
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={loading}
                minLength={6}
              />
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-2 rounded">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 text-green-600 px-4 py-2 rounded">
              Success! Redirecting...
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>
          
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setPassword('');
                setConfirmPassword('');
              }}
              className="text-blue-600 hover:underline text-sm"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Login'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}