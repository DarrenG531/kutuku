-- ============================================================
-- Member payout details + QR storage
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS payout_method  text,
  ADD COLUMN IF NOT EXISTS payout_bank    text,
  ADD COLUMN IF NOT EXISTS payout_account text,
  ADD COLUMN IF NOT EXISTS payout_qr_url  text;

-- Co-members (and admin) of a group can see each other's payout details
-- so they know where to send money. SECURITY DEFINER bypasses the
-- profiles "own row only" policy, but the WHERE clause restricts access
-- to callers who are actually in the same group.
CREATE OR REPLACE FUNCTION public.get_group_payouts(gid uuid)
RETURNS TABLE (
  user_id        uuid,
  name           text,
  payout_method  text,
  payout_bank    text,
  payout_account text,
  payout_qr_url  text
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT p.id, p.name, p.payout_method, p.payout_bank, p.payout_account, p.payout_qr_url
  FROM profiles p
  JOIN members m ON m.user_id = p.id AND m.group_id = gid
  WHERE public.is_member_of(gid) OR public.is_group_admin(gid);
$$;

GRANT EXECUTE ON FUNCTION public.get_group_payouts(uuid) TO authenticated;

-- ── QR image storage bucket (public read) ───────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-qrs', 'payment-qrs', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "qr_public_read" ON storage.objects;
CREATE POLICY "qr_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-qrs');

DROP POLICY IF EXISTS "qr_own_insert" ON storage.objects;
CREATE POLICY "qr_own_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-qrs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "qr_own_update" ON storage.objects;
CREATE POLICY "qr_own_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'payment-qrs' AND (storage.foldername(name))[1] = auth.uid()::text);
