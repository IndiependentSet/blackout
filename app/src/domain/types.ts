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

/** An ordered run of levels a game session plays through: the week's sites, a campaign chapter, one survival step. */
export interface PlaySet {
  count: number;
  name: (i: number) => string;
  unitLabel: 'SITE' | 'LEVEL';
  /** the NEXT button's label once the last one is cleared */
  finishLabel: string;
  /** no fixed length (survival): the banner counts "SITE 4" with no "/count", and the site pips are left out */
  open?: boolean;
}

/** What a game mode switches on around the board. */
export interface PlayFeatures { hints: boolean; invoice: boolean; share: boolean }

/** What a game mode asks the level source for. */
export type LevelRequest =
  | { mode: 'campaign'; levelNo: number }
  | { mode: 'survival'; runSeed: string; step: number }
  | { mode: 'match'; matchId: string };

/** Campaign levels are numbered 1..CAMPAIGN_LEVELS. */
export const CAMPAIGN_LEVELS = 100;

/** Campaign stars: 1 for a clear, +1 on budget, +1 with no INSIDER consulted. */
export type CampaignStars = 0 | 1 | 2 | 3;

/** The best a player has done on one campaign level. */
export interface CampaignClear {
  levelNo: number;
  run: SiteResult;
  campaignStars: CampaignStars;
}

/** Days in a row with at least one site cleared: the run in progress and the longest ever. */
export interface Streak { current: number; best: number }

/** What the server stores for a 1vs1: a challenge waits (`pending`), is on the clock (`active`), or is over (`done` / `void`). */
export type MatchRowStatus = 'pending' | 'active' | 'done' | 'void';
/** What a player sees: `active` is split into the 3-second `countdown` and `live`, from the server's `starts_at`. */
export type MatchStatus = 'pending' | 'countdown' | 'live' | 'done' | 'void';
export type MatchResult = 'won' | 'lost' | 'drawn' | 'void';

/** A challenge. `level` is the one graph both players play; `starts_at` and `ends_at` are the server's clock. */
export interface Match {
  id: string;
  level: Level;
  created_by: string;
  opponent_id: string;
  status: MatchRowStatus;
  created_at: string;
  starts_at: string | null;
  ends_at: string | null;
  ended_at: string | null;
  winner_id: string | null;
}

/** A player's best clear in a match so far, and how the match ended for them. */
export interface MatchPlayer {
  match_id: string;
  user_id: string;
  joined_at: string | null;
  finished_at: string | null;
  cats_used: number | null;
  result: MatchResult | null;
}

export interface MatchView { match: Match; players: MatchPlayer[] }

/** A row of the match_records view: head-to-head wins and losses, no rating. */
export interface MatchRecord { user_id: string; name: string; played: number; won: number; lost: number; drawn: number }

export type CosmeticSlot = 'head' | 'neck';

/** An accessory a cat can wear. Purely cosmetic; unlocked by a badge, never bought. */
export interface Cosmetic {
  id: string;
  slot: CosmeticSlot;
  label: string;
  /** id of the badge that unlocks it (must match the badges seed in app/sql) */
  unlockBadge: string;
  /** what the wardrobe tells a player who hasn't earned it yet */
  unlockLabel: string;
}

/** What a player has put on, by slot; null is bare. */
export type Loadout = Record<CosmeticSlot, string | null>;

/** The worn art for one cat's two flip-book frames, back to front. */
export interface AccessoryArt { wakeA: string[]; wakeB: string[] }
