-- Applied to production automatically on merge to main (app/tools/migrate.sh;
-- see app/sql/README.md).
--
-- Why: a Stargazer picks the picture shown beside their handle: a drawn icon
-- from the app's own set, or a photo of their own.
--
--   avatar  null            the initial of the handle (the default)
--           'icon:<id>'     one of the icons the app draws (ids live in
--                           app/src/domain/avatar.ts)
--           'data:image/jpeg;base64,…'
--                           their own picture, already cropped square and
--                           shrunk to 128px by the client, so a few KB; the
--                           length cap is what keeps the column small
--
-- Public like the handle (friends, duels and search show it); email stays out.

alter table public.profiles add column if not exists avatar text;

alter table public.profiles drop constraint if exists profiles_avatar_shape;
alter table public.profiles add constraint profiles_avatar_shape check (
  avatar is null
  or avatar ~ '^icon:[a-z0-9-]{1,24}$'
  or (avatar ~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$' and char_length(avatar) <= 40000)
);

grant select (avatar) on public.profiles to anon, authenticated;
grant update (avatar) on public.profiles to authenticated;
