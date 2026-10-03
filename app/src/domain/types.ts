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
