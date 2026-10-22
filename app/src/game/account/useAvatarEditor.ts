import { useState } from 'react';
import { setAvatar } from '../../services/repositories/profiles';
import { photoToAvatar } from '../../services/image/avatarPhoto';

/** Changing your picture: saving an icon or a photo (or going back to the initial), and any complaint. */
export function useAvatarEditor(userId: string, onSaved: (avatar: string | null) => void) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async (value: string | null) => {
    setSaving(true);
    setError('');
    const r = await setAvatar(userId, value);
    setSaving(false);
    if (!r.ok) return setError(r.error);
    onSaved(r.data);
  };
  const saveFile = async (file: File) => {
    setSaving(true);
    setError('');
    const photo = await photoToAvatar(file);
    if (!photo.ok) { setSaving(false); return setError(photo.error); }
    await save(photo.data);
  };

  return { saving, error, save, saveFile };
}
