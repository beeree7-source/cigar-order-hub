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
  supplier_name: string;
  supplier_email: string;
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

const deliveryStatusDisplay: { [key: string]: { label: string; color: string; icon: string } } = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-800', icon: '⏳' },
  in_transit: { label: 'In Transit', color: 'bg-blue-100 text-blue-800', icon: '🚚' },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-orange-100 text-orange-800', icon: '📍' },
  delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-800', icon: '✓' },
  failed_attempt: { label: 'Failed Attempt', color: 'bg-red-100 text-red-800', icon: '⚠️' }
};

export default function RetailerOrderTrackingPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deliveryFilter, setDeliveryFilter] = useState<string>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [orders, statusFilter, deliveryFilter]);

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
      if (user.role !== 'retailer') {
        setError('Access denied. Retailer role required.');
        return;
      }

      const response = await fetch('http://localhost:10000/api/retailers/orders/tracking', {
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

    if (deliveryFilter !== 'all') {
      if (deliveryFilter === 'shipped') {
        filtered = filtered.filter(o => o.is_shipped);
      } else if (deliveryFilter === 'not_shipped') {
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
    in_transit: orders.filter(o => o.is_shipped && o.shipping_info?.delivery_status === 'in_transit').length,
    delivered: orders.filter(o => o.is_shipped && o.shipping_info?.delivery_status === 'delivered').length,
    pending: orders.filter(o => !o.is_shipped).length
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Order Tracking</h1>
          <p className="text-gray-600 mt-2">Track your orders and delivery status</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-gray-600 text-xs font-medium uppercase">Total Orders</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-green-600 text-xs font-medium uppercase">Shipped</div>
            <div className="text-2xl font-bold text-green-600 mt-1">{stats.shipped}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-blue-600 text-xs font-medium uppercase">In Transit</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{stats.in_transit}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-emerald-600 text-xs font-medium uppercase">Delivered</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.delivered}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-yellow-600 text-xs font-medium uppercase">Pending</div>
            <div className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</div>
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
              value={deliveryFilter}
              onChange={(e) => setDeliveryFilter(e.target.value)}
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
            <p className="text-gray-600 mt-4">Loading your orders...</p>
          </div>
        )}

        {/* Orders List */}
        {!loading && filteredOrders.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No orders found matching your search.</p>
          </div>
        )}

        {!loading && filteredOrders.length > 0 && (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer"
                onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
              >
                {/* Order Header */}
                <div className={`p-4 border-l-4 ${order.is_shipped ? 'border-l-green-500 bg-green-50' : 'border-l-yellow-500 bg-yellow-50'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">Order #{order.id}</h3>
                        {order.is_shipped && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-200 text-green-800 flex items-center gap-1">
                            ✓ SHIPPED
                          </span>
                        )}
                        {!order.is_shipped && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-200 text-yellow-800">
                            Not Shipped Yet
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-2">
                        From: <strong>{order.supplier_name}</strong>
                      </div>
                      <div className="text-sm text-gray-600">
                        Ordered: {formatDate(order.created_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        ${order.items.reduce((sum, item) => sum + (item.quantity * item.price), 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">{order.items.length} item(s)</div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedOrderId === order.id && (
                  <>
                    {/* Items */}
                    <div className="p-4 border-t border-gray-200">
                      <div className="text-sm font-medium text-gray-900 mb-3">Items Ordered:</div>
                      <div className="space-y-2">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                            <span className="text-gray-700">
                              {item.name}
                              <span className="text-gray-500 ml-2">SKU: {item.sku}</span>
                            </span>
                            <span className="font-medium text-gray-900">
                              {item.quantity}x @ ${item.price.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shipping Information */}
                    {order.shipping_info ? (
                      <div className="p-4 bg-green-50 border-t border-green-200">
                        <div className="text-sm font-medium text-gray-900 mb-4">📦 Shipping Details:</div>
                        
                        {/* Carrier and Tracking */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          <div>
                            <div className="text-xs text-gray-600 uppercase font-semibold">Carrier</div>
                            <div className="text-sm font-medium text-gray-900 mt-1">{order.shipping_info.carrier}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600 uppercase font-semibold">Tracking #</div>
                            <div className="text-sm font-mono text-gray-900 mt-1 break-all">{order.shipping_info.tracking_number}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600 uppercase font-semibold">Est. Delivery</div>
                            <div className="text-sm font-medium text-gray-900 mt-1">
                              {formatDate(order.shipping_info.eta)}
                              {(() => {
                                const daysLeft = calculateDaysUntilETA(order.shipping_info.eta);
                                return daysLeft !== null ? (
                                  <div className="text-xs text-gray-500">
                                    {daysLeft > 0 ? `In ${daysLeft} days` : '(Today)'}
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600 uppercase font-semibold">Status</div>
                            <div className={`text-xs font-medium px-2 py-1 rounded mt-1 inline-block ${deliveryStatusDisplay[order.shipping_info.delivery_status]?.color || 'bg-gray-100 text-gray-800'}`}>
                              {deliveryStatusDisplay[order.shipping_info.delivery_status]?.icon} {deliveryStatusDisplay[order.shipping_info.delivery_status]?.label || order.shipping_info.delivery_status}
                            </div>
                          </div>
                        </div>

                        {/* Tracking Link */}
                        {order.shipping_info.carrier_url && (
                          <div className="pt-3 border-t border-green-200">
                            <a
                              href={order.shipping_info.carrier_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition"
                            >
                              Track on {order.shipping_info.carrier} →
                            </a>
                          </div>
                        )}

                        {/* Delivery Timeline Info */}
                        <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-800">
                          📍 Status: <strong>{deliveryStatusDisplay[order.shipping_info.delivery_status]?.label || order.shipping_info.delivery_status}</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-50 border-t border-yellow-200">
                        <div className="text-sm text-yellow-800">
                          ⏳ <strong>Not Yet Shipped</strong>
                          <div className="text-xs text-yellow-700 mt-2">
                            Your order is being processed. Once the supplier ships it and generates a tracking number, you'll see all delivery details here.
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Quick Preview (When Collapsed) */}
                {expandedOrderId !== order.id && order.is_shipped && (
                  <div className="px-4 py-3 bg-green-50 border-t border-green-200 text-sm text-green-800 flex justify-between items-center">
                    <span>
                      🚚 {deliveryStatusDisplay[order.shipping_info?.delivery_status || 'pending']?.label || 'Shipped'} • 
                      Arrives {order.shipping_info?.eta ? formatDate(order.shipping_info.eta) : 'TBD'}
                    </span>
                    <span className="text-xs text-green-600">Click to expand →</span>
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
