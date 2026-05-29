-- ============================================================
-- Fix RLS recursion + missing payments INSERT policy
-- ============================================================

-- SECURITY DEFINER helpers bypass RLS internally → no recursion
CREATE OR REPLACE FUNCTION public.is_member_of(gid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM members WHERE group_id = gid AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(gid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM kutu_groups WHERE id = gid AND created_by = auth.uid());
$$;

-- ── Groups ──────────────────────────────────────────────
DROP POLICY IF EXISTS "groups_read" ON kutu_groups;
CREATE POLICY "groups_read" ON kutu_groups FOR SELECT
  USING (created_by = auth.uid() OR public.is_member_of(id));

-- ── Members (fix self-recursion) ────────────────────────
DROP POLICY IF EXISTS "members_read" ON members;
CREATE POLICY "members_read" ON members FOR SELECT
  USING (user_id = auth.uid() OR public.is_member_of(group_id) OR public.is_group_admin(group_id));

DROP POLICY IF EXISTS "members_delete" ON members;
CREATE POLICY "members_delete" ON members FOR DELETE
  USING (user_id = auth.uid() OR public.is_group_admin(group_id));

-- ── Rounds ──────────────────────────────────────────────
DROP POLICY IF EXISTS "rounds_read" ON rounds;
CREATE POLICY "rounds_read" ON rounds FOR SELECT
  USING (public.is_member_of(group_id) OR public.is_group_admin(group_id));

DROP POLICY IF EXISTS "rounds_write" ON rounds;
CREATE POLICY "rounds_write" ON rounds FOR ALL
  USING (public.is_group_admin(group_id))
  WITH CHECK (public.is_group_admin(group_id));

-- ── Payments (add missing INSERT + fix read) ────────────
DROP POLICY IF EXISTS "payments_read" ON payments;
CREATE POLICY "payments_read" ON payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM rounds r
    WHERE r.id = round_id AND (public.is_member_of(r.group_id) OR public.is_group_admin(r.group_id))
  ));

CREATE POLICY "payments_insert" ON payments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM rounds r
    WHERE r.id = round_id AND public.is_group_admin(r.group_id)
  ));

DROP POLICY IF EXISTS "payments_member_update" ON payments;
CREATE POLICY "payments_member_update" ON payments FOR UPDATE
  USING (public.is_member_of((SELECT group_id FROM rounds WHERE rounds.id = round_id)));

DROP POLICY IF EXISTS "payments_admin_update" ON payments;
CREATE POLICY "payments_admin_update" ON payments FOR UPDATE
  USING (public.is_group_admin((SELECT group_id FROM rounds WHERE rounds.id = round_id)));
