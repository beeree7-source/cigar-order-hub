'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ApprovedRetailer {
  retailer_id: number;
  retailer_name: string;
  retailer_email: string;
  business_name: string | null;
  approved_at: string;
  credit_limit: number;
  payment_terms: string;
}

export default function ApprovedRetailersPage() {
  const router = useRouter();
  const [retailers, setRetailers] = useState<ApprovedRetailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');

    if (!token || !userRaw) {
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(userRaw);
      if (user.role !== 'supplier') {
        router.push('/');
        return;
      }
    } catch {
      router.push('/login');
      return;
    }

    loadRetailers(token);
  }, [router]);

  const loadRetailers = async (token: string) => {
    try {
      const response = await fetch('http://localhost:10000/api/suppliers/approved-retailers', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to load approved retailers');
      }

      const data = await response.json();
      setRetailers(data.approved_retailers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading approved retailers');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading approved retailers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/suppliers" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold text-white">Approved Retailers</h1>
            <p className="text-gray-400 mt-2">Contact approved retailer accounts quickly</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {retailers.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-2xl font-bold text-white mb-2">No Approved Retailers Yet</h3>
            <p className="text-gray-400 mb-6">Approve retailer applications to build your contact list.</p>
            <Link href="/suppliers/retailer-applications">
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                Review Applications
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {retailers.map((retailer) => (
              <div key={retailer.retailer_id} className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-teal-500 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{retailer.retailer_name}</h2>
                    <p className="text-gray-400">{retailer.business_name || 'Retailer Account'}</p>
                    <p className="text-gray-500 text-sm">{retailer.retailer_email}</p>
                  </div>
                  <div className="bg-green-900 text-green-100 px-3 py-1 rounded-full text-sm font-semibold">
                    ✓ Approved
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 my-5 pb-5 border-b border-gray-700">
                  <div>
                    <p className="text-gray-500 text-sm">Credit Limit</p>
                    <p className="text-white font-semibold">${retailer.credit_limit.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Payment Terms</p>
                    <p className="text-white font-semibold">{retailer.payment_terms}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <a
                    href={`/messages?contactId=${retailer.retailer_id}`}
                    className="text-center bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-3 rounded-lg transition-colors"
                  >
                    Message
                  </a>
                  <a
                    href={`mailto:${retailer.retailer_email}`}
                    className="text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg transition-colors"
                  >
                    Email
                  </a>
                  <Link
                    href="/messages"
                    className="text-center bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-3 rounded-lg transition-colors"
                  >
                    Open Chat
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
