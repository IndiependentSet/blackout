-- Applied to production automatically on merge to main (app/tools/migrate.sh;
-- see app/sql/README.md). Safe to run twice.
--
-- Why: the publish jobs (app/tools/publish-daily.ts, publish-match-pool.ts) talk
-- to the database as service_role and read level_pools and generation_configs
-- first ("read level_pools: permission denied for table level_pools").
-- service_role bypasses row level security but not table privileges, and these
-- tables only ever granted SELECT to anon/authenticated. They worked on the CI
-- stand-in because supabase-stub.sql hands service_role every table by default;
-- a real project does not. Writes still go only through the security-definer
-- functions, so only reads are granted here.

grant select on public.level_pools, public.pool_levels to service_role;
grant select on public.generation_configs to service_role;
