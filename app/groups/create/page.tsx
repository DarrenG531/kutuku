'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Info, Crown, Sparkles, Lock } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/client';
import { saveGroup, getMyCreatedGroupCount } from '@/lib/store';
import { KutuGroup, Member } from '@/lib/types';
import { generateRounds, formatRM, getOrganizerFeePerRound, getWinnerPayout, getTotalOrganizerEarnings } from '@/lib/utils';
import { limitsFor, Plan } from '@/lib/plans';
import Navbar from '@/components/Navbar';

export default function CreateGroupPage() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [plan, setPlan] = useState<Plan>('free');
  const [createdCount, setCreatedCount] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [totalSlots, setTotalSlots] = useState('');
  const [startDate, setStartDate] = useState('');
  const [payoutOrder, setPayoutOrder] = useState<'random' | 'fixed'>('fixed');
  const [organizerFeeType, setOrganizerFeeType] = useState<'none' | 'flat' | 'percentage'>('flat');
  const [organizerFeeValue, setOrganizerFeeValue] = useState('10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }
      const { data: profile } = await supabase.from('profiles').select('name, plan').eq('id', user.id).single();
      setUserName(profile?.name ?? user.email!.split('@')[0]);
      setUserId(user.id);
      setPlan((profile?.plan as Plan) ?? 'free');
      setCreatedCount(await getMyCreatedGroupCount());
      const next = new Date();
      next.setMonth(next.getMonth() + 1);
      next.setDate(1);
      setStartDate(next.toISOString().split('T')[0]);
    }
    load();
  }, [router]);

  const limits = limitsFor(plan);
  const reachedGroupLimit = createdCount >= limits.maxCreatedGroups;

  const slots = parseInt(totalSlots) || 0;
  const amount = parseFloat(monthlyAmount) || 0;
  const feeValue = parseFloat(organizerFeeValue) || 0;
  const pot = amount * slots;

  const previewGroup = pot > 0 ? {
    monthlyAmount: amount, members: Array(slots).fill(null),
    organizerFeeType, organizerFeeValue: feeValue,
  } as KutuGroup : null;

  const previewFee = previewGroup ? getOrganizerFeePerRound(previewGroup) : 0;
  const previewWinnerPayout = previewGroup ? getWinnerPayout(previewGroup) : 0;
  const previewTotalEarnings = previewGroup ? getTotalOrganizerEarnings(previewGroup) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setError('');

    if (reachedGroupLimit) {
      setError(`Free plan allows ${limits.maxCreatedGroups} group. Upgrade to Pro to create more.`); return;
    }
    if (isNaN(slots) || slots < 2 || slots > limits.maxGroupMembers) {
      setError(`Members must be between 2 and ${limits.maxGroupMembers}${plan === 'free' ? ' on the Free plan (Pro allows up to 50)' : ''}.`); return;
    }
    if (isNaN(amount) || amount < 10) { setError('Minimum monthly amount is RM10.'); return; }
    if (organizerFeeType === 'flat' && (isNaN(feeValue) || feeValue < 0 || feeValue >= amount)) {
      setError('Flat fee must be between RM0 and less than the monthly amount.'); return;
    }
    if (organizerFeeType === 'percentage' && (isNaN(feeValue) || feeValue < 0 || feeValue > 20)) {
      setError('Percentage fee must be between 0% and 20%.'); return;
    }

    setLoading(true);

    const meAsMember: Member = {
      id: uuidv4(), userId, name: userName, phone: '', position: 1,
      joinedAt: new Date().toISOString(),
    };

    const group: KutuGroup = {
      id: uuidv4(), name, description, monthlyAmount: amount, totalSlots: slots, startDate,
      payoutOrder, organizerFeeType, organizerFeeValue: organizerFeeType === 'none' ? 0 : feeValue,
      createdBy: userId, createdByName: userName, members: [meAsMember],
      rounds: [], status: 'active', createdAt: new Date().toISOString(),
    };

    group.rounds = generateRounds(group);

    try {
      await saveGroup(group);
      router.push(`/groups/${group.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  if (!userName) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar userName={userName} />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm mb-6">
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 mb-1">Create a Kutu Group</h1>
        <p className="text-slate-500 mb-8">Set up your group and share the invite link with friends.</p>

        {reachedGroupLimit && (
          <div className="bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-200 rounded-2xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                <Lock size={18} className="text-amber-500" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900 text-sm">You&apos;ve reached the Free plan limit</div>
                <div className="text-slate-500 text-sm mt-0.5 mb-3">
                  Free includes 1 group with up to 5 members. Upgrade to Pro for unlimited groups and up to 50 members each.
                </div>
                <Link href="/upgrade"
                  className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                  <Sparkles size={15} />Upgrade to Pro
                </Link>
              </div>
            </div>
          </div>
        )}

        {plan === 'free' && !reachedGroupLimit && (
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
            <Info size={13} />
            Free plan: up to 5 members per group.{' '}
            <Link href="/upgrade" className="text-emerald-600 hover:underline">Go Pro for 50</Link>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-slate-900">Group Details</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Group Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kutu Ofis 2026, Gang Raya, Kawan-kawan TTDI" required
                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Description (optional)</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Monthly savings for our team trip"
                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-slate-900">Savings Configuration</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Monthly Amount (RM) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">RM</span>
                  <input type="number" value={monthlyAmount} onChange={(e) => setMonthlyAmount(e.target.value)}
                    placeholder="100" min="10" required
                    className="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Number of Members *</label>
                <input type="number" value={totalSlots} onChange={(e) => setTotalSlots(e.target.value)}
                  placeholder="10" min="2" max="50" required
                  className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Date *</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required
                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Payout Order</label>
              <div className="grid grid-cols-2 gap-3">
                {(['fixed', 'random'] as const).map((opt) => (
                  <button key={opt} type="button" onClick={() => setPayoutOrder(opt)}
                    className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors text-left ${payoutOrder === opt ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    <div className="font-semibold capitalize">{opt}</div>
                    <div className="text-xs opacity-70 mt-0.5">{opt === 'fixed' ? 'Members choose their slot' : 'Randomly assigned'}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Crown size={18} className="text-amber-500" />
              <h2 className="font-semibold text-slate-900">Tukang Kutu Fee</h2>
            </div>
            <p className="text-slate-400 text-sm -mt-1">
              As the organiser, you can charge a small fee each round for managing the group. Deducted from the pot before the winner receives.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'none', label: 'No Fee', desc: 'Free to manage' },
                { value: 'flat', label: 'Flat (RM)', desc: 'Fixed RM per round' },
                { value: 'percentage', label: 'Percentage', desc: '% of pot per round' },
              ] as const).map((opt) => (
                <button key={opt.value} type="button" onClick={() => setOrganizerFeeType(opt.value)}
                  className={`px-3 py-3 rounded-xl border-2 text-sm font-medium transition-colors text-left ${organizerFeeType === opt.value ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  <div className="font-semibold">{opt.label}</div>
                  <div className="text-xs opacity-70 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>

            {organizerFeeType !== 'none' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {organizerFeeType === 'flat' ? 'Fee Amount (RM per round)' : 'Fee Percentage (% of pot)'}
                </label>
                <div className="relative">
                  {organizerFeeType === 'flat' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">RM</span>}
                  <input type="number" value={organizerFeeValue} onChange={(e) => setOrganizerFeeValue(e.target.value)}
                    placeholder={organizerFeeType === 'flat' ? '10' : '2'} min="0"
                    max={organizerFeeType === 'percentage' ? '20' : undefined}
                    step={organizerFeeType === 'percentage' ? '0.5' : '1'}
                    className={`w-full border border-slate-200 rounded-lg ${organizerFeeType === 'flat' ? 'pl-10' : 'pl-4'} pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent`} />
                  {organizerFeeType === 'percentage' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">%</span>}
                </div>
              </div>
            )}

            {previewGroup && pot > 0 && (
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Per Round Breakdown</div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total pot collected</span>
                  <span className="font-semibold text-slate-700">{formatRM(pot)}</span>
                </div>
                {previewFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-600 flex items-center gap-1"><Crown size={12} />Your fee (tukang kutu)</span>
                    <span className="font-semibold text-amber-600">– {formatRM(previewFee)}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-2 flex justify-between text-sm">
                  <span className="text-slate-700 font-medium">Winner receives</span>
                  <span className="font-bold text-emerald-600">{formatRM(previewWinnerPayout)}</span>
                </div>
                {previewFee > 0 && (
                  <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-2">
                    <span className="text-amber-700 text-xs">
                      💰 You earn <strong>{formatRM(previewTotalEarnings)}</strong> total over {slots} rounds for managing this group.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <button type="submit" disabled={loading || reachedGroupLimit}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors text-base">
            {loading ? 'Creating...' : reachedGroupLimit ? 'Upgrade to create more groups' : 'Create Group & Get Invite Link'}
          </button>
        </form>
      </main>
    </div>
  );
}
