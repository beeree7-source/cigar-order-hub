'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ApprovedSalesRep {
  sales_rep_id: number;
  user_id: number;
  supplier_id: number;
  name: string;
  email: string;
  business_name: string | null;
  employee_id: string;
  territory: string;
  status: string;
  authorization_type: string;
  source: string;
}

export default function ApprovedSalesRepsPage() {
  const router = useRouter();
  const [salesReps, setSalesReps] = useState<ApprovedSalesRep[]>([]);
  const [supplierFilter, setSupplierFilter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const requestedSupplier = typeof window !== 'undefined'
      ? Number.parseInt(new URLSearchParams(window.location.search).get('supplierId') || '', 10)
      : Number.NaN;
    if (Number.isFinite(requestedSupplier)) {
      setSupplierFilter(requestedSupplier);
    }

    loadSalesReps(token);
  }, [router]);

  const loadSalesReps = async (token: string) => {
    try {
      const response = await fetch('http://localhost:10000/api/retailers/approved-sales-reps', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to load approved sales reps');
      }

      const data = await response.json();
      setSalesReps(data.approved_sales_reps || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading approved sales reps');
    } finally {
      setLoading(false);
    }
  };

  const filteredSalesReps = supplierFilter
    ? salesReps.filter(rep => rep.supplier_id === supplierFilter)
    : salesReps;

  const filteredSupplierName = supplierFilter
    ? salesReps.find(rep => rep.supplier_id === supplierFilter)?.business_name || null
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading approved sales reps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/retailers" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold text-white">Approved Sales Reps</h1>
            <p className="text-gray-400 mt-2">
              {filteredSupplierName
                ? `Showing reps for ${filteredSupplierName}`
                : 'Contact reps assigned to your approved supplier accounts'}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {filteredSalesReps.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
            <div className="text-6xl mb-4">📇</div>
            <h3 className="text-2xl font-bold text-white mb-2">No Approved Sales Reps Yet</h3>
            <p className="text-gray-400 mb-6">
              {supplierFilter
                ? 'No reps are available for this supplier yet.'
                : 'Once suppliers are approved and reps are assigned, contacts will appear here.'}
            </p>
            <Link href="/retailers/approved-suppliers">
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                View Approved Suppliers
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredSalesReps.map((rep) => (
              <div key={rep.sales_rep_id} className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-teal-500 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{rep.name}</h2>
                    <p className="text-gray-400">{rep.business_name || 'Supplier Representative'}</p>
                    <p className="text-gray-500 text-sm">{rep.email}</p>
                  </div>
                  <div className="bg-green-900 text-green-100 px-3 py-1 rounded-full text-sm font-semibold">
                    ✓ Approved
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 my-5 pb-5 border-b border-gray-700">
                  <div>
                    <p className="text-gray-500 text-sm">Employee ID</p>
                    <p className="text-white font-semibold">{rep.employee_id}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Territory</p>
                    <p className="text-white font-semibold">{rep.territory}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <a
                    href={`/messages?contactId=${rep.user_id}`}
                    className="text-center bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-3 rounded-lg transition-colors"
                  >
                    Message
                  </a>
                  <a
                    href={`mailto:${rep.email}`}
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
