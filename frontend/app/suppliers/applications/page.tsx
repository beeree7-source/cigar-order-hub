'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SupplierApplication {
  id: number;
  application_name: string;
  description: string;
  required_fields: string;
  is_required: boolean;
  created_at: string;
}

export default function SupplierApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<SupplierApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    application_name: '',
    description: '',
    required_fields: '',
    is_required: true
  });
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    loadApplications();
  }, [router, token]);

  const loadApplications = async () => {
    try {
      const response = await fetch('http://localhost:10000/api/suppliers/applications', {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const fields = formData.required_fields
        .split(',')
        .map(f => f.trim())
        .filter(f => f);

      if (fields.length === 0) {
        throw new Error('Please specify at least one required field');
      }

      const response = await fetch('http://localhost:10000/api/suppliers/applications', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          application_name: formData.application_name,
          description: formData.description,
          required_fields: fields.join(' '),
          is_required: formData.is_required
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create application template');
      }

      setSuccess('Application template created successfully!');
      setFormData({
        application_name: '',
        description: '',
        required_fields: '',
        is_required: true
      });
      setShowNewForm(false);
      await loadApplications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating application template');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading application templates...</p>
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
            <Link href="/suppliers" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold text-white">Application Templates</h1>
            <p className="text-gray-400 mt-2">Create custom application forms for retailers</p>
          </div>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            {showNewForm ? '✕ Cancel' : '+ New Template'}
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

        {/* New Template Form */}
        {showNewForm && (
          <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg border border-gray-700 p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Create New Application Template</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-gray-300 font-semibold mb-2">Template Name *</label>
                <input
                  type="text"
                  value={formData.application_name}
                  onChange={(e) => setFormData({ ...formData, application_name: e.target.value })}
                  placeholder="e.g., Premium Retailer Application"
                  className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what information this application collects..."
                  className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 h-24 resize-none"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-2">Required Fields *</label>
                <textarea
                  value={formData.required_fields}
                  onChange={(e) => setFormData({ ...formData, required_fields: e.target.value })}
                  placeholder="Enter field names separated by commas (e.g., business_name, address, tax_id, bank_info, references)"
                  className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 h-24 resize-none"
                  required
                />
                <p className="text-gray-400 text-sm mt-2">
                  Separate each field with a comma. Example: business_name, address, tax_id, bank_info, references
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_required}
                  onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                  className="mr-3 h-4 w-4"
                />
                <label className="text-gray-300 font-semibold">Make this application required for all retailers</label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                {submitting ? 'Creating...' : 'Create Template'}
              </button>
            </div>
          </form>
        )}

        {/* Application Templates List */}
        {applications.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-2xl font-bold text-white mb-2">No Application Templates Yet</h3>
            <p className="text-gray-400 mb-6">Create a custom application form for retailers to fill out</p>
            <button
              onClick={() => setShowNewForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Create Your First Template
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-blue-500 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-white">{app.application_name}</h3>
                      {app.is_required && (
                        <span className="px-2 py-1 bg-blue-900 text-blue-100 text-xs font-semibold rounded">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 mt-2">{app.description}</p>

                    <div className="mt-4">
                      <p className="text-gray-400 text-sm mb-2"><strong>Required Fields:</strong></p>
                      <div className="flex flex-wrap gap-2">
                        {app.required_fields.split(' ').map((field, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-gray-700 text-gray-200 text-sm rounded-full capitalize"
                          >
                            {field.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>

                    <p className="text-gray-500 text-sm mt-4">
                      Created {new Date(app.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-700 flex gap-3">
                  <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                    Edit Template
                  </button>
                  <button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                    View Applications
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/suppliers/retailer-applications">
            <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4 cursor-pointer hover:bg-yellow-800 transition-colors">
              <p className="text-yellow-100 font-semibold">Review Applications</p>
              <p className="text-yellow-300 text-sm mt-1">Approve or deny retailer applications</p>
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
