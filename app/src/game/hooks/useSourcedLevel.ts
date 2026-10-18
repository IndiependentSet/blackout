import type { Level, LevelRequest } from '../../domain/types';
import { useResource } from '../../hooks/useResource';
import type { Resource } from '../../hooks/useResource';
import { levelSource, requestKey } from '../../services/levels';
import type { LevelSource } from '../../services/levels';

/* Load one level from the level source. `null` holds off; a reply for a request
   the screen has moved off is ignored (see useResource). */
export function useSourcedLevel(req: LevelRequest | null, source: LevelSource = levelSource): Resource<Level> {
  return useResource(req === null ? null : requestKey(req), () => source.getLevel(req as LevelRequest));
}
