'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface OrderItem {
  product_id: number;
  quantity: number;
  name: string;
  price: number;
  sku: string;
}

interface ShippingInfo {
  carrier: string;
  tracking_number: string;
  eta: string;
  delivery_status: string;
  label_url: string;
  carrier_url?: string;
}

interface Order {
  id: number;
  retailer_id: number;
  supplier_id: number;
  retailer_name: string;
  retailer_email: string;
  items: OrderItem[];
  status: string;
  created_at: string;
  is_shipped: boolean;
  shipping_info: ShippingInfo | null;
}

const statusBadgeColor: { [key: string]: string } = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  ready_to_ship: 'bg-purple-100 text-purple-800',
  shipped: 'bg-green-100 text-green-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800'
};

const deliveryStatusDisplay: { [key: string]: { label: string; color: string } } = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-800' },
  in_transit: { label: 'In Transit', color: 'bg-blue-100 text-blue-800' },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-orange-100 text-orange-800' },
  delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-800' },
  failed_attempt: { label: 'Failed Attempt', color: 'bg-red-100 text-red-800' }
};

export default function SupplierOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [shippingFilter, setShippingFilter] = useState<string>('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [orders, statusFilter, shippingFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      if (!token || !userStr) {
        router.push('/login');
        return;
      }

      const user = JSON.parse(userStr);
      if (user.role !== 'supplier') {
        setError('Access denied. Supplier role required.');
        return;
      }

      const response = await fetch(`http://localhost:10000/api/suppliers/${user.id}/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.statusText}`);
      }

      const data = await response.json();
      setOrders(data.orders || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
      console.error('Orders fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    if (shippingFilter !== 'all') {
      if (shippingFilter === 'shipped') {
        filtered = filtered.filter(o => o.is_shipped);
      } else if (shippingFilter === 'not_shipped') {
        filtered = filtered.filter(o => !o.is_shipped);
      }
    }

    setFilteredOrders(filtered);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateDaysUntilETA = (eta: string | null) => {
    if (!eta) return null;
    const today = new Date();
    const etaDate = new Date(eta);
    const diffTime = etaDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const stats = {
    total: orders.length,
    shipped: orders.filter(o => o.is_shipped).length,
    pending: orders.filter(o => !o.is_shipped).length
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-600 mt-2">Track orders sent to retailers and shipping status</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm font-medium">Total Orders</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-green-600 text-sm font-medium">Shipped</div>
            <div className="text-3xl font-bold text-green-600 mt-2">{stats.shipped}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-yellow-600 text-sm font-medium">Pending/Processing</div>
            <div className="text-3xl font-bold text-yellow-600 mt-2">{stats.pending}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6 flex-wrap">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="ready_to_ship">Ready to Ship</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Shipping:</label>
            <select
              value={shippingFilter}
              onChange={(e) => setShippingFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Orders</option>
              <option value="shipped">Shipped (Has Tracking)</option>
              <option value="not_shipped">Not Shipped</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="text-gray-600 mt-4">Loading orders...</p>
          </div>
        )}

        {/* Orders List */}
        {!loading && filteredOrders.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No orders found matching the selected filters.</p>
          </div>
        )}

        {!loading && filteredOrders.length > 0 && (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                {/* Order Header */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 border-b border-gray-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">Order #{order.id}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadgeColor[order.status] || 'bg-gray-100 text-gray-800'}`}>
                          {order.status.replace('_', ' ').toUpperCase()}
                        </span>
                        {order.is_shipped && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1">
                            ✓ SHIPPED
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-2">
                        To: <strong>{order.retailer_name}</strong> ({order.retailer_email})
                      </div>
                      <div className="text-sm text-gray-600">
                        Created: {formatDate(order.created_at)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-4 border-b border-gray-200">
                  <div className="text-sm font-medium text-gray-900 mb-3">Items:</div>
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm text-gray-600">
                        <span>{item.name} (SKU: {item.sku})</span>
                        <span className="font-medium">
                          {item.quantity}x @ ${item.price.toFixed(2)} = ${(item.quantity * item.price).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end">
                    <span className="font-semibold text-gray-900">
                      Total: ${order.items.reduce((sum, item) => sum + (item.quantity * item.price), 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Shipping Information */}
                {order.shipping_info ? (
                  <div className="p-4 bg-green-50 border-t border-green-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-medium text-gray-900 mb-3">Shipping Information:</div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Carrier:</span>
                            <span className="text-sm font-medium text-gray-900">{order.shipping_info.carrier}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Tracking #:</span>
                            <span className="text-sm font-mono font-medium text-gray-900">{order.shipping_info.tracking_number}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Status:</span>
                            <span className={`text-sm font-medium px-2 py-1 rounded ${deliveryStatusDisplay[order.shipping_info.delivery_status]?.color || 'bg-gray-100 text-gray-800'}`}>
                              {deliveryStatusDisplay[order.shipping_info.delivery_status]?.label || order.shipping_info.delivery_status}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Est. Delivery:</span>
                            <span className="text-sm font-medium text-gray-900">
                              {formatDate(order.shipping_info.eta)}
                              {(() => {
                                const daysLeft = calculateDaysUntilETA(order.shipping_info.eta);
                                return daysLeft !== null ? ` (${daysLeft} days)` : '';
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                      {order.shipping_info.carrier_url && (
                        <a
                          href={order.shipping_info.carrier_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 transition"
                        >
                          Track Online →
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 border-t border-yellow-200">
                    <div className="text-sm text-yellow-800">
                      📦 Shipping label pending. Order status: <strong>{order.status}</strong>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
