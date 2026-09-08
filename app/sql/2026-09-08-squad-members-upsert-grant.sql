-- Run once in the Supabase SQL editor (Database > SQL Editor) against the
-- live project. Not applied automatically — no DB tool available client-side.
-- Run AFTER 2026-09-08-crew-squads.sql.
--
-- Why: joinSquadByCode() upserts into squad_members (INSERT ... ON CONFLICT
-- (squad_id, user_id) DO UPDATE) so re-joining a squad you're already in is
-- a no-op instead of an error. Same root cause as
-- 2026-09-07-site-clears-upsert-grant.sql: Postgres requires UPDATE
-- privilege on the table for the ON CONFLICT DO UPDATE clause even when no
-- conflict actually happens — 2026-09-08-crew-squads.sql only granted
-- `select, insert, delete`, so every join failed with:
--   permission denied for table squad_members (42501)

grant update on public.squad_members to authenticated;
