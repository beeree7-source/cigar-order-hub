'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CatalogItem {
  name: string;
  sku: string;
  price: number;
  msrp: number;
  stock: number;
  category: string;
  description: string;
  tax: number;
  importFee: number;
  dynamicFields?: Record<string, string | number>;
}

interface CatalogPreviewResponse {
  availableDynamicColumns: string[];
  preview: CatalogItem[];
  validRows: number;
  totalRows: number;
  skippedRows: number;
}

export default function SupplierCatalogPricelistPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [showMSRP, setShowMSRP] = useState(true);
  const [availableDynamicColumns, setAvailableDynamicColumns] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [previewItems, setPreviewItems] = useState<CatalogItem[]>([]);
  const [summary, setSummary] = useState({ totalRows: 0, validRows: 0, skippedRows: 0 });
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const currentToken = localStorage.getItem('token');

    if (!userData || !currentToken) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (user.role !== 'supplier' && user.role !== 'admin') {
      router.push('/');
    }
  }, [router]);

  const hasPreview = useMemo(() => previewItems.length > 0, [previewItems]);

  const downloadTemplate = async (format: 'csv' | 'xlsx') => {
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      setError('');
      const response = await fetch(`http://localhost:10000/api/supplier-catalog/pricelist/template.${format}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to download catalog template');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `supplier-catalog-pricelist-template.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download catalog template');
    }
  };

  const toggleColumn = (column: string) => {
    setSelectedColumns((prev) =>
      prev.includes(column) ? prev.filter((value) => value !== column) : [...prev, column]
    );
  };

  const handlePreview = async () => {
    if (!file) {
      setError('Choose a catalog/pricelist file first.');
      return;
    }

    if (!token) {
      router.push('/login');
      return;
    }

    try {
      setLoadingPreview(true);
      setError('');
      setMessage('');

      const formData = new FormData();
      formData.append('catalogFile', file);

      const response = await fetch('http://localhost:10000/api/supplier-catalog/pricelist/preview', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data: CatalogPreviewResponse & { error?: string } = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to preview catalog/pricelist');
      }

      setAvailableDynamicColumns(data.availableDynamicColumns || []);
      setSelectedColumns(data.availableDynamicColumns || []);
      setPreviewItems(data.preview || []);
      setSummary({
        totalRows: data.totalRows || 0,
        validRows: data.validRows || 0,
        skippedRows: data.skippedRows || 0
      });
      setMessage('Preview ready. Choose MSRP/custom columns and save the catalog.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview catalog/pricelist');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSaveCatalog = async () => {
    if (!token) {
      router.push('/login');
      return;
    }

    if (!previewItems.length) {
      setError('Preview a file before saving catalog/pricelist.');
      return;
    }

    try {
      setLoadingSave(true);
      setError('');
      setMessage('');

      const response = await fetch('http://localhost:10000/api/supplier-catalog/pricelist/commit', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: previewItems,
          showMSRP,
          selectedColumns
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save catalog/pricelist');
      }

      setMessage('Catalog/pricelist saved successfully. Retailers will see selected columns and MSRP setting.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save catalog/pricelist');
    } finally {
      setLoadingSave(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Catalog / Pricelist Import</h1>
            <p className="text-gray-400">Upload CSV, Excel, or AI-assisted PDF and control what retailers can see.</p>
          </div>
          <Link href="/suppliers" className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors">
            Back to Dashboard
          </Link>
        </div>

        {error && <div className="mb-6 bg-red-900/40 border border-red-700 text-red-200 rounded-lg p-4">{error}</div>}
        {message && <div className="mb-6 bg-green-900/40 border border-green-700 text-green-200 rounded-lg p-4">{message}</div>}

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <button
              onClick={() => downloadTemplate('csv')}
              className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold py-2 px-3 rounded-lg"
            >
              Download Catalog CSV Template
            </button>
            <button
              onClick={() => downloadTemplate('xlsx')}
              className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold py-2 px-3 rounded-lg"
            >
              Download Catalog Excel Template
            </button>
          </div>
          <div className="grid md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-300 mb-2">Upload catalog/pricelist file</label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2"
              />
            </div>
            <button
              onClick={handlePreview}
              disabled={loadingPreview}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-60"
            >
              {loadingPreview ? 'Parsing...' : 'Preview Catalog'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-3">Supported: CSV, XLS/XLSX, PDF (AI-assisted extraction).</p>
        </div>

        {hasPreview && (
          <>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Visibility Settings</h2>

              <div className="mb-4 flex items-center gap-3">
                <input
                  id="show-msrp"
                  type="checkbox"
                  checked={showMSRP}
                  onChange={(e) => setShowMSRP(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="show-msrp" className="text-gray-300">
                  Show MSRP to retailers
                </label>
              </div>

              <div>
                <p className="text-sm text-gray-300 mb-2">Extra columns to show retailers (tax/import fees/custom fields)</p>
                <div className="flex flex-wrap gap-3">
                  {availableDynamicColumns.length === 0 ? (
                    <span className="text-sm text-gray-500">No extra columns detected.</span>
                  ) : (
                    availableDynamicColumns.map((column) => (
                      <label key={column} className="inline-flex items-center gap-2 bg-gray-900 border border-gray-700 px-3 py-2 rounded-lg text-sm text-gray-200">
                        <input
                          type="checkbox"
                          checked={selectedColumns.includes(column)}
                          onChange={() => toggleColumn(column)}
                        />
                        {column}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-5 text-sm text-gray-300">
                Rows: {summary.totalRows} | Valid: {summary.validRows} | Skipped: {summary.skippedRows}
              </div>

              <button
                onClick={handleSaveCatalog}
                disabled={loadingSave}
                className="mt-5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-60"
              >
                {loadingSave ? 'Saving...' : 'Save Catalog / Pricelist'}
              </button>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Preview</h2>
              <div className="overflow-auto">
                <table className="w-full text-sm text-left text-gray-300">
                  <thead className="text-xs uppercase bg-gray-900 text-gray-400">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">SKU</th>
                      <th className="px-3 py-2">Price</th>
                      <th className="px-3 py-2">MSRP</th>
                      <th className="px-3 py-2">Tax</th>
                      <th className="px-3 py-2">Import Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewItems.map((item, index) => (
                      <tr key={`${item.sku}-${index}`} className="border-t border-gray-700">
                        <td className="px-3 py-2">{item.name}</td>
                        <td className="px-3 py-2">{item.sku}</td>
                        <td className="px-3 py-2">${Number(item.price || 0).toFixed(2)}</td>
                        <td className="px-3 py-2">${Number(item.msrp || 0).toFixed(2)}</td>
                        <td className="px-3 py-2">${Number(item.tax || 0).toFixed(2)}</td>
                        <td className="px-3 py-2">${Number(item.importFee || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
