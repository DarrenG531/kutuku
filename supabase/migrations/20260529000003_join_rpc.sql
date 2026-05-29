-- ============================================================
-- Public group preview + atomic join via SECURITY DEFINER RPCs
-- ============================================================

-- Returns safe, limited preview info for the join page.
-- Callable by anyone (including anonymous) since it only exposes
-- non-sensitive fields needed to decide whether to join.
CREATE OR REPLACE FUNCTION public.get_group_preview(gid uuid)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  monthly_amount numeric,
  total_slots int,
  organizer_fee_type text,
  organizer_fee_value numeric,
  created_by_name text,
  member_count bigint,
  is_member boolean
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT
    g.id, g.name, g.description, g.monthly_amount, g.total_slots,
    g.organizer_fee_type, g.organizer_fee_value, g.created_by_name,
    (SELECT count(*) FROM members m WHERE m.group_id = g.id) AS member_count,
    EXISTS (SELECT 1 FROM members m WHERE m.group_id = g.id AND m.user_id = auth.uid()) AS is_member
  FROM kutu_groups g
  WHERE g.id = gid;
$$;

-- Rebuilds the full round + payment schedule for a group based on
-- its current members. Mirrors the client-side generateRounds().
CREATE OR REPLACE FUNCTION public.regenerate_rounds(gid uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g          kutu_groups%ROWTYPE;
  m          RECORD;
  i          int := 0;
  new_round  uuid;
  rdate      date;
  rmonth     text;
  rstatus    text;
  cur_month  date := date_trunc('month', current_date);
BEGIN
  SELECT * INTO g FROM kutu_groups WHERE id = gid;
  IF NOT FOUND THEN RETURN; END IF;

  DELETE FROM rounds WHERE group_id = gid;  -- payments cascade

  FOR m IN SELECT * FROM members WHERE group_id = gid ORDER BY position LOOP
    rdate  := (g.start_date + (i || ' months')::interval)::date;
    rmonth := to_char(rdate, 'YYYY-MM');

    IF date_trunc('month', rdate) < cur_month THEN
      rstatus := 'completed';
    ELSIF date_trunc('month', rdate) = cur_month THEN
      rstatus := 'active';
    ELSE
      rstatus := 'upcoming';
    END IF;

    INSERT INTO rounds (group_id, round_number, month, receiver_id, receiver_name, status)
    VALUES (gid, i + 1, rmonth, m.id, m.name, rstatus)
    RETURNING id INTO new_round;

    INSERT INTO payments (round_id, member_id, member_name, amount, status)
    SELECT new_round, mm.id, mm.name, g.monthly_amount,
           CASE WHEN rstatus = 'completed' THEN 'confirmed' ELSE 'pending' END
    FROM members mm WHERE mm.group_id = gid;

    i := i + 1;
  END LOOP;
END;
$$;

-- Atomically adds the current user to a group and rebuilds the schedule.
CREATE OR REPLACE FUNCTION public.join_group(gid uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g      kutu_groups%ROWTYPE;
  uid    uuid := auth.uid();
  uname  text;
  cnt    int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'You must be logged in to join.'; END IF;

  SELECT * INTO g FROM kutu_groups WHERE id = gid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Group not found.'; END IF;

  IF EXISTS (SELECT 1 FROM members WHERE group_id = gid AND user_id = uid) THEN
    RETURN;  -- already a member, no-op
  END IF;

  SELECT count(*) INTO cnt FROM members WHERE group_id = gid;
  IF cnt >= g.total_slots THEN RAISE EXCEPTION 'This group is already full.'; END IF;

  SELECT name INTO uname FROM profiles WHERE id = uid;

  INSERT INTO members (group_id, user_id, name, position)
  VALUES (gid, uid, COALESCE(uname, 'Member'), cnt + 1);

  PERFORM public.regenerate_rounds(gid);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_group_preview(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.join_group(uuid) TO authenticated;
