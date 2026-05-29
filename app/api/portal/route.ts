import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const stripe = getStripe();
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: 'No subscription found' }, { status: 400 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id as string,
    return_url: `${origin}/settings`,
  });

  return NextResponse.json({ url: session.url });
}
