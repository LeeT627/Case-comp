'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { format, subDays } from 'date-fns';

interface AnalyticsData {
  // Time series data
  dailyMetrics: Array<{
    date: string;
    signups: number;
    dau: number;
    wau: number;
    mau: number;
    solverUsers: number;
    solverEvents: number;
  }>;
  
  // Current metrics
  currentMetrics: {
    totalSignups: number;
    dau: number;
    wau: number;
    mau: number;
    solverUniqueUsers: number;
    solverTotalEvents: number;
    d1Retention: number;
    d7Retention: number;
    d30Retention: number;
    dauWauStickiness: number;
    dauMauStickiness: number;
  };
  
  // Campus comparison
  campusData: Array<{
    participantEmail: string;
    referrals: number;
    dau: number;
    activationRate: number;
    retentionRate: number;
  }>;
}

export default function Analytics() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [dataScope, setDataScope] = useState<'referrals' | 'campus' | 'all'>('referrals');

  useEffect(() => {
    const token = localStorage.getItem('competition_token');
    if (!token) {
      router.push('/join');
      return;
    }
    
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [timeRange, dataScope]);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('competition_token');
      const response = await fetch(`/api/analytics?range=${timeRange}&scope=${dataScope}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading analytics...</div>
      </div>
    );
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">
            {dataScope === 'referrals' && 'Metrics for users you referred'}
            {dataScope === 'campus' && `All users from your campus`}
            {dataScope === 'all' && 'All IIT users across all campuses'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-4 mb-6">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          
          <select
            value={dataScope}
            onChange={(e) => setDataScope(e.target.value as 'referrals' | 'campus' | 'all')}
            className="px-4 py-2 border rounded-lg bg-white"
          >
            <option value="referrals">📊 My Referrals Only</option>
            <option value="campus">🏫 My Campus (All Students)</option>
            <option value="all">🌍 All Campuses</option>
          </select>

          <button
            onClick={() => router.push('/dashboard')}
            className="ml-auto px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Total Signups</p>
            <p className="text-2xl font-bold">{data?.currentMetrics.totalSignups || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">DAU</p>
            <p className="text-2xl font-bold">{data?.currentMetrics.dau || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">WAU</p>
            <p className="text-2xl font-bold">{data?.currentMetrics.wau || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">MAU</p>
            <p className="text-2xl font-bold">{data?.currentMetrics.mau || 0}</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Signups & Active Users Trend */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Signups & Active Users Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data?.dailyMetrics || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => format(new Date(date), 'MMM d')}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="signups" stroke="#3B82F6" name="Signups" />
                <Line type="monotone" dataKey="dau" stroke="#10B981" name="DAU" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* DAU/WAU/MAU Comparison */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">DAU/WAU/MAU Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data?.dailyMetrics || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  tickFormatter={(date) => format(new Date(date), 'MMM d')}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="mau" stackId="1" stroke="#8B5CF6" fill="#8B5CF6" name="MAU" />
                <Area type="monotone" dataKey="wau" stackId="2" stroke="#F59E0B" fill="#F59E0B" name="WAU" />
                <Area type="monotone" dataKey="dau" stackId="3" stroke="#10B981" fill="#10B981" name="DAU" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Solver Usage */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Solver Usage</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.dailyMetrics || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  tickFormatter={(date) => format(new Date(date), 'MMM d')}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="solverUsers" fill="#3B82F6" name="Unique Users" />
                <Bar dataKey="solverEvents" fill="#10B981" name="Total Events" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Retention Funnel */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Retention Funnel</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">D1 Retention</span>
                  <span className="text-sm font-bold">{data?.currentMetrics.d1Retention || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${data?.currentMetrics.d1Retention || 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">D7 Retention</span>
                  <span className="text-sm font-bold">{data?.currentMetrics.d7Retention || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${data?.currentMetrics.d7Retention || 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">D30 Retention</span>
                  <span className="text-sm font-bold">{data?.currentMetrics.d30Retention || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${data?.currentMetrics.d30Retention || 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stickiness & Ratios */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Stickiness</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>DAU/WAU</span>
                <span className="font-bold">{data?.currentMetrics.dauWauStickiness || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span>DAU/MAU</span>
                <span className="font-bold">{data?.currentMetrics.dauMauStickiness || 0}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Activation Ratios</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>DAU/Signups</span>
                <span className="font-bold">
                  {data?.currentMetrics.totalSignups 
                    ? Math.round((data.currentMetrics.dau / data.currentMetrics.totalSignups) * 100) 
                    : 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>WAU/Signups</span>
                <span className="font-bold">
                  {data?.currentMetrics.totalSignups 
                    ? Math.round((data.currentMetrics.wau / data.currentMetrics.totalSignups) * 100) 
                    : 0}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Solver Penetration</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Solver/DAU</span>
                <span className="font-bold">
                  {data?.currentMetrics.dau 
                    ? Math.round((data.currentMetrics.solverUniqueUsers / data.currentMetrics.dau) * 100) 
                    : 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Solver/MAU</span>
                <span className="font-bold">
                  {data?.currentMetrics.mau 
                    ? Math.round((data.currentMetrics.solverUniqueUsers / data.currentMetrics.mau) * 100) 
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Campus Leaderboard */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Campus Leaderboard</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Participant</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Referrals</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">DAU</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Activation</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Retention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data?.campusData.map((participant, index) => (
                  <tr key={participant.participantEmail}>
                    <td className="px-4 py-2 text-sm">#{index + 1}</td>
                    <td className="px-4 py-2 text-sm">{participant.participantEmail.split('@')[0]}</td>
                    <td className="px-4 py-2 text-sm font-medium">{participant.referrals}</td>
                    <td className="px-4 py-2 text-sm">{participant.dau}</td>
                    <td className="px-4 py-2 text-sm">{participant.activationRate}%</td>
                    <td className="px-4 py-2 text-sm">{participant.retentionRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}