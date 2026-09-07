-- Run once in the Supabase SQL editor (Database > SQL Editor) against the
-- live project. Not applied automatically — no DB tool available client-side.
--
-- Why: RLS is off project-wide (see design_handoff_account_leaderboard/
-- supabase-schema.sql), so table GRANTs are the only access control. That
-- schema grants table-wide SELECT on public.profiles to both anon and
-- authenticated, which includes the email column. The leaderboard view
-- (leaderboard_weekly / leaderboard_alltime) never selects email, but
-- nothing stops any client holding the public anon key from querying
-- public.profiles directly and reading every user's email. The app itself
-- never needs to SELECT email from profiles — it reads its own email from
-- the Supabase Auth session (auth.users), and only INSERTs/UPDATEs email
-- into profiles on sign-in.
--
-- Fix: narrow the SELECT grant to the columns the app actually reads
-- publicly (id, nickname). INSERT/UPDATE stay table-wide (unchanged,
-- still the pre-existing "any signed-in user can write any row" gap
-- flagged in the original schema — out of scope here; needs RLS or a
-- backend to close for real).

revoke select on public.profiles from anon, authenticated;
grant select (id, nickname) on public.profiles to anon, authenticated;
