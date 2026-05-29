'use client';

import { createClient } from '@/lib/supabase/client';
import { KutuGroup, Member, Round, Payment, PayoutDetails } from './types';

// ─── Auth ──────────────────────────────────────────────────────────────────

export async function getCurrentUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) return null;
  return {
    id: profile.id,
    name: profile.name,
    email: user.email!,
    phone: profile.phone,
    createdAt: profile.created_at,
    payoutMethod: profile.payout_method ?? undefined,
    payoutBank: profile.payout_bank ?? undefined,
    payoutAccount: profile.payout_account ?? undefined,
    payoutQrUrl: profile.payout_qr_url ?? undefined,
    plan: (profile.plan as 'free' | 'pro') ?? 'free',
    planStatus: profile.plan_status ?? undefined,
    planRenewsAt: profile.plan_renews_at ?? undefined,
  };
}

// Number of active groups the current user has created (for plan gating)
export async function getMyCreatedGroupCount(): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('my_created_group_count');
  if (error || data == null) return 0;
  return Number(data);
}

// Kick off Stripe Checkout for the Pro plan
export async function startCheckout(): Promise<string> {
  const res = await fetch('/api/checkout', { method: 'POST' });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Could not start checkout.');
  return json.url as string;
}

// Open the Stripe billing portal (manage/cancel)
export async function openBillingPortal(): Promise<string> {
  const res = await fetch('/api/portal', { method: 'POST' });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Could not open billing portal.');
  return json.url as string;
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

// ─── Payout details ──────────────────────────────────────────────────────────

export async function updatePayoutDetails(details: {
  payoutMethod?: string;
  payoutBank?: string;
  payoutAccount?: string;
  payoutQrUrl?: string;
}): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not logged in.');

  const { error } = await supabase
    .from('profiles')
    .update({
      payout_method: details.payoutMethod ?? null,
      payout_bank: details.payoutBank ?? null,
      payout_account: details.payoutAccount ?? null,
      payout_qr_url: details.payoutQrUrl ?? null,
    })
    .eq('id', user.id);
  if (error) throw new Error(error.message);
}

export async function uploadPaymentQR(file: File): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not logged in.');

  const ext = file.name.split('.').pop() || 'png';
  const path = `${user.id}/qr.${ext}`;

  const { error } = await supabase.storage
    .from('payment-qrs')
    .upload(path, file, { upsert: true, cacheControl: '3600' });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('payment-qrs').getPublicUrl(path);
  // Cache-bust so an updated QR shows immediately
  return `${data.publicUrl}?v=${Date.now()}`;
}

// All members' payout details for a group (only callable by co-members)
export async function getGroupPayouts(groupId: string): Promise<Record<string, PayoutDetails>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_group_payouts', { gid: groupId });
  if (error || !data) return {};
  const map: Record<string, PayoutDetails> = {};
  for (const row of data as Record<string, unknown>[]) {
    map[row.user_id as string] = {
      userId: row.user_id as string,
      name: row.name as string,
      payoutMethod: (row.payout_method as string) ?? undefined,
      payoutBank: (row.payout_bank as string) ?? undefined,
      payoutAccount: (row.payout_account as string) ?? undefined,
      payoutQrUrl: (row.payout_qr_url as string) ?? undefined,
    };
  }
  return map;
}

// ─── Groups ────────────────────────────────────────────────────────────────

export async function getUserGroups(userId: string): Promise<KutuGroup[]> {
  const supabase = createClient();

  const { data: memberRows } = await supabase
    .from('members')
    .select('group_id')
    .eq('user_id', userId);

  const groupIds = memberRows?.map((m) => m.group_id) ?? [];

  const { data: groups } = await supabase
    .from('kutu_groups')
    .select('*')
    .or(`created_by.eq.${userId},id.in.(${groupIds.join(',') || 'null'})`);

  if (!groups?.length) return [];
  return Promise.all(groups.map((g) => hydrateGroup(g)));
}

export async function getGroupById(id: string): Promise<KutuGroup | null> {
  const supabase = createClient();
  const { data: g } = await supabase.from('kutu_groups').select('*').eq('id', id).single();
  if (!g) return null;
  return hydrateGroup(g);
}

async function hydrateGroup(g: Record<string, unknown>): Promise<KutuGroup> {
  const supabase = createClient();

  const { data: members } = await supabase
    .from('members')
    .select('*')
    .eq('group_id', g.id as string)
    .order('position');

  const { data: rounds } = await supabase
    .from('rounds')
    .select('*')
    .eq('group_id', g.id as string)
    .order('round_number');

  const roundIds = rounds?.map((r) => r.id) ?? [];
  const { data: payments } = roundIds.length
    ? await supabase.from('payments').select('*').in('round_id', roundIds)
    : { data: [] };

  const mappedMembers: Member[] = (members ?? []).map((m) => ({
    id: m.id,
    userId: m.user_id,
    name: m.name,
    phone: m.phone,
    position: m.position,
    joinedAt: m.joined_at,
  }));

  const mappedRounds: Round[] = (rounds ?? []).map((r) => ({
    id: r.id,
    roundNumber: r.round_number,
    month: r.month,
    receiverId: r.receiver_id,
    receiverName: r.receiver_name,
    status: r.status,
    payments: (payments ?? [])
      .filter((p) => p.round_id === r.id)
      .map((p) => ({
        id: p.id,
        memberId: p.member_id,
        memberName: p.member_name,
        roundId: p.round_id,
        amount: p.amount,
        status: p.status,
        method: p.method,
        reference: p.reference,
        paidAt: p.paid_at,
      })),
  }));

  return {
    id: g.id as string,
    name: g.name as string,
    description: g.description as string | undefined,
    monthlyAmount: g.monthly_amount as number,
    totalSlots: g.total_slots as number,
    startDate: g.start_date as string,
    payoutOrder: g.payout_order as 'fixed' | 'random',
    organizerFeeType: g.organizer_fee_type as 'none' | 'flat' | 'percentage',
    organizerFeeValue: g.organizer_fee_value as number,
    createdBy: g.created_by as string,
    createdByName: g.created_by_name as string,
    members: mappedMembers,
    rounds: mappedRounds,
    status: g.status as 'active' | 'completed' | 'pending',
    createdAt: g.created_at as string,
  };
}

export async function saveGroup(group: KutuGroup): Promise<void> {
  const supabase = createClient();

  const { error: groupErr } = await supabase.from('kutu_groups').upsert({
    id: group.id,
    name: group.name,
    description: group.description,
    monthly_amount: group.monthlyAmount,
    total_slots: group.totalSlots,
    start_date: group.startDate,
    payout_order: group.payoutOrder,
    organizer_fee_type: group.organizerFeeType,
    organizer_fee_value: group.organizerFeeValue,
    created_by: group.createdBy,
    created_by_name: group.createdByName,
    status: group.status,
  });
  if (groupErr) throw new Error(`Failed to save group: ${groupErr.message}`);

  // Upsert members
  if (group.members.length) {
    const { error: memberErr } = await supabase.from('members').upsert(
      group.members.map((m) => ({
        id: m.id,
        group_id: group.id,
        user_id: m.userId,
        name: m.name,
        phone: m.phone ?? null,
        position: m.position,
      }))
    );
    if (memberErr) throw new Error(`Failed to save members: ${memberErr.message}`);
  }

  // Upsert rounds, then all payments in one batch
  if (group.rounds.length) {
    const { error: roundsErr } = await supabase.from('rounds').upsert(
      group.rounds.map((round) => ({
        id: round.id,
        group_id: group.id,
        round_number: round.roundNumber,
        month: round.month,
        receiver_id: round.receiverId,
        receiver_name: round.receiverName,
        status: round.status,
      }))
    );
    if (roundsErr) throw new Error(`Failed to save rounds: ${roundsErr.message}`);

    const allPayments = group.rounds.flatMap((round) =>
      round.payments.map((p) => ({
        id: p.id,
        round_id: round.id,
        member_id: p.memberId,
        member_name: p.memberName,
        amount: p.amount,
        status: p.status,
        method: p.method ?? null,
        reference: p.reference ?? null,
        paid_at: p.paidAt ?? null,
      }))
    );
    if (allPayments.length) {
      const { error: payErr } = await supabase.from('payments').upsert(allPayments);
      if (payErr) throw new Error(`Failed to save payments: ${payErr.message}`);
    }
  }
}

export async function deleteGroup(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('kutu_groups').delete().eq('id', id);
}

export interface GroupPreview {
  id: string;
  name: string;
  description: string | null;
  monthlyAmount: number;
  totalSlots: number;
  organizerFeeType: 'none' | 'flat' | 'percentage';
  organizerFeeValue: number;
  createdByName: string;
  memberCount: number;
  isMember: boolean;
}

// Public preview — works for anonymous + non-member users via SECURITY DEFINER RPC
export async function getGroupPreview(id: string): Promise<GroupPreview | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_group_preview', { gid: id }).single();
  if (error || !data) return null;
  const d = data as Record<string, unknown>;
  return {
    id: d.id as string,
    name: d.name as string,
    description: d.description as string | null,
    monthlyAmount: Number(d.monthly_amount),
    totalSlots: d.total_slots as number,
    organizerFeeType: d.organizer_fee_type as GroupPreview['organizerFeeType'],
    organizerFeeValue: Number(d.organizer_fee_value),
    createdByName: d.created_by_name as string,
    memberCount: Number(d.member_count),
    isMember: d.is_member as boolean,
  };
}

// Atomic join via SECURITY DEFINER RPC (adds member + rebuilds schedule)
export async function joinGroup(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc('join_group', { gid: id });
  if (error) throw new Error(error.message);
}

export async function updatePaymentStatus(
  paymentId: string,
  status: Payment['status'],
  method?: string
): Promise<void> {
  const supabase = createClient();
  await supabase
    .from('payments')
    .update({ status, method: method ?? null, paid_at: status === 'paid' ? new Date().toISOString() : null })
    .eq('id', paymentId);
}
