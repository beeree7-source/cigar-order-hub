'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface PreviewItem {
  name: string;
  sku: string;
  price: number;
  stock: number;
  category: string;
  description: string;
  sourceType?: string;
}

export default function RetailerInventoryImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [summary, setSummary] = useState({ totalRows: 0, validRows: 0, skippedRows: 0 });

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const hasPreview = useMemo(() => previewItems.length > 0, [previewItems]);

  const downloadTemplate = async (format: 'csv' | 'xlsx') => {
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      setError('');
      const response = await fetch(`http://localhost:10000/api/inventory-import/template.${format}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to download template');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inventory-import-template.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download template');
    }
  };

  useEffect(() => {
    const templateParam = new URLSearchParams(window.location.search).get('template');
    if (templateParam === 'csv' || templateParam === 'xlsx') {
      void downloadTemplate(templateParam);
    }
  }, []);

  const handlePreview = async () => {
    if (!file) {
      setError('Choose a CSV, Excel, or PDF file first.');
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
      formData.append('inventoryFile', file);

      const response = await fetch('http://localhost:10000/api/inventory-import/preview', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to preview import file');
      }

      setSourceType(data.sourceType || 'unknown');
      setPreviewItems(data.preview || []);
      setSummary({
        totalRows: data.totalRows || 0,
        validRows: data.validRows || 0,
        skippedRows: data.skippedRows || 0
      });

      setMessage('Preview generated. Review and import when ready.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview file');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleImport = async () => {
    if (!token) {
      router.push('/login');
      return;
    }

    if (!previewItems.length) {
      setError('No preview data available to import.');
      return;
    }

    try {
      setLoadingImport(true);
      setError('');
      setMessage('');

      const response = await fetch('http://localhost:10000/api/inventory-import/commit', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ products: previewItems })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to import inventory');
      }

      setMessage(`Import complete. Added ${data.importedCount} products, skipped ${data.skippedCount}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import inventory');
    } finally {
      setLoadingImport(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Inventory Import</h1>
            <p className="text-gray-400">Carry over inventory from CSV, Excel, or AI-assisted PDF parsing.</p>
          </div>
          <Link href="/retailers" className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors">
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
              Download CSV Template
            </button>
            <button
              onClick={() => downloadTemplate('xlsx')}
              className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold py-2 px-3 rounded-lg"
            >
              Download Excel Template
            </button>
          </div>
          <div className="grid md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-300 mb-2">Upload file</label>
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
              {loadingPreview ? 'Parsing...' : 'Preview Import'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-3">Supported: CSV, XLS/XLSX, PDF (AI-assisted extraction).</p>
        </div>

        {hasPreview && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="text-sm text-gray-300">
                Source: <span className="text-white font-semibold">{sourceType}</span> | Rows: <span className="text-white">{summary.totalRows}</span> | Valid: <span className="text-white">{summary.validRows}</span> | Skipped: <span className="text-white">{summary.skippedRows}</span>
              </div>
              <button
                onClick={handleImport}
                disabled={loadingImport}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-60"
              >
                {loadingImport ? 'Importing...' : 'Import Inventory'}
              </button>
            </div>

            <div className="overflow-auto">
              <table className="w-full text-sm text-left text-gray-300">
                <thead className="text-xs uppercase bg-gray-900 text-gray-400">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">SKU</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Stock</th>
                    <th className="px-3 py-2">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {previewItems.map((item, idx) => (
                    <tr key={`${item.sku}-${idx}`} className="border-t border-gray-700">
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2">{item.sku}</td>
                      <td className="px-3 py-2">${Number(item.price || 0).toFixed(2)}</td>
                      <td className="px-3 py-2">{item.stock || 0}</td>
                      <td className="px-3 py-2">{item.category || 'Imported'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
