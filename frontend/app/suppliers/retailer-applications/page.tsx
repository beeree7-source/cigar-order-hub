'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface RetailerApplication {
  id: number;
  retailer_id: number;
  retailer_name: string;
  retailer_business: string;
  retailer_email: string;
  status: 'pending' | 'approved' | 'denied';
  application_data: Record<string, string>;
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

export default function SupplierApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<RetailerApplication[]>([]);
  const [filteredApps, setFilteredApps] = useState<RetailerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [approvalData, setApprovalData] = useState<Record<string, any>>({});
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    loadApplications();
  }, [router, token]);

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredApps(applications);
    } else {
      setFilteredApps(applications.filter(a => a.status === statusFilter));
    }
  }, [statusFilter, applications]);

  const loadApplications = async () => {
    try {
      const response = await fetch('http://localhost:10000/api/suppliers/retailer-applications', {
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

  const handleApprove = async (applicationId: number) => {
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `http://localhost:10000/api/suppliers/applications/${applicationId}/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            credit_limit: approvalData[applicationId]?.credit_limit || 5000,
            payment_terms: approvalData[applicationId]?.payment_terms || 'Net 30'
          })
        }
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to approve application');
      }

      setSuccess('Application approved successfully!');
      setApprovalData({ ...approvalData, [applicationId]: {} });
      await loadApplications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error approving application');
    }
  };

  const handleDeny = async (applicationId: number, reason: string) => {
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `http://localhost:10000/api/suppliers/applications/${applicationId}/deny`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ rejection_reason: reason || 'Application denied' })
        }
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to deny application');
      }

      setSuccess('Application denied');
      await loadApplications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error denying application');
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
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/suppliers" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-white">Retailer Applications</h1>
          <p className="text-gray-400 mt-2">Review and approve applications from retailers</p>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900 border border-green-700 text-green-100 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {/* Status Filters */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {['all', 'pending', 'approved', 'denied'].map((status) => {
            const count = applications.filter(
              a => status === 'all' || a.status === status
            ).length;

            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg font-semibold capitalize transition-colors ${
                  statusFilter === status
                    ? status === 'all'
                      ? 'bg-blue-600 text-white'
                      : status === 'pending'
                      ? 'bg-yellow-600 text-white'
                      : status === 'approved'
                      ? 'bg-green-600 text-white'
                      : 'bg-red-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {status} ({count})
              </button>
            );
          })}
        </div>

        {/* Applications List */}
        {filteredApps.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
            <div className="text-6xl mb-4">📮</div>
            <h3 className="text-2xl font-bold text-white mb-2">No {statusFilter} Applications</h3>
            <p className="text-gray-400">
              {statusFilter === 'all'
                ? 'You haven\'t received any applications yet'
                : `There are no ${statusFilter} applications`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApps.map((app) => (
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
                        <h3 className="text-xl font-bold text-white">{app.retailer_name}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(app.status)}`}>
                          {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-gray-400 mt-1">{app.retailer_business}</p>
                      <p className="text-gray-500 text-sm mt-2">
                        Applied {new Date(app.submitted_at).toLocaleDateString()}
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
                      {/* Retailer Info */}
                      <div className="mb-6">
                        <h4 className="text-white font-bold mb-4">Retailer Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-gray-400 text-sm">Business Name</p>
                            <p className="text-white font-semibold">{app.retailer_business}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm">Email</p>
                            <p className="text-white font-semibold">{app.retailer_email}</p>
                          </div>
                        </div>
                      </div>

                      {/* Application Data */}
                      <div className="mb-6 border-t border-gray-600 pt-6">
                        <h4 className="text-white font-bold mb-4">Application Data</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(app.application_data).map(([key, value]) => (
                            <div key={key}>
                              <p className="text-gray-400 text-sm capitalize">{key.replace('_', ' ')}</p>
                              <p className="text-white font-semibold">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      {app.status === 'pending' && (
                        <div className="border-t border-gray-600 mt-6 pt-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-gray-300 font-semibold text-sm mb-2">Credit Limit</label>
                              <input
                                type="number"
                                defaultValue={5000}
                                onChange={(e) => setApprovalData({
                                  ...approvalData,
                                  [app.id]: {
                                    ...approvalData[app.id],
                                    credit_limit: Number(e.target.value)
                                  }
                                })}
                                className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-gray-300 font-semibold text-sm mb-2">Payment Terms</label>
                              <select
                                defaultValue="Net 30"
                                onChange={(e) => setApprovalData({
                                  ...approvalData,
                                  [app.id]: {
                                    ...approvalData[app.id],
                                    payment_terms: e.target.value
                                  }
                                })}
                                className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                              >
                                <option>Net 30</option>
                                <option>Net 15</option>
                                <option>Net 60</option>
                                <option>COD</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={() => handleApprove(app.id)}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Reason for denial (optional):');
                                if (reason !== null) {
                                  handleDeny(app.id, reason);
                                }
                              }}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                              ✕ Deny
                            </button>
                          </div>
                        </div>
                      )}

                      {app.status === 'denied' && app.rejection_reason && (
                        <div className="border-t border-gray-600 mt-6 pt-6">
                          <p className="text-gray-400 text-sm">Denial Reason:</p>
                          <p className="text-red-300">{app.rejection_reason}</p>
                        </div>
                      )}

                      {app.status === 'approved' && (
                        <div className="border-t border-gray-600 mt-6 pt-6">
                          <h4 className="text-white font-bold mb-3">Contact Retailer</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <a
                              href={`/messages?contactId=${app.retailer_id}`}
                              className="text-center bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                              Message
                            </a>
                            <a
                              href={`mailto:${app.retailer_email}`}
                              className="text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                              Email
                            </a>
                            <Link
                              href="/suppliers/approved-retailers"
                              className="text-center bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                              Open Contacts
                            </Link>
                          </div>
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
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/suppliers/applications">
            <div className="bg-blue-900 border border-blue-700 rounded-lg p-4 cursor-pointer hover:bg-blue-800 transition-colors">
              <p className="text-blue-100 font-semibold">Manage Application Templates</p>
              <p className="text-blue-300 text-sm mt-1">Create custom forms for retailers</p>
            </div>
          </Link>

          <Link href="/suppliers">
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
