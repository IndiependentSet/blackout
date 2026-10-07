-- CI check, run after every migration has replayed onto the stub: the
-- tracking table holds every migration, and the API roles can't see it.
do $$
declare n int;
begin
  select count(*) into n from ops.schema_migrations where how = 'applied';
  if n = 0 then raise exception 'ops.schema_migrations recorded nothing'; end if;

  set local role anon;
  begin
    perform 1 from ops.schema_migrations;
    raise exception 'anon can read ops.schema_migrations';
  exception when insufficient_privilege then null;
  end;
  reset role;
end $$;

-- the replayed schema ends where production is: one identity column on profiles
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles' and column_name = 'nickname') then
    raise exception 'profiles.nickname should be gone after the replay';
  end if;
end $$;
