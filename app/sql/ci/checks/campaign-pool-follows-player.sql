-- CI check for 2026-10-29-campaign-pool-follows-player.sql: after a republish, a player who cleared level 1 on
-- version 1 gets level 2 from version 1 too, a new player gets version 2. Rolled back at the end.
begin;

create or replace function public.act_as(p_uid uuid) returns void
language sql as $$
  select set_config('request.uid', p_uid::text, true),
         set_config('request.jwt.claim.sub', p_uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

insert into auth.users (id) values
  ('f2000000-0000-0000-0000-000000000001'), ('f2000000-0000-0000-0000-000000000002'),
  ('f2000000-0000-0000-0000-000000000003');
insert into public.profiles (id, username) values
  ('f2000000-0000-0000-0000-000000000001', 'ci_pool_admin'), ('f2000000-0000-0000-0000-000000000002', 'ci_pool_old'),
  ('f2000000-0000-0000-0000-000000000003', 'ci_pool_new');
insert into public.admins (user_id) values ('f2000000-0000-0000-0000-000000000001');

do $$
declare
  mk jsonb := '{"nodes":[{"c":0,"r":0},{"c":1,"r":0},{"c":2,"r":0}],"edges":[[0,1],[1,2]],"k":1,"sol":[1],"stars":1}';
  p1 jsonb; p2 jsonb;
begin
  select jsonb_agg(jsonb_build_object('slot', s, 'tier', 0, 'level', mk || '{"tag":1}')) into p1 from generate_series(1, 100) s;
  select jsonb_agg(jsonb_build_object('slot', s, 'tier', 0, 'level', mk || '{"tag":2}')) into p2 from generate_series(1, 100) s;

  perform public.act_as('f2000000-0000-0000-0000-000000000001');
  perform public.publish_level_pool('campaign', '{}', p1, 'v1');

  -- the old player clears level 1 on version 1
  insert into public.campaign_clears (user_id, level_no, cats_used, par, stars, campaign_stars)
    values ('f2000000-0000-0000-0000-000000000002', 1, 1, 1, 3, 3);

  perform public.publish_level_pool('campaign', '{}', p2, 'v2');

  perform public.act_as('f2000000-0000-0000-0000-000000000002');
  if (public.campaign_level(1)->>'tag')::int <> 1 then raise exception 'a cleared level changed with the republish'; end if;
  if (public.campaign_level(2)->>'tag')::int <> 1 then raise exception 'the next level jumped to the new pool'; end if;

  perform public.act_as('f2000000-0000-0000-0000-000000000003');
  if (public.campaign_level(2)->>'tag')::int <> 2 then raise exception 'a new player did not get the new pool'; end if;
end;
$$;

rollback;
