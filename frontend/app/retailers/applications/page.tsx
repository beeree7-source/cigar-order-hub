'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface RetailerApplication {
  id: number;
  supplier_id: number;
  supplier_name: string;
  supplier_business: string;
  status: 'pending' | 'approved' | 'denied';
  application_data: Record<string, string>;
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<RetailerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    loadApplications(token);
  }, [router]);

  const loadApplications = async (token: string) => {
    try {
      const response = await fetch('http://localhost:10000/api/retailers/applications', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to load applications');

      const data = await response.json();
      setApplications(data.applications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading applications');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-900 text-green-100 border-green-700';
      case 'pending':
        return 'bg-yellow-900 text-yellow-100 border-yellow-700';
      case 'denied':
        return 'bg-red-900 text-red-100 border-red-700';
      default:
        return 'bg-gray-700 text-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return '✓';
      case 'pending':
        return '⏳';
      case 'denied':
        return '✕';
      default:
        return '•';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/retailers" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-white">Your Applications</h1>
          <p className="text-gray-400 mt-2">Track the status of your supplier applications</p>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Application Tabs */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {['all', 'pending', 'approved', 'denied'].map((status) => {
            const count = applications.filter(
              a => status === 'all' || a.status === status
            ).length;

            return (
              <button
                key={status}
                onClick={() => {}}
                className={`px-4 py-2 rounded-lg font-semibold capitalize transition-colors ${
                  status === 'all'
                    ? 'bg-blue-600 text-white'
                    : status === 'pending'
                    ? 'bg-yellow-700 text-yellow-100'
                    : status === 'approved'
                    ? 'bg-green-700 text-green-100'
                    : 'bg-red-700 text-red-100'
                }`}
              >
                {status} ({count})
              </button>
            );
          })}
        </div>

        {/* Applications List */}
        {applications.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
            <div className="text-6xl mb-4">📬</div>
            <h3 className="text-2xl font-bold text-white mb-2">No Applications Yet</h3>
            <p className="text-gray-400 mb-6">You haven't applied to any suppliers yet</p>
            <Link href="/retailers/apply">
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                Apply to Suppliers
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-blue-500 transition-colors"
              >
                {/* Application Header */}
                <button
                  onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                  className="w-full p-6 text-left hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-white">{app.supplier_name}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(app.status)}`}>
                          {getStatusIcon(app.status)} {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-gray-400 mt-1">{app.supplier_business}</p>
                      <p className="text-gray-500 text-sm mt-2">
                        Submitted {new Date(app.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-gray-400">
                      {expandedId === app.id ? '▼' : '▶'}
                    </div>
                  </div>
                </button>

                {/* Application Details (Expanded) */}
                {expandedId === app.id && (
                  <>
                    <div className="border-t border-gray-700 px-6 py-6 bg-gray-750">
                      {/* Application Data */}
                      <div className="mb-6">
                        <h4 className="text-white font-bold mb-4">Application Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(app.application_data).map(([key, value]) => (
                            <div key={key}>
                              <p className="text-gray-400 text-sm capitalize">{key.replace('_', ' ')}</p>
                              <p className="text-white font-semibold">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="border-t border-gray-600 pt-6">
                        <h4 className="text-white font-bold mb-4">Timeline</h4>
                        <div className="space-y-4">
                          <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className="w-3 h-3 bg-blue-500 rounded-full mt-1.5"></div>
                              <div className="w-1 h-12 bg-gray-600 my-1"></div>
                            </div>
                            <div>
                              <p className="text-gray-400 text-sm">Application Submitted</p>
                              <p className="text-white font-semibold">
                                {new Date(app.submitted_at).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          {app.reviewed_at && (
                            <div className="flex gap-4">
                              <div className="flex flex-col items-center">
                                <div className={`w-3 h-3 rounded-full ${
                                  app.status === 'approved' ? 'bg-green-500' : 'bg-red-500'
                                }`}></div>
                              </div>
                              <div>
                                <p className="text-gray-400 text-sm">
                                  Application {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                                </p>
                                <p className="text-white font-semibold">
                                  {new Date(app.reviewed_at).toLocaleString()}
                                </p>
                                {app.rejection_reason && (
                                  <p className="text-red-300 text-sm mt-2">
                                    <strong>Reason:</strong> {app.rejection_reason}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {app.status === 'approved' && (
                        <div className="border-t border-gray-600 mt-6 pt-6">
                          <Link href="/retailers/approved-suppliers">
                            <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                              View Approved Suppliers
                            </button>
                          </Link>
                        </div>
                      )}

                      {app.status === 'denied' && (
                        <div className="border-t border-gray-600 mt-6 pt-6">
                          <Link href="/retailers/apply">
                            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                              Apply Again
                            </button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/retailers/apply">
            <div className="bg-blue-900 border border-blue-700 rounded-lg p-4 cursor-pointer hover:bg-blue-800 transition-colors">
              <p className="text-blue-100 font-semibold">Apply to More Suppliers</p>
              <p className="text-blue-300 text-sm mt-1">Find new business partners</p>
            </div>
          </Link>

          <Link href="/retailers/approved-suppliers">
            <div className="bg-green-900 border border-green-700 rounded-lg p-4 cursor-pointer hover:bg-green-800 transition-colors">
              <p className="text-green-100 font-semibold">View Approved Suppliers</p>
              <p className="text-green-300 text-sm mt-1">Start placing orders</p>
            </div>
          </Link>

          <Link href="/retailers">
            <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 cursor-pointer hover:bg-gray-600 transition-colors">
              <p className="text-gray-100 font-semibold">Back to Dashboard</p>
              <p className="text-gray-300 text-sm mt-1">Return to main menu</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
