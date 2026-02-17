'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PrintQueueLabel {
  id: number;
  order_id: number;
  label_id: string;
  carrier: 'UPS' | 'USPS';
  tracking_number: string;
  service_type: string;
  label_url: string;
  printer_name: string | null;
  status: 'ready_to_print' | 'printed';
  created_by: number;
  created_at: string;
  printed_at: string | null;
  printed_by: number | null;
  retailer_name: string;
  printer_status: string;
}

interface ApiResponse {
  queue: PrintQueueLabel[];
  total: number;
  ready_to_print: number;
  printed: number;
}

export default function WarehousePrintQueuePage() {
  const router = useRouter();
  const [labels, setLabels] = useState<PrintQueueLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'ready_to_print' | 'printed'>('ready_to_print');
  const [carrier, setCarrier] = useState<'all' | 'UPS' | 'USPS'>('all');

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          router.push('/login');
          return;
        }

        const params = new URLSearchParams();
        if (filter !== 'all') {
          params.append('status', filter);
        }
        if (carrier !== 'all') {
          params.append('carrier', carrier);
        }

        const response = await fetch(
          `http://localhost:10000/api/warehouse/shipping-labels/queue?${params.toString()}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch print queue');
        }

        const data: ApiResponse = await response.json();
        setLabels(data.queue);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load print queue');
      } finally {
        setLoading(false);
      }
    };

    fetchQueue();
  }, [filter, carrier, router]);

  const handleMarkPrinted = async (labelId: number, printerName?: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        `http://localhost:10000/api/warehouse/shipping-labels/${labelId}/printed`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            printer_name: printerName || 'Warehouse Printer'
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark label as printed');
      }

      // Update local state
      setLabels(labels.map(l => 
        l.id === labelId 
          ? { ...l, status: 'printed', printer_status: 'Complete', printed_at: new Date().toISOString() }
          : l
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as printed');
    }
  };

  const handleDownloadLabel = (labelUrl: string) => {
    // In a real app, this would download the PDF
    window.open(labelUrl, '_blank');
  };

  const filteredLabels = labels.filter(l => {
    if (carrier !== 'all' && l.carrier !== carrier) return false;
    if (filter !== 'all' && l.status !== filter) return false;
    return true;
  });

  const getCarrierColor = (carrier: string) => {
    return carrier === 'UPS' 
      ? 'text-yellow-700 bg-yellow-50 border-l-4 border-yellow-400'
      : 'text-blue-700 bg-blue-50 border-l-4 border-blue-400';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/warehouse"
            className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← Back to Warehouse Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Shipping Label Print Queue</h1>
          <p className="text-gray-600 mt-2">Manage and print shipping labels for orders</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium">Ready to Print</p>
              <p className="text-4xl font-bold text-blue-600 mt-2">{labels.filter(l => l.status === 'ready_to_print').length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium">Already Printed</p>
              <p className="text-4xl font-bold text-green-600 mt-2">{labels.filter(l => l.status === 'printed').length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium">Total in Queue</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">{labels.length}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Labels</option>
                <option value="ready_to_print">Ready to Print</option>
                <option value="printed">Already Printed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Carrier
              </label>
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Carriers</option>
                <option value="UPS">UPS</option>
                <option value="USPS">USPS</option>
              </select>
            </div>
          </div>
        </div>

        {/* Labels List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-4">Loading print queue...</p>
          </div>
        ) : filteredLabels.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-2">No labels in queue</p>
            <p className="text-sm text-gray-500">
              {filter === 'ready_to_print' 
                ? 'Waiting for warehouse to mark orders as ready to ship...'
                : 'All labels have been printed!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLabels.map((label) => (
              <div 
                key={label.id}
                className={`rounded-lg shadow p-6 ${getCarrierColor(label.carrier)}`}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Section */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase font-semibold text-gray-600 mb-1">
                        Order #{label.order_id}
                      </p>
                      <p className="text-lg font-mono text-gray-900">{label.tracking_number}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-600">Carrier</p>
                        <p className="font-semibold text-gray-900">
                          {label.carrier}
                          {label.service_type && (
                            <span className="text-xs text-gray-600 ml-1">({label.service_type})</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Retailer</p>
                        <p className="font-semibold text-gray-900">{label.retailer_name}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-600">Generated</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(label.created_at).toLocaleString()}
                      </p>
                    </div>

                    {label.status === 'printed' && label.printed_at && (
                      <div>
                        <p className="text-xs text-gray-600">Printed</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(label.printed_at).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right Section */}
                  <div className="flex flex-col justify-between">
                    {/* Status Badge */}
                    <div>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                        label.status === 'ready_to_print'
                          ? 'bg-yellow-200 text-yellow-900'
                          : 'bg-green-200 text-green-900'
                      }`}>
                        {label.printer_status}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                      {label.status === 'ready_to_print' && (
                        <>
                          <button
                            onClick={() => handleDownloadLabel(label.label_url)}
                            className="flex-1 px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-100 transition text-sm font-medium"
                          >
                            📥 Download PDF
                          </button>
                          <button
                            onClick={() => handleMarkPrinted(label.id)}
                            className="flex-1 px-4 py-2 bg-white text-green-700 border border-green-300 rounded-lg hover:bg-green-50 transition text-sm font-medium"
                          >
                            ✓ Mark Printed
                          </button>
                        </>
                      )}
                      {label.status === 'printed' && (
                        <button
                          onClick={() => handleDownloadLabel(label.label_url)}
                          className="flex-1 px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-100 transition text-sm font-medium"
                        >
                          📥 Reprint
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-12 bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">📋 How to use</h3>
          <ol className="space-y-2 text-blue-900 text-sm">
            <li className="flex">
              <span className="font-bold mr-3">1.</span>
              <span>Filter labels by status and carrier as needed</span>
            </li>
            <li className="flex">
              <span className="font-bold mr-3">2.</span>
              <span>Click <strong>📥 Download PDF</strong> to download the label</span>
            </li>
            <li className="flex">
              <span className="font-bold mr-3">3.</span>
              <span>Print the label on thermal printer or regular paper</span>
            </li>
            <li className="flex">
              <span className="font-bold mr-3">4.</span>
              <span>Apply label to package with correct orientation</span>
            </li>
            <li className="flex">
              <span className="font-bold mr-3">5.</span>
              <span>Click <strong>✓ Mark Printed</strong> to confirm</span>
            </li>
            <li className="flex">
              <span className="font-bold mr-3">6.</span>
              <span>Carrier will pick up package with tracking number</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
