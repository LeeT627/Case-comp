'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
      const response = await fetch('/api/metrics/my', {
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

  const populateTestData = async () => {
    const token = localStorage.getItem('competition_token');
    try {
      const response = await fetch('/api/test/populate-metrics', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('Test data populated! Refreshing...');
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to populate test data:', error);
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
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">Competition Dashboard</h1>
            <p className="text-gray-600">
              {participant?.campus_name} • {participant?.email}
            </p>
          </div>
          {participant?.email === 'himanshuraj6771@gmail.com' && (
            <button
              onClick={populateTestData}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
            >
              Populate Test Data
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Total Signups</p>
            <p className="text-3xl font-bold">{metrics?.total_signups || 0}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">D1 Activated</p>
            <p className="text-3xl font-bold">{metrics?.d1_activated || 0}</p>
            <p className="text-xs text-gray-500">
              {metrics?.total_signups ? 
                `${Math.round((metrics.d1_activated / metrics.total_signups) * 100)}%` : 
                '0%'
              }
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">D7 Retained</p>
            <p className="text-3xl font-bold">{metrics?.d7_retained || 0}</p>
            <p className="text-xs text-gray-500">
              {metrics?.total_signups ? 
                `${Math.round((metrics.d7_retained / metrics.total_signups) * 100)}%` : 
                '0%'
              }
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Referred DAU</p>
            <p className="text-3xl font-bold">{metrics?.referred_dau || 0}</p>
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

        <div className="mt-8 text-center">
          <button
            onClick={() => {
              localStorage.removeItem('competition_token');
              localStorage.removeItem('participant_id');
              router.push('/join');
            }}
            className="text-gray-500 underline"
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}