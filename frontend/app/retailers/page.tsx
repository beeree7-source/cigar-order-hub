'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface RetailerDashboard {
  approvedCount: number;
  pendingApplications: number;
  licenses: number;
}

export default function RetailerDashboard() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<RetailerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      router.push('/login');
      return;
    }

    const userObj = JSON.parse(userData);
    if (userObj.role !== 'retailer') {
      router.push('/');
      return;
    }

    setUser(userObj);
    loadDashboard(token);
  }, [router]);

  const loadDashboard = async (token: string) => {
    try {
      const [approvedRes, applicationsRes, licensesRes] = await Promise.all([
        fetch('http://localhost:10000/api/retailers/approved-suppliers', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('http://localhost:10000/api/retailers/applications', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('http://localhost:10000/api/retailers/licenses', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const approved = await approvedRes.json();
      const applications = await applicationsRes.json();
      const licenses = await licensesRes.json();

      setDashboard({
        approvedCount: approved.count || 0,
        pendingApplications: applications.applications?.filter((a: any) => a.status === 'pending').length || 0,
        licenses: licenses.count || 0
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Retailer Management</h1>
            <p className="text-gray-400">Welcome back, {user?.name || 'Retailer'}!</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/messages"
              title="Open Messages"
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
            >
              Messages
            </Link>
            <Link
              href="/messages?scope=team"
              title="Message Employees"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
            >
              Employees
            </Link>
            <Link
              href="/retailers/approved-sales-reps"
              title="View Approved Sales Reps"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
            >
              Sales Reps
            </Link>
            <Link
              href="/retailers/quickbooks"
              title="Open QuickBooks"
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
            >
              QuickBooks
            </Link>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Link href="/retailers/approved-suppliers">
            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="text-green-100 text-sm font-semibold mb-2">APPROVED SUPPLIERS</div>
              <div className="text-4xl font-bold text-white">{dashboard?.approvedCount || 0}</div>
              <p className="text-green-200 text-sm mt-2">Ready to order</p>
            </div>
          </Link>

          <Link href="/retailers/applications">
            <div className="bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="text-yellow-100 text-sm font-semibold mb-2">PENDING APPLICATIONS</div>
              <div className="text-4xl font-bold text-white">{dashboard?.pendingApplications || 0}</div>
              <p className="text-yellow-200 text-sm mt-2">Under review</p>
            </div>
          </Link>

          <Link href="/retailers/licenses">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="text-blue-100 text-sm font-semibold mb-2">LICENSES</div>
              <div className="text-4xl font-bold text-white">{dashboard?.licenses || 0}</div>
              <p className="text-blue-200 text-sm mt-2">Active licenses</p>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-11 gap-4">
            <Link href="/retailers/apply">
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition-colors">
                Apply to New Supplier →
              </button>
            </Link>
            <Link href="/retailers/licenses">
              <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-lg transition-colors">
                Manage Licenses →
              </button>
            </Link>
            <Link href="/employees">
              <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-lg transition-colors">
                Manage Employees & Roles →
              </button>
            </Link>
            <Link href="/messages?scope=team">
              <button className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 px-6 rounded-lg transition-colors">
                Message Employees →
              </button>
            </Link>
            <Link href="/retailers/subscription">
              <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-lg transition-colors">
                View SaaS Plans →
              </button>
            </Link>
            <Link href="/retailers/quickbooks">
              <button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-4 px-6 rounded-lg transition-colors">
                QuickBooks Sync →
              </button>
            </Link>
            <Link href="/retailers/inventory-import">
              <button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-6 rounded-lg transition-colors">
                Import Inventory →
              </button>
            </Link>
            <Link href="/retailers/inventory-import?template=csv">
              <button className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 px-6 rounded-lg transition-colors">
                Import + Sample →
              </button>
            </Link>
            <Link href="/retailers/inventory-import?template=xlsx">
              <button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-4 px-6 rounded-lg transition-colors">
                Import + Excel →
              </button>
            </Link>
            <Link href="/retailers/catalog-pricelist">
              <button className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-4 px-6 rounded-lg transition-colors">
                Supplier Pricelists →
              </button>
            </Link>
            <Link href="/retailers/approved-sales-reps">
              <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-lg transition-colors">
                Contact Sales Reps →
              </button>
            </Link>
          </div>
        </div>

        {/* Information Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">How it Works</h3>
            <ol className="space-y-2 text-gray-300 text-sm">
              <li className="flex items-start">
                <span className="text-blue-400 font-bold mr-3">1.</span>
                <span>Upload your tobacco license</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 font-bold mr-3">2.</span>
                <span>View available suppliers accepting applications</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 font-bold mr-3">3.</span>
                <span>Submit application with required information</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 font-bold mr-3">4.</span>
                <span>Wait for supplier to review and approve</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 font-bold mr-3">5.</span>
                <span>Start placing orders with approved suppliers</span>
              </li>
            </ol>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">Requirements</h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                <span>Valid tobacco license</span>
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                <span>Business information</span>
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                <span>Tax ID</span>
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                <span>Bank information</span>
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                <span>Business references</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
