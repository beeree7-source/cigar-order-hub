'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SupplierSummary {
  supplierId: number;
  supplierName: string;
  updatedAt: string;
  itemCount: number;
}

interface CatalogResponse {
  supplierId: number;
  supplierName: string;
  showMSRP: boolean;
  selectedColumns: string[];
  updatedAt: string;
  itemCount: number;
  items: Record<string, string | number>[];
}

export default function RetailerCatalogPricelistPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [error, setError] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const currentToken = localStorage.getItem('token');

    if (!userData || !currentToken) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (user.role !== 'retailer' && user.role !== 'admin') {
      router.push('/');
      return;
    }

    const preselected = Number(new URLSearchParams(window.location.search).get('supplierId'));
    if (Number.isFinite(preselected) && preselected > 0) {
      setSelectedSupplierId(preselected);
    }

    loadSuppliers(currentToken);
  }, [router]);

  const loadSuppliers = async (authToken: string) => {
    try {
      setLoadingSuppliers(true);
      setError('');

      const response = await fetch('http://localhost:10000/api/supplier-catalog/pricelist/suppliers', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load supplier catalogs');
      }

      const supplierList = data.suppliers || [];
      setSuppliers(supplierList);

      if (!selectedSupplierId && supplierList.length > 0) {
        setSelectedSupplierId(supplierList[0].supplierId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load supplier catalogs');
    } finally {
      setLoadingSuppliers(false);
    }
  };

  useEffect(() => {
    if (!selectedSupplierId || !token) {
      return;
    }

    const loadCatalog = async () => {
      try {
        setLoadingCatalog(true);
        setError('');

        const response = await fetch(`http://localhost:10000/api/supplier-catalog/pricelist/supplier/${selectedSupplierId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load supplier catalog');
        }

        setCatalog(data);
      } catch (err) {
        setCatalog(null);
        setError(err instanceof Error ? err.message : 'Failed to load supplier catalog');
      } finally {
        setLoadingCatalog(false);
      }
    };

    void loadCatalog();
  }, [selectedSupplierId, token]);

  const dynamicColumns = useMemo(() => catalog?.selectedColumns || [], [catalog]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Supplier Catalogs / Pricelists</h1>
            <p className="text-gray-400">Browse supplier catalogs with MSRP and custom pricing columns when shared.</p>
          </div>
          <Link href="/retailers" className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors">
            Back to Dashboard
          </Link>
        </div>

        {error && <div className="mb-6 bg-red-900/40 border border-red-700 text-red-200 rounded-lg p-4">{error}</div>}

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
          <label className="block text-sm text-gray-300 mb-2">Select supplier catalog</label>
          <select
            value={selectedSupplierId ?? ''}
            onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
            disabled={loadingSuppliers || suppliers.length === 0}
            className="w-full md:w-96 bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2"
          >
            {loadingSuppliers ? (
              <option>Loading supplier catalogs...</option>
            ) : suppliers.length === 0 ? (
              <option>No supplier catalogs available yet</option>
            ) : (
              suppliers.map((supplier) => (
                <option key={supplier.supplierId} value={supplier.supplierId}>
                  {supplier.supplierName} ({supplier.itemCount} items)
                </option>
              ))
            )}
          </select>
        </div>

        {loadingCatalog && <div className="text-gray-300">Loading selected catalog...</div>}

        {!loadingCatalog && catalog && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="mb-4 text-sm text-gray-300">
              Supplier: <span className="text-white font-semibold">{catalog.supplierName}</span> | Items: <span className="text-white">{catalog.itemCount}</span> | Updated: <span className="text-white">{new Date(catalog.updatedAt).toLocaleString()}</span>
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
                    {'msrp' in (catalog.items[0] || {}) && <th className="px-3 py-2">MSRP</th>}
                    {'tax' in (catalog.items[0] || {}) && <th className="px-3 py-2">Tax</th>}
                    {'importFee' in (catalog.items[0] || {}) && <th className="px-3 py-2">Import Fee</th>}
                    {dynamicColumns.map((column) => (
                      <th key={column} className="px-3 py-2">{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {catalog.items.map((item, index) => (
                    <tr key={`${String(item.sku)}-${index}`} className="border-t border-gray-700">
                      <td className="px-3 py-2">{String(item.name || '')}</td>
                      <td className="px-3 py-2">{String(item.sku || '')}</td>
                      <td className="px-3 py-2">${Number(item.price || 0).toFixed(2)}</td>
                      <td className="px-3 py-2">{String(item.stock || 0)}</td>
                      <td className="px-3 py-2">{String(item.category || '')}</td>
                      {'msrp' in item && <td className="px-3 py-2">${Number(item.msrp || 0).toFixed(2)}</td>}
                      {'tax' in item && <td className="px-3 py-2">${Number(item.tax || 0).toFixed(2)}</td>}
                      {'importFee' in item && <td className="px-3 py-2">${Number(item.importFee || 0).toFixed(2)}</td>}
                      {dynamicColumns.map((column) => (
                        <td key={column} className="px-3 py-2">{String(item[column] ?? '')}</td>
                      ))}
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
