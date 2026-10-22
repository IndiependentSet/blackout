/* A player's picture: one of the icons the app draws, or a photo of their own. Stored as one string in
   profiles.avatar (null = the initial of the handle); the shape below is also what the SQL check allows. */

export const AVATAR_ICONS = [
  { id: 'moon', label: 'Sleepy moon' },
  { id: 'sun', label: 'Sunny' },
  { id: 'comet', label: 'Comet' },
  { id: 'saturn', label: 'Ringed planet' },
  { id: 'rocket', label: 'Rocket' },
  { id: 'astronaut', label: 'Astronaut' },
  { id: 'alien', label: 'Alien' },
  { id: 'star', label: 'Smiling star' },
  { id: 'ufo', label: 'Flying saucer' },
  { id: 'telescope', label: 'Telescope' },
  { id: 'robot', label: 'Space robot' },
  { id: 'cat', label: 'Star cat' },
] as const;

export type AvatarIconId = (typeof AVATAR_ICONS)[number]['id'];

/** The side, in pixels, a chosen photo is cropped and shrunk to. */
export const AVATAR_PHOTO_SIZE = 128;
/** The longest photo string the server takes (mirrors the check in 2026-10-26-profile-avatar.sql). */
export const AVATAR_MAX_LENGTH = 40000;

const PHOTO_PREFIX = 'data:image/jpeg;base64,';

export type AvatarArt = { kind: 'icon'; id: AvatarIconId } | { kind: 'photo'; src: string };

export const iconAvatar = (id: AvatarIconId): string => 'icon:' + id;

/** What a stored avatar string draws; null for none, and for anything not made by this app. */
export function parseAvatar(value: string | null | undefined): AvatarArt | null {
  if (!value) return null;
  if (value.startsWith('icon:')) {
    const icon = AVATAR_ICONS.find(i => i.id === value.slice(5));
    return icon ? { kind: 'icon', id: icon.id } : null;
  }
  if (value.length <= AVATAR_MAX_LENGTH && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value)) return { kind: 'photo', src: value };
  return null;
}

/** Whether a data URL made from a photo is one the server would take. */
export const isPhotoAvatar = (value: string): boolean => value.startsWith(PHOTO_PREFIX) && parseAvatar(value)?.kind === 'photo';
