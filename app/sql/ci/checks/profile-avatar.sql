-- CI check for 2026-10-26-profile-avatar.sql: an avatar is an app icon id or a
-- small jpeg data URL, nothing else. Rolled back at the end.
begin;

insert into auth.users (id) values ('5b000000-0000-0000-0000-000000000001');
insert into public.profiles (id, username) values ('5b000000-0000-0000-0000-000000000001', 'avaann');

do $$
declare
  ann uuid := '5b000000-0000-0000-0000-000000000001';
  got text;
begin
  update public.profiles set avatar = 'icon:comet' where id = ann;
  update public.profiles set avatar = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==' where id = ann;
  update public.profiles set avatar = null where id = ann;

  foreach got in array array[
    'icon:Comet', 'icon:', 'http://example.com/a.png', 'data:image/svg+xml;base64,PHN2Zz4=',
    'data:image/jpeg;base64,<script>', 'data:image/jpeg;base64,' || repeat('A', 40001)
  ] loop
    begin
      update public.profiles set avatar = got where id = ann;
      raise exception 'avatar % should have been refused', left(got, 30);
    exception when check_violation then
      null;
    end;
  end loop;
end $$;

rollback;
