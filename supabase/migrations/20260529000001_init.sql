-- ============================================================
-- Kutuku — Initial Schema
-- ============================================================

-- Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  phone      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kutu Groups
CREATE TABLE IF NOT EXISTS kutu_groups (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  description          TEXT,
  monthly_amount       NUMERIC(10,2) NOT NULL,
  total_slots          INTEGER NOT NULL,
  start_date           DATE NOT NULL,
  payout_order         TEXT NOT NULL DEFAULT 'fixed',
  organizer_fee_type   TEXT NOT NULL DEFAULT 'none',
  organizer_fee_value  NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_by           UUID NOT NULL REFERENCES profiles(id),
  created_by_name      TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'active',
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Members
CREATE TABLE IF NOT EXISTS members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES kutu_groups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id),
  name       TEXT NOT NULL,
  phone      TEXT,
  position   INTEGER NOT NULL,
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

-- Rounds
CREATE TABLE IF NOT EXISTS rounds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID NOT NULL REFERENCES kutu_groups(id) ON DELETE CASCADE,
  round_number  INTEGER NOT NULL,
  month         TEXT NOT NULL,
  receiver_id   UUID REFERENCES members(id),
  receiver_name TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'upcoming',
  UNIQUE (group_id, round_number)
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id    UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  member_id   UUID NOT NULL REFERENCES members(id),
  member_name TEXT NOT NULL,
  amount      NUMERIC(10,2) NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  method      TEXT,
  reference   TEXT,
  paid_at     TIMESTAMPTZ
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE kutu_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds      ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments    ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/write their own profile
CREATE POLICY "profiles_own" ON profiles
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Groups: visible to members + creator; writable by creator
CREATE POLICY "groups_read" ON kutu_groups
  FOR SELECT USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM members WHERE members.group_id = kutu_groups.id AND members.user_id = auth.uid())
  );
CREATE POLICY "groups_insert" ON kutu_groups
  FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "groups_update" ON kutu_groups
  FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "groups_delete" ON kutu_groups
  FOR DELETE USING (created_by = auth.uid());

-- Members: readable by group members; insertable by anyone (joining)
CREATE POLICY "members_read" ON members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM members m2 WHERE m2.group_id = members.group_id AND m2.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM kutu_groups WHERE kutu_groups.id = members.group_id AND kutu_groups.created_by = auth.uid())
  );
CREATE POLICY "members_insert" ON members
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "members_delete" ON members
  FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM kutu_groups WHERE kutu_groups.id = members.group_id AND kutu_groups.created_by = auth.uid())
  );

-- Rounds: readable by group members; writable by group creator
CREATE POLICY "rounds_read" ON rounds
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM members WHERE members.group_id = rounds.group_id AND members.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM kutu_groups WHERE kutu_groups.id = rounds.group_id AND kutu_groups.created_by = auth.uid())
  );
CREATE POLICY "rounds_write" ON rounds
  FOR ALL USING (
    EXISTS (SELECT 1 FROM kutu_groups WHERE kutu_groups.id = rounds.group_id AND kutu_groups.created_by = auth.uid())
  );

-- Payments: readable by group members; members update own, admin updates all
CREATE POLICY "payments_read" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rounds r
      JOIN members m ON m.group_id = r.group_id
      WHERE r.id = payments.round_id AND m.user_id = auth.uid()
    )
  );
CREATE POLICY "payments_member_update" ON payments
  FOR UPDATE USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );
CREATE POLICY "payments_admin_update" ON payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM rounds r
      JOIN kutu_groups g ON g.id = r.group_id
      WHERE r.id = payments.round_id AND g.created_by = auth.uid()
    )
  );

-- ============================================================
-- Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
