'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ApprovedSupplier {
  supplier_id: number;
  supplier_name: string;
  supplier_email: string;
  business_name: string;
  credit_limit: number;
  payment_terms: string;
  approved_at: string;
  product_count: number;
}

export default function ApprovedSuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<ApprovedSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    loadSuppliers(token);
  }, [router]);

  const loadSuppliers = async (token: string) => {
    try {
      const response = await fetch('http://localhost:10000/api/retailers/approved-suppliers', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to load suppliers');

      const data = await response.json();
      setSuppliers(data.approved_suppliers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading suppliers');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading approved suppliers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/retailers" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold text-white">Approved Suppliers</h1>
            <p className="text-gray-400 mt-2">Suppliers you can order from</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {suppliers.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-2xl font-bold text-white mb-2">No Approved Suppliers Yet</h3>
            <p className="text-gray-400 mb-6">Start applying to suppliers to build your network</p>
            <Link href="/retailers/apply">
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                Apply to Suppliers
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {suppliers.map((supplier) => (
              <div key={supplier.supplier_id} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-blue-500 transition-colors">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{supplier.supplier_name}</h2>
                      <p className="text-gray-400">{supplier.business_name}</p>
                      <p className="text-gray-500 text-sm">{supplier.supplier_email}</p>
                    </div>
                    <div className="text-right">
                      <div className="bg-green-900 text-green-100 px-3 py-1 rounded-full text-sm font-semibold">
                        ✓ Approved
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 my-6 pb-6 border-b border-gray-700">
                    <div>
                      <p className="text-gray-500 text-sm">Credit Limit</p>
                      <p className="text-xl font-bold text-white">${supplier.credit_limit.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">Payment Terms</p>
                      <p className="text-xl font-bold text-white">{supplier.payment_terms}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">Products Available</p>
                      <p className="text-xl font-bold text-white">{supplier.product_count}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm">Approved Since</p>
                      <p className="text-xl font-bold text-white">{new Date(supplier.approved_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Link href={`/retailers/catalog-pricelist?supplierId=${supplier.supplier_id}`} className="flex-1">
                      <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        View Products
                      </button>
                    </Link>
                    <Link href={`/retailers/approved-sales-reps?supplierId=${supplier.supplier_id}`} className="flex-1">
                      <button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        Contact Rep
                      </button>
                    </Link>
                    <button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                      Place Order
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link href="/retailers/approved-sales-reps">
            <div className="bg-teal-900 border border-teal-700 rounded-lg p-4 cursor-pointer hover:bg-teal-800 transition-colors">
              <p className="text-teal-100 font-semibold">Approved Sales Reps</p>
              <p className="text-teal-300 text-sm mt-1">Message or email your rep contacts</p>
            </div>
          </Link>

          <Link href="/retailers/apply">
            <div className="bg-blue-900 border border-blue-700 rounded-lg p-4 cursor-pointer hover:bg-blue-800 transition-colors">
              <p className="text-blue-100 font-semibold">Apply to More Suppliers</p>
              <p className="text-blue-300 text-sm mt-1">Find new business partners</p>
            </div>
          </Link>

          <Link href="/retailers/applications">
            <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4 cursor-pointer hover:bg-yellow-800 transition-colors">
              <p className="text-yellow-100 font-semibold">View Applications</p>
              <p className="text-yellow-300 text-sm mt-1">Check application status</p>
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
