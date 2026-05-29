'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Upload, CheckCircle2, Wallet, Trash2, Crown, Sparkles } from 'lucide-react';
import { getCurrentUser, updatePayoutDetails, uploadPaymentQR, openBillingPortal } from '@/lib/store';
import { PRO_PRICE_RM } from '@/lib/plans';
import Navbar from '@/components/Navbar';
import { format } from 'date-fns';

const METHODS = ['DuitNow', 'Bank Transfer', 'TNG eWallet', 'Boost', 'GrabPay'];
const BANKS = ['Maybank', 'CIMB', 'Public Bank', 'RHB', 'Hong Leong', 'Bank Islam', 'AmBank', 'BSN', 'OCBC', 'UOB', 'Other'];

export default function SettingsPage() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [method, setMethod] = useState('DuitNow');
  const [bank, setBank] = useState('');
  const [account, setAccount] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const [plan, setPlan] = useState<'free' | 'pro'>('free');
  const [planRenewsAt, setPlanRenewsAt] = useState<string | undefined>();
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const u = await getCurrentUser();
      if (!u) { router.push('/auth'); return; }
      setUserName(u.name);
      setMethod(u.payoutMethod || 'DuitNow');
      setBank(u.payoutBank || '');
      setAccount(u.payoutAccount || '');
      setQrUrl(u.payoutQrUrl || '');
      setPlan(u.plan ?? 'free');
      setPlanRenewsAt(u.planRenewsAt);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const url = await openBillingPortal();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open billing portal.');
      setPortalLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB.'); return; }
    setUploading(true);
    setError('');
    try {
      const url = await uploadPaymentQR(file);
      setQrUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    }
    setUploading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await updatePayoutDetails({
        payoutMethod: method,
        payoutBank: bank || undefined,
        payoutAccount: account || undefined,
        payoutQrUrl: qrUrl || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  const showBank = method === 'Bank Transfer';
  const accountLabel =
    method === 'DuitNow' ? 'DuitNow ID (phone / IC / account)' :
    method === 'Bank Transfer' ? 'Account Number' :
    method === 'TNG eWallet' ? 'TNG-linked phone number' :
    'Phone number / account';

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar userName={userName} />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm mb-6">
          <ArrowLeft size={16} />Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 mb-6">Account Settings</h1>

        {/* Subscription card */}
        <div className={`rounded-2xl border shadow-sm p-6 mb-6 ${plan === 'pro' ? 'bg-gradient-to-r from-emerald-50 to-amber-50 border-emerald-200' : 'bg-white border-slate-100'}`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${plan === 'pro' ? 'bg-amber-100' : 'bg-slate-100'}`}>
                <Crown size={22} className={plan === 'pro' ? 'text-amber-500' : 'text-slate-400'} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{plan === 'pro' ? 'Pro Plan' : 'Free Plan'}</span>
                  {plan === 'pro' && <span className="bg-emerald-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">Active</span>}
                </div>
                <div className="text-sm text-slate-500 mt-0.5">
                  {plan === 'pro'
                    ? planRenewsAt
                      ? `Renews ${format(new Date(planRenewsAt), 'dd MMM yyyy')} · RM${PRO_PRICE_RM}/month`
                      : `RM${PRO_PRICE_RM}/month`
                    : '1 group · up to 5 members each'}
                </div>
              </div>
            </div>
            {plan === 'pro' ? (
              <button onClick={handleManageBilling} disabled={portalLoading}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60">
                {portalLoading ? 'Opening...' : 'Manage Billing'}
              </button>
            ) : (
              <Link href="/upgrade"
                className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
                <Sparkles size={15} />Upgrade to Pro
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <Wallet size={22} className="text-emerald-500" />
          <h2 className="text-xl font-bold text-slate-900">Payout Details</h2>
        </div>
        <p className="text-slate-500 mb-8">
          When it&apos;s your turn to collect, your group members will see this info so they know where to send your money. Set it once — it works across all your groups.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Preferred Method</label>
              <div className="flex flex-wrap gap-2">
                {METHODS.map((m) => (
                  <button key={m} type="button" onClick={() => setMethod(m)}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${method === m ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {showBank && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Bank</label>
                <select value={bank} onChange={(e) => setBank(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-white">
                  <option value="">Select a bank</option>
                  {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{accountLabel}</label>
              <input type="text" value={account} onChange={(e) => setAccount(e.target.value)}
                placeholder={method === 'DuitNow' ? '012-345 6789' : method === 'Bank Transfer' ? '1234 5678 9012' : '012-345 6789'}
                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent" />
            </div>
          </div>

          {/* QR Upload */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment QR Code (optional)</label>
            <p className="text-slate-400 text-xs mb-4">
              Upload your DuitNow / TNG / bank QR so members can just scan and pay.
            </p>

            {qrUrl ? (
              <div className="flex items-center gap-4">
                <div className="relative w-32 h-32 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <Image src={qrUrl} alt="Payment QR" fill className="object-contain" unoptimized />
                </div>
                <div className="flex flex-col gap-2">
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                    <Upload size={15} />Replace
                  </button>
                  <button type="button" onClick={() => setQrUrl('')}
                    className="inline-flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 font-medium">
                    <Trash2 size={15} />Remove
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="w-full border-2 border-dashed border-slate-200 rounded-xl py-8 flex flex-col items-center justify-center gap-2 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors disabled:opacity-60">
                <Upload size={22} className="text-slate-400" />
                <span className="text-sm text-slate-500">{uploading ? 'Uploading...' : 'Click to upload QR image'}</span>
                <span className="text-xs text-slate-400">PNG or JPG, max 5MB</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          </div>

          <button type="submit" disabled={saving}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold py-4 rounded-xl transition-colors text-base flex items-center justify-center gap-2">
            {saved ? <><CheckCircle2 size={18} />Saved!</> : saving ? 'Saving...' : 'Save Payout Details'}
          </button>
        </form>
      </main>
    </div>
  );
}
