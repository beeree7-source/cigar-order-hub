'use client';

import Link from 'next/link';

export default function RetailerAccountingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/retailers" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
          ← Back to Retailer Dashboard
        </Link>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 mt-2">
          <h1 className="text-3xl font-bold text-white mb-3">Accounting Suite Temporarily Disabled</h1>
          <p className="text-gray-300 mb-6">
            Accounting Hub features are paused for now. QuickBooks integration remains active for direct invoice sync/import workflows.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/retailers/quickbooks"
              className="text-center bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Open QuickBooks
            </Link>
            <Link
              href="/retailers"
              className="text-center bg-gray-600 hover:bg-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
