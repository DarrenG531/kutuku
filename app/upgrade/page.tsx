'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Sparkles, Crown } from 'lucide-react';
import { getCurrentUser, startCheckout } from '@/lib/store';
import { PRO_PRICE_RM } from '@/lib/plans';
import Navbar from '@/components/Navbar';

const FREE_FEATURES = [
  'Join unlimited groups',
  'Create 1 group',
  'Up to 5 members per group',
  'Payment tracking & confirmation',
  'WhatsApp invite sharing',
];

const PRO_FEATURES = [
  'Create unlimited groups',
  'Up to 50 members per group',
  'Automatic payment reminders',
  'Full payment history & exports',
  'Priority support',
  'Pro badge on your profile',
];

function UpgradeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userName, setUserName] = useState('');
  const [plan, setPlan] = useState<'free' | 'pro'>('free');
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const u = await getCurrentUser();
      if (!u) { router.push('/auth'); return; }
      setUserName(u.name);
      setPlan(u.plan ?? 'free');
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleUpgrade() {
    setCheckingOut(true);
    setError('');
    try {
      const url = await startCheckout();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout.');
      setCheckingOut(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="text-slate-400 text-sm">Loading...</div></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar userName={userName} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm mb-6">
          <ArrowLeft size={16} />Back to Dashboard
        </Link>

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 text-sm font-medium px-3 py-1.5 rounded-full mb-4">
            <Sparkles size={14} />Upgrade to Pro
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Run bigger kutu, hassle-free</h1>
          <p className="text-slate-500 max-w-lg mx-auto">
            Free is great for one small group. Go Pro to organise unlimited groups with more members and automatic reminders.
          </p>
        </div>

        {searchParams.get('canceled') === '1' && (
          <div className="bg-amber-50 border border-amber-100 text-amber-700 text-sm rounded-lg px-4 py-3 mb-6 text-center">
            Checkout canceled — no charge was made. You can upgrade any time.
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg px-4 py-3 mb-6 text-center">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
            <h2 className="font-semibold text-slate-900 text-lg">Free</h2>
            <div className="mt-2 mb-6">
              <span className="text-4xl font-bold text-slate-900">RM0</span>
              <span className="text-slate-400">/month</span>
            </div>
            <ul className="space-y-3 mb-6">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <Check size={18} className="text-slate-400 shrink-0 mt-0.5" />{f}
                </li>
              ))}
            </ul>
            <div className="w-full text-center py-3 rounded-xl bg-slate-100 text-slate-500 font-medium text-sm">
              {plan === 'free' ? 'Your current plan' : 'Downgrade via billing portal'}
            </div>
          </div>

          {/* Pro */}
          <div className="bg-white rounded-2xl border-2 border-emerald-500 shadow-md p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
              Most Popular
            </div>
            <div className="flex items-center gap-2">
              <Crown size={18} className="text-amber-500" />
              <h2 className="font-semibold text-slate-900 text-lg">Pro</h2>
            </div>
            <div className="mt-2 mb-6">
              <span className="text-4xl font-bold text-slate-900">RM{PRO_PRICE_RM}</span>
              <span className="text-slate-400">/month</span>
            </div>
            <ul className="space-y-3 mb-6">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <Check size={18} className="text-emerald-500 shrink-0 mt-0.5" />{f}
                </li>
              ))}
            </ul>
            {plan === 'pro' ? (
              <div className="w-full text-center py-3 rounded-xl bg-emerald-50 text-emerald-700 font-semibold text-sm">
                ✓ You&apos;re on Pro
              </div>
            ) : (
              <button onClick={handleUpgrade} disabled={checkingOut}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors">
                {checkingOut ? 'Redirecting to checkout...' : `Upgrade to Pro`}
              </button>
            )}
            <p className="text-center text-xs text-slate-400 mt-3">Cancel anytime. Secured by Stripe.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function UpgradePage() {
  return <Suspense><UpgradeInner /></Suspense>;
}
