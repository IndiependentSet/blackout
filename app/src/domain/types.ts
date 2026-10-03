/** Shared domain types. Pure data shapes: no React, DOM or Supabase. */

export type Rng = () => number;

/** A junction on the integer lattice (column, row). */
export interface Cell { c: number; r: number }
export type Edge = [number, number];
export type Stars = 1 | 2 | 3;

/** A playable level: a planar graph with a known-unique minimum vertex cover. */
export interface Level {
  nodes: Cell[];
  edges: Edge[];
  adj: number[][];
  /** par: size of the (unique) optimal cover */
  k: number;
  /** the optimal cover itself */
  sol: number[];
  stars: Stars;
  _score?: number;
}

export type LevelFilter = (lv: Level) => boolean;

export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

/** A room art entry the house generator can deal from. */
export interface CatalogueEntry {
  key: string;
  type: string;
  aspect: number;
  url?: string;
}

export interface PlanRoom {
  id: number;
  type: string;
  art: string;
  flip: boolean;
  x: number; y: number; w: number; h: number;
  cx: number; cy: number;
}

export interface HousePlan {
  foot: Rect;
  outer: Rect;
  rooms: PlanRoom[];
  roomOfNode: Int16Array;
  edgeThing: Int16Array;
}

/** How a finished site was scored. */
export type RunStatus = 'perfect' | 'over';
export type Grade = 'S' | 'A' | 'B' | 'C' | 'D';

export interface ScoreRow { label: string; note: string; v: number }

export interface SiteResult {
  status: RunStatus;
  score: number;
  best: number;
  grade: Grade;
  used: number;
  par: number;
  stars: Stars;
  rows: ScoreRow[];
}

/** The columns of `profiles` that are safe to read for other users. */
export interface Profile { id: string; username?: string | null; invite_code?: string | null }

export type BoardScope = 'week' | 'allTime';

/** A row of the player_scores view. */
export interface PlayerScore { user_id: string; name: string; score: number; week_score: number }
export interface BoardRow { user_id: string; name: string; score: number }

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted';
}
export interface FriendLink { row: Friendship; person: Profile }
export interface Friendships { friends: FriendLink[]; incoming: FriendLink[]; outgoing: FriendLink[] }

export type SquadRole = 'foreman' | 'member';
export interface Squad { id: string; name: string; invite_code: string; created_by: string }
export interface MySquad extends Squad { role: SquadRole; members: number }
export interface SquadMember { user_id: string; role: SquadRole }

/** What a consultant has pointed out on the board. */
export type Hint =
  | { kind: 'leaf'; leaf: number; forced: number }
  | { kind: 'proof'; edges: number[] }
  | { kind: 'reveal'; node: number };
export type HintTier = 1 | 2 | 3;
