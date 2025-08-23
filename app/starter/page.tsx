'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ParticipantData {
  email: string;
  campus_name: string;
  referral_code: string;
  eligible_referrals_total: number;
  unlocked_at: string | null;
}

export default function Starter() {
  const router = useRouter();
  const [participant, setParticipant] = useState<ParticipantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [referralUrl, setReferralUrl] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('competition_token');
    if (!token) {
      router.push('/join');
      return;
    }

    try {
      const response = await fetch('/api/participant/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Unauthorized');
      }

      const data = await response.json();
      setParticipant(data);
      
      // Check if unlocked
      if (data.unlocked_at) {
        router.push('/dashboard');
        return;
      }

      // Generate referral URL
      if (data.referral_code) {
        setReferralUrl(`https://gpai.app/?r=${data.referral_code}`);
      }
    } catch (error) {
      router.push('/join');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    alert('Referral link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const referralsNeeded = 5 - (participant?.eligible_referrals_total || 0);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-4xl w-full">
        <h1 className="text-4xl font-bold text-center mb-2">
          Welcome to GPai Campus Case Competition
        </h1>
        <p className="text-center text-gray-600 mb-8">
          {participant?.campus_name}
        </p>

        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-center">
            🔒 Dashboard Locked
          </h2>
          <p className="text-center text-lg mb-6">
            You need <span className="font-bold text-2xl text-yellow-600">{referralsNeeded} more</span> eligible referrals to unlock the dashboard
          </p>
          
          <div className="bg-white rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600">Your Progress</span>
              <span className="text-sm font-medium">
                {participant?.eligible_referrals_total || 0} / 5 referrals
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${((participant?.eligible_referrals_total || 0) / 5) * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">How to unlock:</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Share your unique referral link with friends at your IIT</li>
              <li>They must sign up using your link</li>
              <li>They must use their IIT email address</li>
              <li>Once 5 friends sign up, your dashboard unlocks automatically!</li>
            </ol>
          </div>
        </div>

        {referralUrl && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold mb-3">Your Referral Link</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={referralUrl}
                readOnly
                className="flex-1 px-4 py-2 bg-white border rounded-lg font-mono text-sm"
              />
              <button
                onClick={handleCopyLink}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Copy Link
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Share this link with your IIT friends to get them to sign up for GPai
            </p>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/join')}
            className="text-gray-500 underline"
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}