export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  payoutMethod?: string;
  payoutBank?: string;
  payoutAccount?: string;
  payoutQrUrl?: string;
  plan?: 'free' | 'pro';
  planStatus?: string;
  planRenewsAt?: string;
}

export interface PayoutDetails {
  userId: string;
  name: string;
  payoutMethod?: string;
  payoutBank?: string;
  payoutAccount?: string;
  payoutQrUrl?: string;
}

export interface Member {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  position: number;
  joinedAt: string;
}

export interface Payment {
  id: string;
  memberId: string;
  memberName: string;
  roundId: string;
  amount: number;
  status: 'pending' | 'paid' | 'confirmed';
  method?: 'DuitNow' | 'Bank Transfer' | 'Cash' | 'TNG eWallet';
  reference?: string;
  paidAt?: string;
}

export interface Round {
  id: string;
  roundNumber: number;
  month: string;
  receiverId: string;
  receiverName: string;
  payments: Payment[];
  status: 'upcoming' | 'active' | 'completed';
}

export interface KutuGroup {
  id: string;
  name: string;
  description?: string;
  monthlyAmount: number;
  totalSlots: number;
  startDate: string;
  payoutOrder: 'random' | 'fixed';
  organizerFeeType: 'none' | 'flat' | 'percentage';
  organizerFeeValue: number; // RM if flat, % value if percentage (e.g. 5 = 5%)
  createdBy: string;
  createdByName: string;
  members: Member[];
  rounds: Round[];
  status: 'active' | 'completed' | 'pending';
  createdAt: string;
}
