import { useState } from 'react';
import { setUsername } from '../../services/repositories/profiles';

/** Editing your handle on the ID card: draft, saving, and any complaint from the server. */
export function useHandleEditor(userId: string, current: string, onSaved: (username: string) => void) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const start = () => { setDraft(current); setError(''); setEditing(true); };
  const cancel = () => { setEditing(false); setError(''); };
  const save = async () => {
    setSaving(true);
    const r = await setUsername(userId, draft);
    setSaving(false);
    if (!r.ok) return setError(r.error);
    setEditing(false);
    onSaved(r.data);
  };

  return { editing, draft, setDraft, saving, error, start, cancel, save };
}
