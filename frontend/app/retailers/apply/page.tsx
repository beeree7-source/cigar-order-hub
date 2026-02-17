'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Supplier {
  supplier_id: number;
  supplier_name: string;
  business_name: string;
  supplier_email: string;
  status: 'approved' | 'pending' | 'denied' | 'none';
  has_applications: boolean;
  application_count: number;
  product_count: number;
}

interface License {
  id: number;
  license_number: string;
  license_type: string;
  verified: boolean;
}

interface SupplierApplication {
  id: number;
  application_name: string;
  required_fields: string;
}

export default function ApplyToSuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierApps, setSupplierApps] = useState<SupplierApplication[]>([]);
  const [selectedLicense, setSelectedLicense] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'none' | 'pending' | 'approved' | 'denied'>('all');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    loadData();
  }, [router, token]);

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredSuppliers(suppliers);
    } else {
      setFilteredSuppliers(suppliers.filter(s => s.status === statusFilter));
    }
  }, [statusFilter, suppliers]);

  const loadData = async () => {
    try {
      const [suppliersRes, licensesRes] = await Promise.all([
        fetch('http://localhost:10000/api/retailers/all-suppliers', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('http://localhost:10000/api/retailers/licenses', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (!suppliersRes.ok || !licensesRes.ok) throw new Error('Failed to load data');

      const suppliersData = await suppliersRes.json();
      const licensesData = await licensesRes.json();

      setSuppliers(suppliersData.all_suppliers || []);
      setFilteredSuppliers(suppliersData.all_suppliers || []);
      setLicenses(licensesData.licenses || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSupplier = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData({});
    setError('');
    setSelectedLicense(null);

    // Only load applications if they need to apply
    if (supplier.status === 'none' && supplier.has_applications) {
      try {
        const response = await fetch(`http://localhost:10000/api/suppliers/id/${supplier.supplier_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const supplierAppsRes = await fetch(`http://localhost:10000/api/suppliers/${supplier.supplier_id}/applications`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (supplierAppsRes.ok) {
            const appsData = await supplierAppsRes.json();
            setSupplierApps(appsData.applications || []);
          }
        }
      } catch (err) {
        console.error('Error loading supplier apps:', err);
      }
    }
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSupplier || !token) {
      setError('Please select a supplier first');
      return;
    }

    if (!selectedLicense) {
      setError('Please select a tobacco license');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:10000/api/retailers/applications', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          supplier_id: selectedSupplier.supplier_id,
          supplier_application_id: supplierApps[0]?.id || null,
          application_data: formData,
          license_id: selectedLicense
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to submit application');
      }

      setSuccess(`Application submitted to ${selectedSupplier.supplier_name}! They will review and get back to you.`);
      setSelectedSupplier(null);
      setFormData({});
      setSelectedLicense(null);

      setTimeout(() => {
        loadData();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error submitting application');
    } finally {
      setSubmitting(false);
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
        return 'bg-blue-900 text-blue-100 border-blue-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return '✓ Approved';
      case 'pending':
        return '⏳ Pending';
      case 'denied':
        return '✕ Denied';
      default:
        return '📋 Ready to Apply';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading suppliers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/retailers" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-white">Browse All Suppliers</h1>
          <p className="text-gray-400 mt-2">View all suppliers and manage your applications</p>
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
          {['all', 'none', 'pending', 'approved', 'denied'].map((status) => {
            const count = status === 'all' 
              ? suppliers.length 
              : suppliers.filter(s => s.status === status).length;

            if (count === 0 && status !== 'all') return null;

            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status as any)}
                className={`px-4 py-2 rounded-lg font-semibold capitalize transition-colors ${
                  statusFilter === status
                    ? status === 'all'
                      ? 'bg-blue-600 text-white'
                      : status === 'none'
                      ? 'bg-blue-600 text-white'
                      : status === 'pending'
                      ? 'bg-yellow-600 text-white'
                      : status === 'approved'
                      ? 'bg-green-600 text-white'
                      : 'bg-red-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {status === 'none' ? 'Ready to Apply' : status} ({count})
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Suppliers List */}
          <div className="lg:col-span-2">
            {filteredSuppliers.length === 0 ? (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-2xl font-bold text-white mb-2">No suppliers found</h3>
                <p className="text-gray-400">Try a different filter</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSuppliers.map((supplier) => (
                  <div
                    key={supplier.supplier_id}
                    onClick={() => handleSelectSupplier(supplier)}
                    className={`p-6 rounded-lg border cursor-pointer transition-all ${
                      selectedSupplier?.supplier_id === supplier.supplier_id
                        ? 'bg-blue-900 border-blue-600 ring-2 ring-blue-500'
                        : 'bg-gray-800 border-gray-700 hover:border-blue-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-white">{supplier.supplier_name}</h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(supplier.status)}`}>
                            {getStatusLabel(supplier.status)}
                          </span>
                        </div>
                        <p className="text-gray-400">{supplier.business_name}</p>
                        <p className="text-gray-500 text-sm mt-1">{supplier.supplier_email}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400 mb-2">{supplier.product_count} products</div>
                        {supplier.status === 'approved' && (
                          <div className="text-xs text-green-300 font-semibold">Can order</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Application Form / Details */}
          <div className="lg:col-span-1">
            {selectedSupplier ? (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 sticky top-8">
                <h2 className="text-xl font-bold text-white mb-4">{selectedSupplier.supplier_name}</h2>

                {selectedSupplier.status === 'approved' && (
                  <div className="bg-green-900 border border-green-700 rounded-lg p-4 mb-4">
                    <p className="text-green-100 font-semibold">✓ Approved</p>
                    <p className="text-green-200 text-sm mt-1">You can view prices and place orders with this supplier</p>
                    <Link href="/retailers/approved-suppliers">
                      <button className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        View Supplier Details
                      </button>
                    </Link>
                  </div>
                )}

                {selectedSupplier.status === 'pending' && (
                  <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4 mb-4">
                    <p className="text-yellow-100 font-semibold">⏳ Application Pending</p>
                    <p className="text-yellow-200 text-sm mt-1">Your application is being reviewed</p>
                    <Link href="/retailers/applications">
                      <button className="w-full mt-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        Check Status
                      </button>
                    </Link>
                  </div>
                )}

                {selectedSupplier.status === 'denied' && (
                  <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-4">
                    <p className="text-red-100 font-semibold">✕ Application Denied</p>
                    <p className="text-red-200 text-sm mt-1">Your application was not approved</p>
                    <Link href="/retailers/applications">
                      <button className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        View Details
                      </button>
                    </Link>
                  </div>
                )}

                {selectedSupplier.status === 'none' && !selectedSupplier.has_applications && (
                  <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                    <p className="text-gray-200 font-semibold">No Application Required</p>
                    <p className="text-gray-300 text-sm mt-2">This supplier doesn't require an application form to get started ordering.</p>
                  </div>
                )}

                {selectedSupplier.status === 'none' && selectedSupplier.has_applications && (
                  <form onSubmit={handleSubmitApplication} className="space-y-4">
                    {/* License Selection */}
                    <div>
                      <label className="block text-gray-300 font-bold text-sm mb-2">Select License *</label>
                      {licenses.length === 0 ? (
                        <Link href="/retailers/licenses">
                          <button type="button" className="w-full text-blue-400 hover:text-blue-300 py-2 px-3 rounded-lg border border-blue-400 text-sm">
                            Upload License First →
                          </button>
                        </Link>
                      ) : (
                        <select
                          value={selectedLicense || ''}
                          onChange={(e) => setSelectedLicense(Number(e.target.value))}
                          className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                          required
                        >
                          <option value="">Choose a license...</option>
                          {licenses.map((license) => (
                            <option key={license.id} value={license.id}>
                              {license.license_number} {license.verified ? '✓' : '⏳'}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Application Fields */}
                    {supplierApps.length > 0 && (
                      <div>
                        <label className="block text-gray-300 font-bold text-sm mb-2">Application Fields</label>
                        {supplierApps[0]?.required_fields?.split(' ').map((field) => (
                          <input
                            key={field}
                            type="text"
                            value={formData[field] || ''}
                            onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                            placeholder={field}
                            className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg mb-2 focus:outline-none focus:border-blue-500 text-sm"
                            required
                          />
                        ))}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting || !selectedLicense}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                      {submitting ? 'Submitting...' : 'Apply Now'}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 text-center sticky top-8">
                <div className="text-4xl mb-3">👈</div>
                <p className="text-gray-300 font-semibold">Select a supplier to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
