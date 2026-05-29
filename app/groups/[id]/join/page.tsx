'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Calendar, TrendingUp, CheckCircle2, ArrowRight } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/client';
import { getGroupById, saveGroup } from '@/lib/store';
import { KutuGroup, Member } from '@/lib/types';
import { formatRM, getWinnerPayout, generateRounds } from '@/lib/utils';

export default function JoinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [group, setGroup] = useState<KutuGroup | null>(null);
  const [joined, setJoined] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single();
        setUserId(user.id);
        setUserName(profile?.name ?? user.email!.split('@')[0]);
      }
      const g = await getGroupById(id);
      if (g) {
        setGroup(g);
        if (user && g.members.some((m) => m.userId === user.id)) setAlreadyMember(true);
      }
      setPageLoading(false);
    }
    load();
  }, [id]);

  async function handleJoin() {
    if (!userId) { router.push(`/auth?mode=signup`); return; }
    if (!group) return;
    if (group.members.length >= group.totalSlots) return;
    setLoading(true);

    const newMember: Member = {
      id: uuidv4(), userId, name: userName,
      position: group.members.length + 1,
      joinedAt: new Date().toISOString(),
    };

    const updated: KutuGroup = { ...group, members: [...group.members, newMember] };
    updated.rounds = generateRounds(updated);
    await saveGroup(updated);
    setGroup(updated);
    setJoined(true);
    setLoading(false);
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!group) {
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

  const winnerPayout = getWinnerPayout(group);
  const isFull = group.members.length >= group.totalSlots;

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
            <p className="text-slate-500 mb-6">You&apos;ve joined <strong>{group.name}</strong>. Head to the group to see your payment schedule.</p>
            <Link href={`/groups/${group.id}`}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
              View Group <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <div className="text-center mb-6">
              <div className="inline-block bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">Group Invitation</div>
              <h2 className="text-2xl font-bold text-slate-900">{group.name}</h2>
              {group.description && <p className="text-slate-400 text-sm mt-1">{group.description}</p>}
              <p className="text-slate-500 text-sm mt-2">Invited by <strong>{group.createdByName}</strong></p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Monthly', value: formatRM(group.monthlyAmount), icon: Calendar },
                { label: 'You Collect', value: formatRM(winnerPayout), icon: TrendingUp },
                { label: 'Members', value: `${group.members.length}/${group.totalSlots}`, icon: Users },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className="font-bold text-slate-900 text-sm">{value}</div>
                  <div className="text-slate-400 text-xs mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {alreadyMember ? (
              <div className="text-center">
                <p className="text-slate-500 mb-4">You&apos;re already a member of this group.</p>
                <Link href={`/groups/${group.id}`}
                  className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
                  View Group <ArrowRight size={18} />
                </Link>
              </div>
            ) : isFull ? (
              <div className="text-center">
                <p className="text-slate-500 mb-2">This group is full ({group.totalSlots}/{group.totalSlots} members).</p>
                <Link href="/" className="text-emerald-600 hover:underline text-sm">Create your own group</Link>
              </div>
            ) : (
              <>
                <button onClick={handleJoin} disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold py-4 rounded-xl transition-colors text-base mb-3">
                  {loading ? 'Joining...' : userId ? 'Join This Group' : 'Sign Up & Join'}
                </button>
                {!userId && (
                  <p className="text-center text-xs text-slate-400">
                    Already have an account?{' '}
                    <Link href={`/auth`} className="text-emerald-600 hover:underline">Log in</Link>
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
