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

/** How a level's graph is built: snapped together from fixed gadgets, or
    placed and wired straight from the settings. */
export type Strategy = 'gadgets' | 'free';

/** The rules the level generator works under (see DEFAULT_GEN for the game's). */
export interface GenOptions {
  strategy: Strategy;
  /** most paths a junction may have */
  maxDegree: number;
  /** fewest paths a junction may have; 0 or 1 means no constraint */
  minDegree: number;
  /** longest path, in lattice steps (1 = orthogonal, 1.5 = diagonals, 2.3 = knight moves) */
  reach: number;
  /** how close (in lattice steps) a path may pass to a junction it doesn't join */
  clearance: number;
  /** allow paths to cross each other (the drawing is then no longer planar) */
  crossings: boolean;
  /** gadget names to grow from, duplicates as weights; null = the difficulty's menu */
  menu: string[] | null;
  /** extra edges to close, as a fraction of the target size; null = 0.8 at difficulty 3, else 0 */
  extraEdges: number | null;
  /** free: target mean degree (paths per junction) */
  density: number;
  /** free: lattice area per junction; the layout box is about √(size·spread) a side */
  spread: number;
  /** free: edge length preference, -1 (short) .. 0 (any) .. 1 (long), up to reach */
  lengthBias: number;
  /** shortest cycle a new path may close (3 = any, 4 = no triangles, ...) */
  girth: number;
  /** most optimal covers a level may have: 1 = unique, 0 = no limit */
  maxOptima: number;
  /** reject levels that "take the junction with the most open paths" solves at par */
  greedyMustFail: boolean;
  /** reject unless par is at least this far above the matching bound (what ESTIMATE shows) */
  minBoundGap: number;
  /** require the solving technique (stars) to equal the difficulty asked for */
  matchStars: boolean;
  attempts: number;
  /** tie-break edits per attempt */
  repairs: number;
  budgetMs: number;
  /** branch-and-bound visits before the solver gives up on a graph */
  solverCap: number;
  /** honour budgetMs (true) or be purely attempt-limited and so seed-reproducible (false) */
  clock: boolean;
}

/** How a generate() run went: what it tried, and why candidates were thrown away. */
export interface GenReport {
  attempts: number;
  repairs: number;
  ms: number;
  /** nothing met every rule; the level is the closest miss */
  fallback: boolean;
  /** optimal covers the returned level has */
  optima: number;
  /** solver visits for the returned level */
  visits: number;
  rejected: {
    degenerate: number; blowup: number; unresolved: number; filter: number;
    minDegree: number; stars: number; size: number; greedy: number; bound: number;
  };
}

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
