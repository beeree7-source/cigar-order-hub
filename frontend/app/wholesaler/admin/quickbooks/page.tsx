'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SyncLog {
  id: number;
  sync_type: string;
  status: string;
  items_synced: number;
  created_at: string;
}

interface QuickBooksStatus {
  connected: boolean;
  status: string;
  realm_id?: string;
  last_sync?: string;
  recent_syncs?: SyncLog[];
}

export default function AdminQuickBooksPage() {
  const router = useRouter();
  const [status, setStatus] = useState<QuickBooksStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (user.role !== 'admin') {
      router.push('/');
      return;
    }

    loadStatus(token);
  }, [router]);

  const getToken = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return null;
    }
    return token;
  };

  const loadStatus = async (token: string) => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('http://localhost:10000/api/protected/quickbooks/status', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load QuickBooks status');
      }

      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load QuickBooks status');
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (endpoint: string, method: 'GET' | 'POST') => {
    const token = getToken();
    if (!token) return;

    try {
      setError('');
      setMessage('');
      setProcessingAction(endpoint);

      const response = await fetch(`http://localhost:10000/api/protected/quickbooks/${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'QuickBooks action failed');
      }

      if (endpoint === 'connect' && data.authUrl) {
        setMessage('QuickBooks connection URL generated. Opening authorization page...');
        window.open(data.authUrl, '_blank');
      } else {
        setMessage(data.message || 'Action completed successfully');
      }

      await loadStatus(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'QuickBooks action failed');
    } finally {
      setProcessingAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Admin QuickBooks</h1>
            <p className="text-gray-400">Manage the platform QuickBooks integration and sync jobs.</p>
          </div>
          <Link
            href="/"
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Admin Dashboard
          </Link>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-200 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-900/40 border border-green-700 text-green-200 rounded-lg p-4 mb-6">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => runAction('connect', 'GET')}
            disabled={processingAction === 'connect'}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {processingAction === 'connect' ? 'Connecting...' : 'Connect QuickBooks'}
          </button>
          <button
            onClick={() => runAction('sync', 'POST')}
            disabled={processingAction === 'sync'}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {processingAction === 'sync' ? 'Syncing...' : 'Run Full Sync'}
          </button>
          <button
            onClick={() => runAction('sync-orders', 'POST')}
            disabled={processingAction === 'sync-orders'}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {processingAction === 'sync-orders' ? 'Syncing Orders...' : 'Sync Orders'}
          </button>
          <button
            onClick={() => runAction('sync-customers', 'POST')}
            disabled={processingAction === 'sync-customers'}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {processingAction === 'sync-customers' ? 'Syncing Customers...' : 'Sync Customers'}
          </button>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Connection Status</h2>
          {loading ? (
            <div className="text-gray-300">Loading status...</div>
          ) : (
            <div className="space-y-2 text-gray-300">
              <p>
                Connected: <span className="text-white font-semibold">{status?.connected ? 'Yes' : 'No'}</span>
              </p>
              <p>
                Sync Status: <span className="text-white font-semibold">{status?.status || 'unknown'}</span>
              </p>
              <p>
                Realm ID: <span className="text-white font-semibold">{status?.realm_id || 'N/A'}</span>
              </p>
              <p>
                Last Sync: <span className="text-white font-semibold">{status?.last_sync || 'N/A'}</span>
              </p>
            </div>
          )}
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Recent Sync Logs</h2>
          {loading ? (
            <div className="text-gray-300">Loading logs...</div>
          ) : !status?.recent_syncs || status.recent_syncs.length === 0 ? (
            <div className="text-gray-300">No sync logs yet.</div>
          ) : (
            <div className="space-y-3">
              {status.recent_syncs.map((log) => (
                <div key={log.id} className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-white font-semibold">{log.sync_type}</div>
                    <div className="text-sm text-gray-300">{log.status}</div>
                  </div>
                  <div className="text-sm text-gray-400 mt-1">Items synced: {log.items_synced}</div>
                  <div className="text-xs text-gray-500 mt-1">{log.created_at}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
