import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, addMonths } from 'date-fns';
import { KutuGroup, Round, Payment, Member } from './types';
import { v4 as uuidv4 } from 'uuid';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRM(amount: number): string {
  return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function generateRounds(group: KutuGroup): Round[] {
  const rounds: Round[] = [];
  const startDate = new Date(group.startDate);

  for (let i = 0; i < group.members.length; i++) {
    const roundDate = addMonths(startDate, i);
    const receiver = group.members[i];
    const month = format(roundDate, 'yyyy-MM');
    const now = new Date();
    const roundMonth = new Date(roundDate.getFullYear(), roundDate.getMonth(), 1);
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let status: Round['status'] = 'upcoming';
    if (roundMonth.getTime() === currentMonth.getTime()) status = 'active';
    if (roundMonth < currentMonth) status = 'completed';

    const payments: Payment[] = group.members.map((member) => ({
      id: uuidv4(),
      memberId: member.id,
      memberName: member.name,
      roundId: '',
      amount: group.monthlyAmount,
      status: status === 'completed' ? 'confirmed' : 'pending',
    }));

    const round: Round = {
      id: uuidv4(),
      roundNumber: i + 1,
      month,
      receiverId: receiver.id,
      receiverName: receiver.name,
      payments: payments.map((p) => ({ ...p, roundId: '' })),
      status,
    };

    round.payments = payments.map((p) => ({ ...p, roundId: round.id }));
    rounds.push(round);
  }

  return rounds;
}

export function getMonthLabel(month: string): string {
  const [year, mon] = month.split('-');
  const date = new Date(parseInt(year), parseInt(mon) - 1, 1);
  return format(date, 'MMMM yyyy');
}

export function getTotalPot(group: KutuGroup): number {
  return group.monthlyAmount * group.members.length;
}

export function getOrganizerFeePerRound(group: KutuGroup): number {
  const pot = getTotalPot(group);
  if (group.organizerFeeType === 'none') return 0;
  if (group.organizerFeeType === 'flat') return group.organizerFeeValue;
  if (group.organizerFeeType === 'percentage') return (pot * group.organizerFeeValue) / 100;
  return 0;
}

export function getWinnerPayout(group: KutuGroup): number {
  return getTotalPot(group) - getOrganizerFeePerRound(group);
}

export function getTotalOrganizerEarnings(group: KutuGroup): number {
  return getOrganizerFeePerRound(group) * group.members.length;
}

export function getRoundProgress(round: Round): number {
  if (round.payments.length === 0) return 0;
  const paid = round.payments.filter((p) => p.status === 'paid' || p.status === 'confirmed').length;
  return Math.round((paid / round.payments.length) * 100);
}
