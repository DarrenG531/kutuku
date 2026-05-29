-- ============================================================
-- Per-user subscription (Free / Pro) via Stripe
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan                   text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_customer_id     text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS plan_status            text,
  ADD COLUMN IF NOT EXISTS plan_renews_at         timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer
  ON profiles (stripe_customer_id);

-- How many active groups a user has created (for free-tier gating).
-- SECURITY DEFINER so it can count regardless of RLS.
CREATE OR REPLACE FUNCTION public.my_created_group_count()
RETURNS int
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT count(*)::int FROM kutu_groups
  WHERE created_by = auth.uid() AND status != 'completed';
$$;

GRANT EXECUTE ON FUNCTION public.my_created_group_count() TO authenticated;
