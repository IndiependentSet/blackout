import { describe, expect, it } from 'vitest';
import { AVATAR_ICONS, AVATAR_MAX_LENGTH, iconAvatar, isPhotoAvatar, parseAvatar } from './avatar';

describe('parseAvatar', () => {
  it('reads nothing as no avatar', () => {
    expect(parseAvatar(null)).toBeNull();
    expect(parseAvatar(undefined)).toBeNull();
    expect(parseAvatar('')).toBeNull();
  });

  it('reads every icon the app draws', () => {
    for (const { id } of AVATAR_ICONS) expect(parseAvatar(iconAvatar(id))).toEqual({ kind: 'icon', id });
  });

  it('refuses an icon the app does not draw', () => {
    expect(parseAvatar('icon:dragon')).toBeNull();
    expect(parseAvatar('icon:')).toBeNull();
  });

  it('reads a jpeg data URL as a photo', () => {
    const src = 'data:image/jpeg;base64,/9j/4AAQ';
    expect(parseAvatar(src)).toEqual({ kind: 'photo', src });
    expect(isPhotoAvatar(src)).toBe(true);
  });

  it('refuses other URLs, other image types and oversize photos', () => {
    expect(parseAvatar('https://example.com/a.png')).toBeNull();
    expect(parseAvatar('data:image/svg+xml;base64,PHN2Zz4=')).toBeNull();
    expect(parseAvatar('data:image/jpeg;base64,' + 'A'.repeat(AVATAR_MAX_LENGTH))).toBeNull();
    expect(isPhotoAvatar('icon:moon')).toBe(false);
  });
});
