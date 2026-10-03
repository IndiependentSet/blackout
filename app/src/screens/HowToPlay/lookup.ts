import { BREEDS } from '../../assets/cats';
import { THINGS, type Thing } from '../../assets/things';

/** The smashable called `name`, or the first one if the demo names one that doesn't exist. */
export const thing = (name: string): Thing => THINGS.find(t => t.name === name) || THINGS[0];
/** Cats are dealt round-robin to the pads. */
export const breed = (i: number) => BREEDS[i % BREEDS.length];

export interface MiniNode { x: number; y: number; b?: number }
/** [from, to, which smashable sits on the path] */
export type MiniEdge = [number, number, string];
