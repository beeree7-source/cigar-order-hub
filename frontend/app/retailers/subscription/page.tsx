'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SubscriptionTier {
  id: number;
  tier_code: string;
  tier_name: string;
  description: string;
  monthly_price: number;
  annual_price: number;
  annual_discount_percent: number;
  max_locations: number;
  max_api_calls_per_month: number;
  max_users: number;
  metadata?: {
    support_level?: string;
    sla_response_time?: string;
  };
}

interface CurrentSubscription {
  tier_code: string;
  status: string;
}

export default function RetailerSubscriptionPage() {
  const router = useRouter();
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [processingTierCode, setProcessingTierCode] = useState<string | null>(null);
  const [cancellingPlan, setCancellingPlan] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      router.push('/login');
      return;
    }

    const userObj = JSON.parse(userData);
    if (userObj.role !== 'retailer' && userObj.role !== 'admin') {
      router.push('/');
      return;
    }

    initializePage(token);
  }, [router]);

  const initializePage = async (token: string) => {
    setLoading(true);
    await Promise.all([loadTiers(token), loadCurrentSubscription(token)]);
    setLoading(false);
  };

  const loadTiers = async (token: string) => {
    try {
      setError('');
      const response = await fetch('http://localhost:10000/api/retailer-subscription/tiers', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load subscription tiers');
      }

      const data = await response.json();
      setTiers(data.tiers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription tiers');
    } finally {
      // loading is controlled by initializePage / action handlers
    }
  };

  const loadCurrentSubscription = async (token: string) => {
    try {
      const response = await fetch('http://localhost:10000/api/retailer-subscription/current', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.status === 404) {
        setCurrentSubscription(null);
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load current subscription');
      }

      const data = await response.json();
      if (data.subscription) {
        setCurrentSubscription({
          tier_code: data.subscription.tier_code,
          status: data.subscription.status
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load current subscription');
    }
  };

  const handleSelectPlan = async (tier: SubscriptionTier) => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    if (currentSubscription?.tier_code === tier.tier_code) {
      setSuccessMessage(`${tier.tier_name} is already your active plan.`);
      return;
    }

    try {
      setError('');
      setSuccessMessage('');
      setProcessingTierCode(tier.tier_code);

      let response: Response;

      if (!currentSubscription) {
        response = await fetch('http://localhost:10000/api/retailer-subscription/subscribe', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tierCode: tier.tier_code,
            billingCycle
          })
        });
      } else {
        response = await fetch('http://localhost:10000/api/retailer-subscription/change-tier', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            newTierCode: tier.tier_code,
            reason: 'Changed from plan selector UI'
          })
        });
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update subscription');
      }

      setSuccessMessage(data.message || `Plan updated to ${tier.tier_name}.`);
      setCurrentSubscription({ tier_code: tier.tier_code, status: 'active' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update subscription');
    } finally {
      setProcessingTierCode(null);
    }
  };

  const handleCancelPlan = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      setError('');
      setSuccessMessage('');
      setCancellingPlan(true);

      const response = await fetch('http://localhost:10000/api/retailer-subscription/cancel', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          immediate: false,
          reason: 'Cancelled from subscription page'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      setSuccessMessage(data.message || 'Subscription will cancel at end of billing period.');
      await loadCurrentSubscription(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setCancellingPlan(false);
    }
  };

  const sortedTiers = useMemo(
    () => [...tiers].sort((a, b) => a.id - b.id),
    [tiers]
  );

  const formatLimit = (value: number) => {
    if (value === -1) return 'Unlimited';
    if (value === 0) return 'Not included';
    return value.toLocaleString();
  };

  const priceFor = (tier: SubscriptionTier) =>
    billingCycle === 'monthly' ? tier.monthly_price : tier.annual_price;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Retailer SaaS Plans</h1>
            <p className="text-gray-400">Compare tiers and choose the right plan for your business.</p>
          </div>
          <Link
            href="/retailers"
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-8 inline-flex gap-2">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-md font-semibold transition-colors ${
              billingCycle === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-4 py-2 rounded-md font-semibold transition-colors ${
              billingCycle === 'annual' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            Annual
          </button>
        </div>

        {currentSubscription && (
          <div className="mb-6 flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-300">
              Current subscription: <span className="font-semibold text-white">{currentSubscription.tier_code}</span>
            </div>
            <button
              onClick={handleCancelPlan}
              disabled={cancellingPlan}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {cancellingPlan ? 'Cancelling...' : 'Cancel Plan'}
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-200 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-900/40 border border-green-700 text-green-200 rounded-lg p-4 mb-6">
            {successMessage}
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {sortedTiers.map((tier) => (
              <div key={tier.id} className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="mb-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xl font-bold text-white">{tier.tier_name}</h2>
                    {currentSubscription?.tier_code === tier.tier_code && (
                      <span className="text-xs bg-emerald-600 text-white px-2 py-1 rounded-full">Current</span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mt-1">{tier.description}</p>
                </div>

                <div className="mb-6">
                  <div className="text-3xl font-bold text-white">
                    ${priceFor(tier).toFixed(2)}
                  </div>
                  <div className="text-gray-400 text-sm">
                    per {billingCycle === 'monthly' ? 'month' : 'year'}
                  </div>
                  {billingCycle === 'annual' && tier.annual_discount_percent > 0 && (
                    <div className="text-green-400 text-xs mt-1">
                      Save {tier.annual_discount_percent.toFixed(0)}%
                    </div>
                  )}
                </div>

                <ul className="space-y-2 text-sm text-gray-300 mb-6">
                  <li>Locations: {formatLimit(tier.max_locations)}</li>
                  <li>Users: {formatLimit(tier.max_users)}</li>
                  <li>API Calls/mo: {formatLimit(tier.max_api_calls_per_month)}</li>
                  <li>Support: {tier.metadata?.support_level || 'Standard'}</li>
                  <li>SLA: {tier.metadata?.sla_response_time || 'N/A'}</li>
                </ul>

                <button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={() => handleSelectPlan(tier)}
                  disabled={processingTierCode === tier.tier_code}
                >
                  {processingTierCode === tier.tier_code ? 'Updating...' : currentSubscription?.tier_code === tier.tier_code ? 'Current Plan' : 'Select Plan'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
