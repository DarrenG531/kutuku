import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Stripe needs the raw body to verify the signature.
export async function POST(req: Request) {
  const stripe = getStripe();
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid signature';
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  const admin = createAdminClient();

  async function setPlanByCustomer(
    customerId: string,
    plan: 'free' | 'pro',
    sub?: Stripe.Subscription
  ) {
    await admin
      .from('profiles')
      .update({
        plan,
        plan_status: sub?.status ?? (plan === 'pro' ? 'active' : 'canceled'),
        stripe_subscription_id: sub?.id ?? null,
        plan_renews_at: sub?.items?.data?.[0]?.current_period_end
          ? new Date(sub.items.data[0].current_period_end * 1000).toISOString()
          : null,
      })
      .eq('stripe_customer_id', customerId);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'subscription' && session.customer) {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        await setPlanByCustomer(session.customer as string, 'pro', sub);
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const sub = event.data.object as Stripe.Subscription;
      const active = sub.status === 'active' || sub.status === 'trialing';
      await setPlanByCustomer(sub.customer as string, active ? 'pro' : 'free', sub);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await setPlanByCustomer(sub.customer as string, 'free', sub);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
