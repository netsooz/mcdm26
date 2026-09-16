/**
 * Billing plans. Amounts are in paise (Razorpay's smallest currency unit):
 * 199900 paise = ₹1,999.00.
 */
export type PlanInterval = 'month' | 'year' | 'lifetime';

export interface Plan {
  id: string;
  name: string;
  tagline: string;
  amountPaise: number;
  currency: 'INR';
  interval: PlanInterval;
  /** Marketing bullets shown on the pricing page. */
  features: string[];
  highlight?: boolean;
  badge?: string;
}

export const PLANS: Plan[] = [
  {
    id: 'pro-monthly',
    name: 'Pro',
    tagline: 'For individual analysts running decisions month to month.',
    amountPaise: 199900,
    currency: 'INR',
    interval: 'month',
    features: [
      'All 11 decision tools',
      'All 50+ MCDM methods',
      'Unlimited PDF & Word reports',
      'Cross-method consensus ranking',
      'Sensitivity analysis',
      'Email support',
    ],
  },
  {
    id: 'pro-yearly',
    name: 'Pro Annual',
    tagline: 'Same as Pro, two months free when you pay yearly.',
    amountPaise: 1999000,
    currency: 'INR',
    interval: 'year',
    highlight: true,
    badge: 'Best value',
    features: [
      'Everything in Pro',
      '2 months free vs. monthly',
      'Priority email support',
      'Saved analysis history',
      'Branded report exports',
    ],
  },
  {
    id: 'team-yearly',
    name: 'Team',
    tagline: 'For procurement and strategy teams evaluating together.',
    amountPaise: 4999000,
    currency: 'INR',
    interval: 'year',
    features: [
      'Everything in Pro Annual',
      'Up to 10 seats',
      'Shared criteria templates',
      'Onboarding session',
      'Dedicated support channel',
    ],
  },
];

export function getPlan(planId: string): Plan | undefined {
  return PLANS.find(plan => plan.id === planId);
}

export function formatPrice(plan: Plan): string {
  const rupees = plan.amountPaise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: plan.currency,
    maximumFractionDigits: 0,
  }).format(rupees);
}

export function intervalLabel(plan: Plan): string {
  if (plan.interval === 'lifetime') return 'one-time';
  return `per ${plan.interval}`;
}

/** How long a paid plan grants access for, from the moment of payment. */
export function periodEndFrom(date: Date, interval: PlanInterval): Date | null {
  const end = new Date(date);
  if (interval === 'month') end.setMonth(end.getMonth() + 1);
  else if (interval === 'year') end.setFullYear(end.getFullYear() + 1);
  else return null; // lifetime
  return end;
}
