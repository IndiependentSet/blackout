-- CI only: turns a plain postgres:16 into something shaped enough like the
-- production Supabase database for every migration in app/sql/ to replay on
-- it, from the first one. Never run this against a real project.
--
-- Two parts, both stand-ins rather than copies:
--   1. What Supabase itself provides: the API roles, auth.uid() (read here
--      from the `request.uid` setting, so checks can act as a given user),
--      and the default privileges Supabase grants on new objects in public.
--   2. The original schema the first migrations build on: handoff-schema.sql,
--      loaded at the end of this file. A real local Supabase
--      (tools/db-local.sh) has part 1 already and loads only part 2.
-- If a migration needs more of production than this has, add it here.

-- 1) Supabase ---------------------------------------------------------------
-- roles are cluster-wide, so a second database on the same server finds them
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.uid', true), '')::uuid
$$;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- 2) The handoff schema -----------------------------------------------------
\ir handoff-schema.sql
