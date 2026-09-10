-- Run once in the Supabase SQL editor (Database > SQL Editor) against the
-- live project. Not applied automatically — no DB tool available client-side.
--
-- Why: recordClear() upserts into site_clears (INSERT ... ON CONFLICT
-- (user_id, day_number, site_index) DO UPDATE), so it clears a site a
-- second time on the same day without erroring. Postgres requires UPDATE
-- privilege on the table for the ON CONFLICT DO UPDATE clause even when no
-- conflict actually happens — the original schema only granted
-- `select, insert` to authenticated, so every clear failed with:
--   permission denied for table site_clears (42501)
-- silently, since the client only logged it to console until this session
-- added on-screen error surfacing. This is what actually broke the
-- leaderboard end to end: zero rows ever reached site_clears.

grant update on public.site_clears to authenticated;
