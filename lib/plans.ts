export type Plan = 'free' | 'pro';

export interface PlanLimits {
  maxCreatedGroups: number;
  maxGroupMembers: number;
  autoReminders: boolean;
  fullHistory: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxCreatedGroups: 1,
    maxGroupMembers: 5,
    autoReminders: false,
    fullHistory: false,
  },
  pro: {
    maxCreatedGroups: Infinity,
    maxGroupMembers: 50,
    autoReminders: true,
    fullHistory: true,
  },
};

export const PRO_PRICE_RM = 9;

export function limitsFor(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}
