'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Calendar, TrendingUp, CheckCircle2, ArrowRight, Crown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getGroupPreview, joinGroup, GroupPreview } from '@/lib/store';
import { formatRM } from '@/lib/utils';

export default function JoinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState(false);
  const [preview, setPreview] = useState<GroupPreview | null>(null);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthed(!!user);

      const p = await getGroupPreview(id);
      setPreview(p);
      setPageLoading(false);
    }
    load();
  }, [id]);

  async function handleJoin() {
    if (!isAuthed) {
      // Send to signup, return to this join page afterwards
      router.push(`/auth?mode=signup&redirect=${encodeURIComponent(`/groups/${id}/join`)}`);
      return;
    }
    if (!preview) return;
    setLoading(true);
    setError('');
    try {
      await joinGroup(id);
      setJoined(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join group.');
    }
    setLoading(false);
  }

  // Fee preview math (matches utils logic, using current member count)
  function winnerPayout(p: GroupPreview): number {
    const pot = p.monthlyAmount * Math.max(p.memberCount, 1);
    let fee = 0;
    if (p.organizerFeeType === 'flat') fee = p.organizerFeeValue;
    if (p.organizerFeeType === 'percentage') fee = (pot * p.organizerFeeValue) / 100;
    return pot - fee;
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Group not found</h2>
          <p className="text-slate-500 mb-4">This invite link may have expired or the group was deleted.</p>
          <Link href="/" className="text-emerald-600 hover:underline text-sm">Go back home</Link>
        </div>
      </div>
    );
  }

  const isFull = preview.memberCount >= preview.totalSlots;
  const alreadyMember = preview.isMember;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold">K</span>
          </div>
          <span className="font-bold text-xl text-slate-900">Kutuku</span>
        </div>

        {joined ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">You&apos;re in! 🎉</h2>
            <p className="text-slate-500 mb-6">You&apos;ve joined <strong>{preview.name}</strong>. Head to the group to see your payment schedule.</p>
            <Link href={`/groups/${preview.id}`}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
              View Group <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <div className="text-center mb-6">
              <div className="inline-block bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">Group Invitation</div>
              <h2 className="text-2xl font-bold text-slate-900">{preview.name}</h2>
              {preview.description && <p className="text-slate-400 text-sm mt-1">{preview.description}</p>}
              <p className="text-slate-500 text-sm mt-2">Invited by <strong>{preview.createdByName}</strong></p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Monthly', value: formatRM(preview.monthlyAmount), icon: Calendar },
                { label: 'You Collect', value: formatRM(winnerPayout(preview)), icon: TrendingUp },
                { label: 'Members', value: `${preview.memberCount}/${preview.totalSlots}`, icon: Users },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className="font-bold text-slate-900 text-sm">{value}</div>
                  <div className="text-slate-400 text-xs mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {preview.organizerFeeType !== 'none' && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
                <Crown size={14} className="text-amber-500 shrink-0" />
                <span className="text-amber-700 text-xs">
                  {preview.createdByName} (tukang kutu) earns{' '}
                  {preview.organizerFeeType === 'flat'
                    ? `${formatRM(preview.organizerFeeValue)} per round`
                    : `${preview.organizerFeeValue}% of each pot`}
                </span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
            )}

            {alreadyMember ? (
              <div className="text-center">
                <p className="text-slate-500 mb-4">You&apos;re already a member of this group.</p>
                <Link href={`/groups/${preview.id}`}
                  className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
                  View Group <ArrowRight size={18} />
                </Link>
              </div>
            ) : isFull ? (
              <div className="text-center">
                <p className="text-slate-500 mb-2">This group is full ({preview.totalSlots}/{preview.totalSlots} members).</p>
                <Link href="/" className="text-emerald-600 hover:underline text-sm">Create your own group</Link>
              </div>
            ) : (
              <>
                <button onClick={handleJoin} disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold py-4 rounded-xl transition-colors text-base mb-3">
                  {loading ? 'Joining...' : isAuthed ? 'Join This Group' : 'Sign Up & Join'}
                </button>
                {!isAuthed && (
                  <p className="text-center text-xs text-slate-400">
                    Already have an account?{' '}
                    <Link href={`/auth?redirect=${encodeURIComponent(`/groups/${id}/join`)}`} className="text-emerald-600 hover:underline">Log in</Link>
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
