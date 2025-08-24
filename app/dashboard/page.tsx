'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MetricsTooltip from '../components/MetricsTooltip';

interface ParticipantData {
  email: string;
  campus_name: string;
  referral_code: string;
  eligible_referrals_total: number;
  unlocked_at: string;
}

interface Metrics {
  total_signups: number;
  d1_activated: number;
  d7_retained: number;
  referred_dau: number;
  campus_rank: number;
  overall_rank: number;
  activation_rate?: number;
  retention_rate?: number;
  total_participants?: number;
  campus_participants?: number;
  days_remaining?: number;
  last_updated?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [participant, setParticipant] = useState<ParticipantData | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    fetchMetrics();
    
    // Auto-refresh metrics every minute
    const interval = setInterval(() => {
      fetchMetrics();
    }, 60000); // 60 seconds
    
    return () => clearInterval(interval);
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
      
      // Check if not unlocked
      if (!data.unlocked_at) {
        router.push('/starter');
        return;
      }
    } catch (error) {
      router.push('/join');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    const token = localStorage.getItem('competition_token');
    try {
      // Use live endpoint that pulls from GPai directly
      const response = await fetch('/api/metrics/live', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setSubmissionStatus('uploading');

    try {
      const token = localStorage.getItem('competition_token');
      const response = await fetch('/api/submission/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      setSubmissionStatus('success');
      setTimeout(() => setSubmissionStatus(null), 3000);
    } catch (error) {
      setSubmissionStatus('error');
      setTimeout(() => setSubmissionStatus(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Competition Dashboard</h1>
          <p className="text-gray-600">
            {participant?.campus_name} • {participant?.email}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1 flex items-center">
                  Your Referrals
                  <MetricsTooltip 
                    title="Your Referrals"
                    description="Total users who signed up with your referral code. Only counts real accounts (non-guests)."
                  />
                </p>
                <p className="text-3xl font-bold">{metrics?.total_signups || 0}</p>
                <p className="text-xs text-green-600 mt-1">+{participant?.eligible_referrals_total || 0} total</p>
              </div>
              <span className="text-2xl">👥</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1 flex items-center">
                  Activation Rate
                  <MetricsTooltip 
                    title="D1 Activation Rate"
                    description="Percentage of referrals who became active within 24 hours. Shows the quality and engagement of your referrals."
                    formula="(Active in 24h / Total) × 100"
                  />
                </p>
                <p className="text-3xl font-bold">
                  {metrics?.total_signups ? 
                    `${Math.round((metrics.d1_activated / metrics.total_signups) * 100)}%` : 
                    '0%'
                  }
                </p>
                <p className="text-xs text-gray-500 mt-1">{metrics?.d1_activated || 0} activated</p>
              </div>
              <span className="text-2xl">🚀</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1 flex items-center">
                  Retention Rate
                  <MetricsTooltip 
                    title="D7 Retention Rate"
                    description="Percentage of users still active 7 days after signup. Higher retention = better quality referrals."
                    formula="(Active after 7 days / Eligible) × 100"
                  />
                </p>
                <p className="text-3xl font-bold">
                  {metrics?.total_signups ? 
                    `${Math.round((metrics.d7_retained / metrics.total_signups) * 100)}%` : 
                    '0%'
                  }
                </p>
                <p className="text-xs text-gray-500 mt-1">{metrics?.d7_retained || 0} retained</p>
              </div>
              <span className="text-2xl">📊</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1 flex items-center">
                  Active Today
                  <MetricsTooltip 
                    title="Daily Active Users (DAU)"
                    description="Number of your referrals who used GPai in the last 24 hours. Shows ongoing engagement."
                  />
                </p>
                <p className="text-3xl font-bold">{metrics?.referred_dau || 0}</p>
                <p className="text-xs text-gray-500 mt-1">from your referrals</p>
              </div>
              <span className="text-2xl">🔥</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
            <p className="text-sm opacity-90 mb-1">Campus Rank</p>
            <p className="text-4xl font-bold">#{metrics?.campus_rank || '-'}</p>
            <p className="text-sm opacity-90 mt-2">Within {participant?.campus_name}</p>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
            <p className="text-sm opacity-90 mb-1">Overall Rank</p>
            <p className="text-4xl font-bold">#{metrics?.overall_rank || '-'}</p>
            <p className="text-sm opacity-90 mt-2">Across all IITs</p>
          </div>
        </div>

        <div className="mb-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⏱️</span>
                <div>
                  <p className="font-semibold">Competition Status</p>
                  <p className="text-sm text-gray-600">Submission deadline: TBD</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Last updated</p>
                <p className="text-sm font-medium">{metrics?.last_updated ? new Date(metrics.last_updated).toLocaleTimeString() : 'Loading...'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-semibold mb-6">Submit Your Case Study</h2>
          
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold mb-3">Case Brief</h3>
            <p className="text-gray-700">
              TBD - Challenge details coming soon. You can still upload your submission.
            </p>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".pdf,.ppt,.pptx"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
              disabled={submissionStatus === 'uploading'}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer"
            >
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-lg font-medium mb-2">
                {submissionStatus === 'uploading' ? 'Uploading...' : 'Upload your case study'}
              </p>
              <p className="text-sm text-gray-500">
                PDF, PPT, or PPTX (max 50MB)
              </p>
            </label>
            
            {submissionStatus === 'success' && (
              <p className="mt-4 text-green-600">✓ Submission uploaded successfully!</p>
            )}
            {submissionStatus === 'error' && (
              <p className="mt-4 text-red-600">✗ Upload failed. Please try again.</p>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={() => router.push('/analytics')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            View Analytics →
          </button>
        </div>
      </div>
    </main>
  );
}