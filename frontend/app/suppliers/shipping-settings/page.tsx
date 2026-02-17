'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ShippingAccount {
  id: number;
  carrier: 'UPS' | 'USPS';
  status: 'active' | 'pending_verification' | 'inactive' | 'expired';
  account_number_masked: string;
  last_verified: string | null;
  connected_at: string;
  meter_number?: string;
}

interface ApiResponse {
  supplier_id: number;
  accounts: ShippingAccount[];
  total: number;
  active_carriers: string[];
}

export default function SupplierShippingSettingsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<ShippingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [supplierId, setSupplierId] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    carrier: 'UPS' as 'UPS' | 'USPS',
    account_number: '',
    password: '',
    meter_number: '',
    api_key: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        if (!token || !userStr) {
          router.push('/login');
          return;
        }

        const user = JSON.parse(userStr);
        setSupplierId(user.id);

        const response = await fetch(
          `http://localhost:10000/api/suppliers/${user.id}/shipping/accounts`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch shipping accounts');
        }

        const data: ApiResponse = await response.json();
        setAccounts(data.accounts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load accounts');
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [router]);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token || !supplierId) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        `http://localhost:10000/api/suppliers/${supplierId}/shipping/account`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            carrier: formData.carrier,
            account_number: formData.account_number,
            password: formData.password,
            meter_number: formData.meter_number || undefined,
            api_key: formData.api_key
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add account');
      }

      // Refresh accounts list
      const listResponse = await fetch(
        `http://localhost:10000/api/suppliers/${supplierId}/shipping/accounts`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (listResponse.ok) {
        const data: ApiResponse = await listResponse.json();
        setAccounts(data.accounts);
      }

      // Reset form
      setFormData({
        carrier: 'UPS',
        account_number: '',
        password: '',
        meter_number: '',
        api_key: ''
      });
      setShowAddForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAccount = async (accountId: number) => {
    if (!window.confirm('Are you sure you want to delete this account?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token || !supplierId) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        `http://localhost:10000/api/suppliers/${supplierId}/shipping/account/${accountId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account');
      }

      setAccounts(accounts.filter(a => a.id !== accountId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-900';
      case 'pending_verification':
        return 'bg-yellow-100 text-yellow-900';
      case 'inactive':
        return 'bg-red-100 text-red-900';
      case 'expired':
        return 'bg-orange-100 text-orange-900';
      default:
        return 'bg-gray-100 text-gray-900';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/suppliers"
            className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Shipping Account Settings</h1>
          <p className="text-gray-600 mt-2">Manage your UPS and USPS shipping accounts</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-4">Loading shipping accounts...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Current Accounts */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Connected Accounts</h2>
              
              {accounts.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <p className="text-gray-600 mb-4">No shipping accounts connected yet</p>
                  <p className="text-sm text-gray-500">Add your first shipping account to start generating labels</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {accounts.map((account) => (
                    <div 
                      key={account.id}
                      className="bg-white rounded-lg shadow p-6 border-l-4"
                      style={{
                        borderLeftColor: account.carrier === 'UPS' ? '#ffb81c' : '#003c71'
                      }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {account.carrier}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {account.account_number_masked}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(account.status)}`}>
                          {account.status === 'pending_verification' ? 'Pending' : 
                           account.status === 'active' ? 'Active' :
                           account.status === 'inactive' ? 'Inactive' : 'Expired'}
                        </span>
                      </div>

                      {account.meter_number && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-600">Meter Number</p>
                          <p className="text-sm font-mono text-gray-900">{account.meter_number}</p>
                        </div>
                      )}

                      <div className="mb-4">
                        <p className="text-xs text-gray-600">Connected</p>
                        <p className="text-sm text-gray-900">
                          {new Date(account.connected_at).toLocaleDateString()}
                        </p>
                      </div>

                      {account.last_verified && (
                        <div className="mb-4">
                          <p className="text-xs text-gray-600">Last Verified</p>
                          <p className="text-sm text-gray-900">
                            {new Date(account.last_verified).toLocaleDateString()}
                          </p>
                        </div>
                      )}

                      {account.status === 'pending_verification' && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                          <p className="text-xs text-yellow-800">
                            ℹ️ Account awaiting verification. An admin will verify your credentials shortly.
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteAccount(account.id)}
                          className="flex-1 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition text-sm font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Account */}
            <div>
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  + Add New Shipping Account
                </button>
              )}

              {showAddForm && (
                <div className="bg-white rounded-lg shadow p-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">Add Shipping Account</h3>
                  
                  <form onSubmit={handleAddAccount} className="space-y-6">
                    {/* Carrier Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Carrier *
                      </label>
                      <select
                        value={formData.carrier}
                        onChange={(e) => setFormData({ ...formData, carrier: e.target.value as 'UPS' | 'USPS' })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="UPS">UPS</option>
                        <option value="USPS">USPS</option>
                      </select>
                    </div>

                    {/* Account Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Number *
                      </label>
                      <input
                        type="text"
                        value={formData.account_number}
                        onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                        placeholder={formData.carrier === 'UPS' ? '1Z...' : 'Account #'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password *
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    {/* Meter Number (UPS only) */}
                    {formData.carrier === 'UPS' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Meter Number
                        </label>
                        <input
                          type="text"
                          value={formData.meter_number}
                          onChange={(e) => setFormData({ ...formData, meter_number: e.target.value })}
                          placeholder="Optional"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    {/* API Key */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        API Key *
                      </label>
                      <input
                        type="password"
                        value={formData.api_key}
                        onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-50 border border-blue-200 rounded p-4">
                      <p className="text-sm text-blue-800">
                        <strong>ℹ️ About credentials:</strong> Your account credentials will be securely encrypted and stored. They will only be used for generating shipping labels with {formData.carrier}.
                      </p>
                    </div>

                    {/* Form Actions */}
                    <div className="flex gap-4">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                      >
                        {submitting ? 'Adding Account...' : 'Add Account'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="flex-1 px-6 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Help Section */}
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">How it works</h3>
              <ol className="space-y-3 text-blue-900 text-sm">
                <li className="flex">
                  <span className="font-bold mr-3">1.</span>
                  <span>Add your UPS or USPS account credentials securely</span>
                </li>
                <li className="flex">
                  <span className="font-bold mr-3">2.</span>
                  <span>An admin will verify your account and activate it</span>
                </li>
                <li className="flex">
                  <span className="font-bold mr-3">3.</span>
                  <span>When warehouse marks an order as "ready to ship", shipping labels are automatically generated</span>
                </li>
                <li className="flex">
                  <span className="font-bold mr-3">4.</span>
                  <span>Warehouse staff prints labels from the print queue</span>
                </li>
                <li className="flex">
                  <span className="font-bold mr-3">5.</span>
                  <span>Carrier collects packages with tracking numbers</span>
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
