import { useRef, useState } from 'react';
import type { Profile } from '../../domain/types';
import { searchPlayers } from '../../services/repositories/profiles';

/* Looking a player up by handle or invite code. The last search wins: an answer to an older one is ignored. */
export function usePlayerSearch(userId: string) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[] | null>(null);
  const [searching, setSearching] = useState(false);
  const latest = useRef(0);
  const search = async () => {
    const mine = ++latest.current;
    setSearching(true);
    const r = await searchPlayers(query, userId);
    if (mine !== latest.current) return;
    setResults(r.ok ? r.data : []);
    setSearching(false);
  };
  return { query, setQuery, results, searching, search };
}
