'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SupplierDashboard {
  pendingApplications: number;
  approvedRetailers: number;
  applicationTemplates: number;
  pendingLicenseVerifications: number;
}

export default function SupplierDashboard() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<SupplierDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    const userData = localStorage.getItem('user');
    
    if (!userData || !token) {
      router.push('/login');
      return;
    }

    const userObj = JSON.parse(userData);
    if (userObj.role !== 'supplier') {
      router.push('/');
      return;
    }

    setUser(userObj);
    loadDashboard();
  }, [router, token]);

  const loadDashboard = async () => {
    try {
      const [appsRes, appTemplatesRes] = await Promise.all([
        fetch('http://localhost:10000/api/suppliers/retailer-applications?status=pending', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('http://localhost:10000/api/suppliers/applications', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const apps = await appsRes.json();
      const templates = await appTemplatesRes.json();

      setDashboard({
        pendingApplications: apps.count || 0,
        approvedRetailers: 0, // Would need additional API endpoint
        applicationTemplates: templates.count || 0,
        pendingLicenseVerifications: 0 // Would need additional API endpoint
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
            <h1 className="text-4xl font-bold text-white mb-2">Supplier Management</h1>
            <p className="text-gray-400">Welcome back, {user?.name || 'Supplier'}!</p>
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
              href="/suppliers/approved-retailers"
              title="View Approved Retailers"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
            >
              Retailers
            </Link>
            <Link
              href="/suppliers/quickbooks"
              title="Open QuickBooks"
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
            >
              QuickBooks
            </Link>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Link href="/suppliers/retailer-applications">
            <div className="bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="text-yellow-100 text-sm font-semibold mb-2">PENDING APPLICATIONS</div>
              <div className="text-4xl font-bold text-white">{dashboard?.pendingApplications || 0}</div>
              <p className="text-yellow-200 text-sm mt-2">Awaiting review</p>
            </div>
          </Link>

          <Link href="/suppliers/applications">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="text-blue-100 text-sm font-semibold mb-2">APPLICATION TEMPLATES</div>
              <div className="text-4xl font-bold text-white">{dashboard?.applicationTemplates || 0}</div>
              <p className="text-blue-200 text-sm mt-2">Custom forms</p>
            </div>
          </Link>

          <Link href="/suppliers/retailer-applications">
            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="text-green-100 text-sm font-semibold mb-2">APPROVED RETAILERS</div>
              <div className="text-4xl font-bold text-white">{dashboard?.approvedRetailers || 0}</div>
              <p className="text-green-200 text-sm mt-2">Active partners</p>
            </div>
          </Link>

          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-6">
            <div className="text-purple-100 text-sm font-semibold mb-2">LICENSE VERIFICATIONS</div>
            <div className="text-4xl font-bold text-white">{dashboard?.pendingLicenseVerifications || 0}</div>
            <p className="text-purple-200 text-sm mt-2">Pending review</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-11 gap-4">
            <Link href="/suppliers/retailer-applications">
              <button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-4 px-6 rounded-lg transition-colors text-left">
                <p className="font-semibold">Review Applications</p>
                <p className="text-sm opacity-90 mt-1">Approve or deny pending requests →</p>
              </button>
            </Link>
            <Link href="/suppliers/applications">
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition-colors text-left">
                <p className="font-semibold">Manage Templates</p>
                <p className="text-sm opacity-90 mt-1">Create or edit application forms →</p>
              </button>
            </Link>
            <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-lg transition-colors text-left">
              <p className="font-semibold">Verify Licenses</p>
              <p className="text-sm opacity-90 mt-1">Review tobacco licenses →</p>
            </button>
            <Link href="/employees">
              <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-lg transition-colors text-left">
                <p className="font-semibold">Manage Employees</p>
                <p className="text-sm opacity-90 mt-1">Add team members and assign roles →</p>
              </button>
            </Link>
            <Link href="/messages?scope=team">
              <button className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 px-6 rounded-lg transition-colors text-left">
                <p className="font-semibold">Message Employees</p>
                <p className="text-sm opacity-90 mt-1">Start a team conversation in one click →</p>
              </button>
            </Link>
            <Link href="/suppliers/subscription">
              <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-lg transition-colors text-left">
                <p className="font-semibold">Manage SaaS Plan</p>
                <p className="text-sm opacity-90 mt-1">View and change supplier tiers →</p>
              </button>
            </Link>
            <Link href="/suppliers/quickbooks">
              <button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-4 px-6 rounded-lg transition-colors text-left">
                <p className="font-semibold">QuickBooks</p>
                <p className="text-sm opacity-90 mt-1">Connect and sync accounting data →</p>
              </button>
            </Link>
            <Link href="/suppliers/inventory-import">
              <button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-6 rounded-lg transition-colors text-left">
                <p className="font-semibold">Import Inventory</p>
                <p className="text-sm opacity-90 mt-1">CSV, Excel, or AI-assisted PDF →</p>
              </button>
            </Link>
            <Link href="/suppliers/inventory-import?template=csv">
              <button className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 px-6 rounded-lg transition-colors text-left">
                <p className="font-semibold">Import + Sample</p>
                <p className="text-sm opacity-90 mt-1">Open importer and auto-download CSV →</p>
              </button>
            </Link>
            <Link href="/suppliers/inventory-import?template=xlsx">
              <button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-4 px-6 rounded-lg transition-colors text-left">
                <p className="font-semibold">Import + Excel</p>
                <p className="text-sm opacity-90 mt-1">Open importer and auto-download XLSX →</p>
              </button>
            </Link>
            <Link href="/suppliers/catalog-pricelist">
              <button className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-4 px-6 rounded-lg transition-colors text-left">
                <p className="font-semibold">Catalog / Pricelist</p>
                <p className="text-sm opacity-90 mt-1">Import catalog, MSRP, tax & custom columns →</p>
              </button>
            </Link>
            <Link href="/suppliers/approved-retailers">
              <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-lg transition-colors text-left">
                <p className="font-semibold">Contact Retailers</p>
                <p className="text-sm opacity-90 mt-1">Quickly message approved retailer accounts →</p>
              </button>
            </Link>
          </div>
        </div>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">How to Manage Applications</h3>
            <ol className="space-y-2 text-gray-300 text-sm">
              <li className="flex items-start">
                <span className="text-blue-400 font-bold mr-3">1.</span>
                <span>Create application templates for retailers to fill out</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 font-bold mr-3">2.</span>
                <span>Review applications from retailers</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 font-bold mr-3">3.</span>
                <span>Verify tobacco licenses</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 font-bold mr-3">4.</span>
                <span>Approve or deny applications</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 font-bold mr-3">5.</span>
                <span>Set credit limits and payment terms</span>
              </li>
            </ol>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">What You Can Control</h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                <span>Application form requirements</span>
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                <span>Approve/deny retailers</span>
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                <span>License verification</span>
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                <span>Credit limits per retailer</span>
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                <span>Payment terms</span>
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                <span>Employee accounts and job roles</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
