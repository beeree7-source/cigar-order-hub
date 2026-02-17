'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface License {
  id: number;
  license_number: string;
  license_type: string;
  issue_date: string;
  expiration_date: string;
  verified: boolean;
  verified_by: number | null;
  verified_at: string | null;
  file_name: string;
}

export default function LicensesPage() {
  const router = useRouter();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [formData, setFormData] = useState({
    license_number: '',
    license_type: 'tobacco',
    issue_date: '',
    expiration_date: '',
    file_name: 'tobacco_license.pdf'
  });
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    loadLicenses();
  }, [router, token]);

  const loadLicenses = async () => {
    try {
      const response = await fetch('http://localhost:10000/api/retailers/licenses', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to load licenses');

      const data = await response.json();
      setLicenses(data.licenses || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading licenses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:10000/api/retailers/licenses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to upload license');
      }

      setSuccess('License uploaded successfully!');
      setFormData({
        license_number: '',
        license_type: 'tobacco',
        issue_date: '',
        expiration_date: '',
        file_name: 'tobacco_license.pdf'
      });
      setShowUploadForm(false);
      await loadLicenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error uploading license');
    } finally {
      setUploading(false);
    }
  };

  const isExpired = (expirationDate: string) => {
    return new Date(expirationDate) < new Date();
  };

  const daysUntilExpiration = (expirationDate: string) => {
    const today = new Date();
    const expiration = new Date(expirationDate);
    const diffTime = expiration.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading licenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/retailers" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold text-white">Tobacco Licenses</h1>
            <p className="text-gray-400 mt-2">Manage your tobacco licenses for supplier applications</p>
          </div>
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            {showUploadForm ? '✕ Cancel' : '+ Upload License'}
          </button>
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

        {/* Upload Form */}
        {showUploadForm && (
          <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg border border-gray-700 p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Upload New License</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-300 font-semibold mb-2">License Number *</label>
                <input
                  type="text"
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  placeholder="e.g., TX-2025-12345"
                  className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-2">License Type *</label>
                <select
                  value={formData.license_type}
                  onChange={(e) => setFormData({ ...formData, license_type: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="tobacco">Tobacco Retailer</option>
                  <option value="wholesale">Wholesale</option>
                  <option value="special">Special Tobacco</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-2">Issue Date *</label>
                <input
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-2">Expiration Date *</label>
                <input
                  type="date"
                  value={formData.expiration_date}
                  onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="mt-6 w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              {uploading ? 'Uploading...' : 'Upload License'}
            </button>
          </form>
        )}

        {/* Licenses List */}
        {licenses.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-2xl font-bold text-white mb-2">No Licenses Yet</h3>
            <p className="text-gray-400 mb-6">Upload your tobacco license to apply for suppliers</p>
            <button
              onClick={() => setShowUploadForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Upload Your First License
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {licenses.map((license) => {
              const expired = isExpired(license.expiration_date);
              const daysLeft = daysUntilExpiration(license.expiration_date);

              return (
                <div
                  key={license.id}
                  className={`rounded-lg border p-6 transition-colors ${
                    expired
                      ? 'bg-red-900 border-red-700'
                      : daysLeft < 30
                      ? 'bg-yellow-900 border-yellow-700'
                      : 'bg-gray-800 border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-white">{license.license_number}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            license.verified
                              ? 'bg-green-900 text-green-100'
                              : 'bg-yellow-900 text-yellow-100'
                          }`}
                        >
                          {license.verified ? '✓ Verified' : '⏳ Pending Verification'}
                        </span>
                        {expired && (
                          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-700 text-red-100">
                            ⚠ Expired
                          </span>
                        )}
                        {!expired && daysLeft < 30 && daysLeft > 0 && (
                          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-yellow-700 text-yellow-100">
                            ⚠ Expires in {daysLeft} days
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm mt-2 capitalize">{license.license_type} License</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-600">
                    <div>
                      <p className="text-gray-400 text-sm">Issue Date</p>
                      <p className="text-white font-semibold">{new Date(license.issue_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Expiration Date</p>
                      <p className="text-white font-semibold">{new Date(license.expiration_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">File</p>
                      <p className="text-white font-semibold text-sm truncate">{license.file_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Status</p>
                      <p className="text-white font-semibold">
                        {license.verified ? 'Verified' : 'Under Review'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/retailers/apply">
            <div className="bg-blue-900 border border-blue-700 rounded-lg p-4 cursor-pointer hover:bg-blue-800 transition-colors">
              <p className="text-blue-100 font-semibold">Apply to Suppliers</p>
              <p className="text-blue-300 text-sm mt-1">Use your license to apply</p>
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
