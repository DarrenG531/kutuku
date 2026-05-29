'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Users, Calendar, TrendingUp, ArrowRight, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getUserGroups } from '@/lib/store';
import { KutuGroup } from '@/lib/types';
import { formatRM, getMonthLabel, getTotalPot, getWinnerPayout } from '@/lib/utils';
import Navbar from '@/components/Navbar';
import { format } from 'date-fns';

export default function DashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [groups, setGroups] = useState<KutuGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }

      const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single();
      const name = profile?.name ?? user.email!.split('@')[0];
      setUserName(name);
      setUserId(user.id);

      const g = await getUserGroups(user.id);
      setGroups(g);
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading your groups...</div>
      </div>
    );
  }

  const activeGroups = groups.filter((g) => g.status === 'active');
  const totalSaving = groups.reduce((acc, g) => acc + g.monthlyAmount, 0);
  const totalPot = groups.reduce((acc, g) => acc + getTotalPot(g), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar userName={userName} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Selamat datang, {userName.split(' ')[0]} 👋
            </h1>
            <p className="text-slate-500 mt-1">Here are your active kutu groups.</p>
          </div>
          <Link
            href="/groups/create"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 py-3 rounded-xl transition-colors"
          >
            <Plus size={18} />
            New Group
          </Link>
        </div>

        {groups.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Active Groups', value: activeGroups.length, icon: Users },
              { label: 'Monthly Contribution', value: formatRM(totalSaving), icon: Calendar },
              { label: 'Total Pot Value', value: formatRM(totalPot), icon: TrendingUp },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-3">
                  <Icon size={20} className="text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{value}</div>
                <div className="text-slate-500 text-sm mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}

        {groups.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-emerald-500" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">No groups yet</h2>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">
              Start your first kutu group and invite your friends in seconds.
            </p>
            <Link
              href="/groups/create"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              <Plus size={18} />
              Create Your First Group
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => {
              const currentRound = group.rounds.find((r) => r.status === 'active') || group.rounds[0];
              const myMember = group.members.find((m) => m.userId === userId);
              const myPayment = currentRound?.payments.find((p) => p.memberId === myMember?.id);
              const isMyTurn = currentRound?.receiverId === myMember?.id;
              const winnerPayout = getWinnerPayout(group);

              return (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all p-6 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-lg leading-tight">{group.name}</h3>
                      {group.description && (
                        <p className="text-slate-400 text-xs mt-0.5 line-clamp-1">{group.description}</p>
                      )}
                    </div>
                    {isMyTurn && (
                      <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ml-2">
                        Your turn! 🎉
                      </span>
                    )}
                    {!isMyTurn && myPayment?.status === 'pending' && (
                      <span className="bg-red-50 text-red-600 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ml-2">
                        Unpaid
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 mb-5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Monthly</span>
                      <span className="font-semibold text-slate-700">{formatRM(group.monthlyAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Members</span>
                      <span className="font-semibold text-slate-700">{group.members.length}/{group.totalSlots}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">You Collect</span>
                      <span className="font-semibold text-emerald-600">{formatRM(winnerPayout)}</span>
                    </div>
                    {currentRound && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Current</span>
                        <span className="font-semibold text-slate-700">{getMonthLabel(currentRound.month)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                      <Clock size={12} />
                      <span>Started {format(new Date(group.startDate), 'MMM yyyy')}</span>
                    </div>
                    <ArrowRight size={16} className="text-emerald-500 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
