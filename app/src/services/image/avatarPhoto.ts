import { AVATAR_MAX_LENGTH, AVATAR_PHOTO_SIZE } from '../../domain/avatar';
import { fail, ok, type Result } from '../result';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** The largest centred square of a w×h picture, as the source rectangle to draw from. */
export function centreSquare(w: number, h: number): { sx: number; sy: number; side: number } {
  const side = Math.min(w, h);
  return { sx: Math.round((w - side) / 2), sy: Math.round((h - side) / 2), side };
}

function load(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('unreadable')); };
    img.src = url;
  });
}

/** A picked file as the avatar string stored on the profile: cropped square, shrunk, re-encoded as a small jpeg. */
export async function photoToAvatar(file: File): Promise<Result<string>> {
  if (!file.type.startsWith('image/')) return fail('THAT’S NOT A PICTURE.');
  if (file.size > MAX_FILE_BYTES) return fail('THAT PICTURE IS TOO BIG (10 MB AT MOST).');
  try {
    const img = await load(file);
    const { sx, sy, side } = centreSquare(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = AVATAR_PHOTO_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return fail('THIS BROWSER CAN’T RESIZE PICTURES.');
    ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_PHOTO_SIZE, AVATAR_PHOTO_SIZE);
    const url = canvas.toDataURL('image/jpeg', 0.82);
    if (url.length > AVATAR_MAX_LENGTH) return fail('THAT PICTURE WON’T SHRINK ENOUGH. TRY ANOTHER.');
    return ok(url);
  } catch {
    return fail('COULDN’T READ THAT PICTURE.');
  }
}
