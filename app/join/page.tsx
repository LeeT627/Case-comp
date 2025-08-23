'use client';

import { useState } from 'react';

export default function Join() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to join');
      }
      
      setSuccess(true);
      localStorage.setItem('competition_token', data.token);
      localStorage.setItem('participant_id', data.participant_id);
      
      // Redirect to dashboard or starter page based on unlock status
      window.location.href = data.unlocked ? '/dashboard' : '/starter';
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-8">
          Join GPai Competition
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              IIT Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="yourname@iitd.ac.in"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Only IIT email addresses are eligible
              {email.toLowerCase() === 'himanshuraj6771@gmail.com' && (
                <span className="block text-green-600 mt-1">✓ Test account recognized</span>
              )}
            </p>
          </div>
          
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
            {loading ? 'Joining...' : 'Join Competition'}
          </button>
        </form>
        
        <p className="text-center text-sm text-gray-500 mt-6">
          You must have an existing GPai account with this email
        </p>
      </div>
    </main>
  );
}