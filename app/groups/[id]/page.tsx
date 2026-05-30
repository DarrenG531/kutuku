'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, Copy, CheckCircle2, Clock, Users, Calendar,
  TrendingUp, ChevronDown, ChevronUp, Share2, Trash2, UserPlus, Crown, Wallet, AlertCircle, Bell, Sparkles
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getGroupById, deleteGroup, updatePaymentStatus, getGroupPayouts } from '@/lib/store';
import { KutuGroup, Payment, PayoutDetails, Round } from '@/lib/types';
import { formatRM, getMonthLabel, getTotalPot, getRoundProgress, getOrganizerFeePerRound, getWinnerPayout, getTotalOrganizerEarnings } from '@/lib/utils';
import Navbar from '@/components/Navbar';
import { format } from 'date-fns';

export default function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [group, setGroup] = useState<KutuGroup | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedRound, setExpandedRound] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'rounds' | 'members'>('rounds');
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<Record<string, PayoutDetails>>({});
  const [plan, setPlan] = useState<'free' | 'pro'>('free');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }

      const { data: profile } = await supabase.from('profiles').select('name, plan').eq('id', user.id).single();
      setUserName(profile?.name ?? user.email!.split('@')[0]);
      setPlan((profile?.plan as 'free' | 'pro') ?? 'free');
      setUserId(user.id);

      const g = await getGroupById(id);
      if (!g) { router.push('/dashboard'); return; }
      setGroup(g);
      const active = g.rounds.find((r) => r.status === 'active');
      if (active) setExpandedRound(active.id);

      const p = await getGroupPayouts(id);
      setPayouts(p);
      setLoading(false);
    }
    load();
  }, [id, router]);

  function copyInviteLink() {
    navigator.clipboard.writeText(`${window.location.origin}/groups/${id}/join`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareViaWhatsApp() {
    const url = `${window.location.origin}/groups/${id}/join`;
    const msg = encodeURIComponent(`Jom join kutu group "${group?.name}"! 🤝\n\nClick link ni untuk join:\n${url}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }

  // Pro feature: one-tap WhatsApp reminder for unpaid members of a round
  function sendReminder(round: Round) {
    if (!group) return;
    if (plan !== 'pro') { router.push('/upgrade'); return; }

    const unpaid = round.payments.filter((p) => p.status === 'pending');
    if (unpaid.length === 0) return;

    const receiverPayout = payoutForReceiver(round.receiverId);
    const names = unpaid.map((p) => `• ${p.memberName}`).join('\n');

    let payLine = `Pay to: *${round.receiverName}*`;
    if (receiverPayout?.payoutMethod) payLine += ` (${receiverPayout.payoutMethod})`;
    if (receiverPayout?.payoutBank) payLine += `\n${receiverPayout.payoutBank}`;
    if (receiverPayout?.payoutAccount) payLine += `\nAcc: ${receiverPayout.payoutAccount}`;

    const msg =
      `📢 *Kutu ${group.name}* — Reminder for ${getMonthLabel(round.month)}\n\n` +
      `Belum bayar lagi (not paid yet):\n${names}\n\n` +
      `Amount: *${formatRM(group.monthlyAmount)}* each\n${payLine}\n\n` +
      `Terima kasih! 🙏`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }

  async function markPayment(paymentId: string, status: Payment['status']) {
    if (!group) return;
    await updatePaymentStatus(paymentId, status);
    // Refresh group
    const updated = await getGroupById(id);
    if (updated) setGroup(updated);
  }

  async function handleDelete() {
    if (!group) return;
    if (!confirm(`Delete "${group.name}"? This cannot be undone.`)) return;
    await deleteGroup(group.id);
    router.push('/dashboard');
  }

  if (loading || !group) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading group...</div>
      </div>
    );
  }

  const myMember = group.members.find((m) => m.userId === userId);
  const isAdmin = group.createdBy === userId;
  const totalPot = getTotalPot(group);
  const organizerFee = getOrganizerFeePerRound(group);
  const winnerPayout = getWinnerPayout(group);
  const totalOrganizerEarnings = getTotalOrganizerEarnings(group);
  const activeRound = group.rounds.find((r) => r.status === 'active');

  // Map a round's receiver (member id) to their saved payout details
  function payoutForReceiver(receiverId: string): PayoutDetails | null {
    const member = group!.members.find((m) => m.id === receiverId);
    if (!member) return null;
    return payouts[member.userId] ?? null;
  }

  const hasPayoutInfo = (p: PayoutDetails | null) =>
    !!(p && (p.payoutAccount || p.payoutQrUrl));

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar userName={userName} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div>
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm mb-3">
              <ArrowLeft size={16} />Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{group.name}</h1>
              {isAdmin && <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full">Admin</span>}
            </div>
            {group.description && <p className="text-slate-400 text-sm mt-1">{group.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={shareViaWhatsApp}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
              <Share2 size={15} />Share
            </button>
            <button onClick={copyInviteLink}
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
              {copied ? <CheckCircle2 size={15} className="text-emerald-500" /> : <Copy size={15} />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            {isAdmin && (
              <button onClick={handleDelete}
                className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-slate-200">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Monthly', value: formatRM(group.monthlyAmount) },
            { label: 'Winner Gets', value: formatRM(winnerPayout) },
            { label: 'Members', value: `${group.members.length}/${group.totalSlots}` },
            { label: 'Duration', value: `${group.rounds.length} months` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
              <div className="text-lg font-bold text-slate-900">{value}</div>
              <div className="text-slate-400 text-xs mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Organizer earnings banner */}
        {isAdmin && organizerFee > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
              <Crown size={18} className="text-amber-500" />
            </div>
            <div>
              <div className="text-sm font-semibold text-amber-800">You earn {formatRM(organizerFee)} per round as tukang kutu</div>
              <div className="text-xs text-amber-600">Total over {group.rounds.length} rounds: <strong>{formatRM(totalOrganizerEarnings)}</strong></div>
            </div>
          </div>
        )}

        {/* Active round banner */}
        {activeRound && (() => {
          const receiverPayout = payoutForReceiver(activeRound.receiverId);
          const receiverIsMe = activeRound.receiverId === myMember?.id;
          return (
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-6 mb-8 text-white">
            <div className="text-emerald-100 text-sm font-medium mb-1">This Month — {getMonthLabel(activeRound.month)}</div>
            <div className="text-2xl font-bold mb-0.5">🎉 {activeRound.receiverName} collects {formatRM(winnerPayout)}</div>
            {organizerFee > 0 && (
              <div className="text-emerald-100 text-sm flex items-center gap-1 mb-1">
                <Crown size={12} />
                <span>+ {formatRM(organizerFee)} to {group.createdByName} (tukang kutu)</span>
              </div>
            )}
            <div className="text-emerald-100 text-sm">
              {activeRound.payments.filter((p) => p.status !== 'pending').length} of {activeRound.payments.length} payments received
            </div>
            <div className="mt-3 bg-white/20 rounded-full h-2">
              <div className="bg-white rounded-full h-2 transition-all" style={{ width: `${getRoundProgress(activeRound)}%` }} />
            </div>

            {/* Reminder button (Pro) */}
            {activeRound.payments.some((p) => p.status === 'pending') && (
              <button onClick={() => sendReminder(activeRound)}
                className="mt-4 inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/30 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors backdrop-blur">
                <Bell size={15} />
                Remind {activeRound.payments.filter((p) => p.status === 'pending').length} unpaid via WhatsApp
                {plan !== 'pro' && <Sparkles size={13} className="text-amber-200" />}
              </button>
            )}

            {/* Where to send money */}
            <div className="mt-5 bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
              {hasPayoutInfo(receiverPayout) ? (
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 text-emerald-50 text-xs font-semibold uppercase tracking-wide mb-2">
                      <Wallet size={13} />
                      Send {activeRound.receiverName}&apos;s payment to
                    </div>
                    {receiverPayout!.payoutMethod && (
                      <div className="text-sm"><span className="text-emerald-100">Method:</span> <strong>{receiverPayout!.payoutMethod}</strong></div>
                    )}
                    {receiverPayout!.payoutBank && (
                      <div className="text-sm"><span className="text-emerald-100">Bank:</span> <strong>{receiverPayout!.payoutBank}</strong></div>
                    )}
                    {receiverPayout!.payoutAccount && (
                      <div className="text-sm"><span className="text-emerald-100">Account:</span> <strong>{receiverPayout!.payoutAccount}</strong></div>
                    )}
                  </div>
                  {receiverPayout!.payoutQrUrl && (
                    <div className="bg-white rounded-lg p-2 shrink-0">
                      <div className="relative w-28 h-28">
                        <Image src={receiverPayout!.payoutQrUrl} alt="Payment QR" fill className="object-contain" unoptimized />
                      </div>
                    </div>
                  )}
                </div>
              ) : receiverIsMe ? (
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle size={16} className="text-amber-200 shrink-0" />
                  <span className="text-emerald-50">
                    It&apos;s your turn to collect! {' '}
                    <Link href="/settings" className="underline font-semibold text-white">Add your payout details</Link>{' '}
                    so members know where to pay you.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-emerald-50">
                  <AlertCircle size={16} className="text-amber-200 shrink-0" />
                  <span>{activeRound.receiverName} hasn&apos;t added payout details yet.</span>
                </div>
              )}
            </div>
          </div>
          );
        })()}

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-slate-100 rounded-xl p-1 mb-6 shadow-sm w-fit">
          {(['rounds', 'members'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${activeTab === tab ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {tab === 'rounds' ? 'Payment Rounds' : 'Members'}
            </button>
          ))}
        </div>

        {/* Rounds */}
        {activeTab === 'rounds' && (
          <div className="space-y-3">
            {group.rounds.map((round) => {
              const isExpanded = expandedRound === round.id;
              const progress = getRoundProgress(round);
              const myPayment = round.payments.find((p) => p.memberId === myMember?.id);
              const isMyReceiving = round.receiverId === myMember?.id;

              return (
                <div key={round.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${round.status === 'active' ? 'border-emerald-200' : 'border-slate-100'}`}>
                  <button onClick={() => setExpandedRound(isExpanded ? null : round.id)}
                    className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors text-left">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${round.status === 'completed' ? 'bg-slate-100 text-slate-400' : round.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                        {round.roundNumber}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{getMonthLabel(round.month)}</div>
                        <div className="text-sm text-slate-400">
                          {round.receiverName} receives {formatRM(winnerPayout)}
                          {organizerFee > 0 && <span className="text-amber-500 ml-1">+ {formatRM(organizerFee)} fee</span>}
                          {isMyReceiving && <span className="text-emerald-600 font-medium ml-1">— That&apos;s you! 🎉</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {round.status === 'active' && (
                        <div className="hidden sm:flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full">
                            <div className="h-1.5 bg-emerald-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-xs text-slate-400">{progress}%</span>
                        </div>
                      )}
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${round.status === 'completed' ? 'bg-slate-100 text-slate-400' : round.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-50 text-slate-400'}`}>
                        {round.status === 'completed' ? '✓ Done' : round.status === 'active' ? 'Active' : 'Upcoming'}
                      </span>
                      {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-50 px-5 pb-5">
                      <div className="mt-4 space-y-2">
                        {round.payments.map((payment) => (
                          <div key={payment.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 bg-white border border-slate-200 rounded-full flex items-center justify-center text-xs font-semibold text-slate-600">
                                {payment.memberName.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-slate-700">{payment.memberName}</span>
                              {payment.method && <span className="text-xs text-slate-400 hidden sm:block">via {payment.method}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-700">{formatRM(payment.amount)}</span>
                              {payment.status === 'confirmed' || round.status === 'completed' ? (
                                <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                                  <CheckCircle2 size={12} />Paid
                                </span>
                              ) : payment.status === 'paid' ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">Confirming</span>
                                  {isAdmin && (
                                    <button onClick={() => markPayment(payment.id, 'confirmed')}
                                      className="text-xs text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-full transition-colors">
                                      Confirm
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-slate-400 bg-white px-2.5 py-1 rounded-full border border-slate-200">Pending</span>
                                  {payment.memberId === myMember?.id && (
                                    <button onClick={() => markPayment(payment.id, 'paid')}
                                      className="text-xs text-white bg-emerald-500 hover:bg-emerald-600 px-2.5 py-1 rounded-full transition-colors">
                                      Mark Paid
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Members */}
        {activeTab === 'members' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-50">
              <h3 className="font-semibold text-slate-900">Members ({group.members.length}/{group.totalSlots})</h3>
              {group.members.length < group.totalSlots && (
                <button onClick={copyInviteLink} className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                  <UserPlus size={15} />Invite
                </button>
              )}
            </div>
            <div className="divide-y divide-slate-50">
              {group.members.map((member) => {
                const receivingRound = group.rounds.find((r) => r.receiverId === member.id);
                return (
                  <div key={member.id} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center">
                        <span className="text-emerald-700 font-semibold text-sm">{member.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <div className="font-medium text-slate-800 text-sm flex items-center gap-2">
                          {member.name}
                          {member.userId === group.createdBy && <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Admin</span>}
                          {member.userId === userId && <span className="text-xs text-slate-400">(You)</span>}
                        </div>
                        <div className="text-xs text-slate-400">Slot #{member.position} • Joined {format(new Date(member.joinedAt), 'dd MMM yyyy')}</div>
                      </div>
                    </div>
                    {receivingRound && (
                      <div className="text-right">
                        <div className="text-xs text-slate-400">Collects in</div>
                        <div className="text-sm font-semibold text-slate-700">{getMonthLabel(receivingRound.month)}</div>
                      </div>
                    )}
                  </div>
                );
              })}
              {group.members.length < group.totalSlots && (
                <div className="px-5 py-4 text-sm text-slate-400 text-center">
                  {group.totalSlots - group.members.length} slot{group.totalSlots - group.members.length !== 1 ? 's' : ''} remaining •{' '}
                  <button onClick={copyInviteLink} className="text-emerald-600 hover:underline">Copy invite link</button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
