/* What every playground setting and readout means, and what it does to the
   generator (domain/engine.ts). Shown by the ⓘ popups; keep it in step with
   the engine when either changes. */
import type { GadgetName } from '../../domain/engine';
import type { PlaygroundParams } from './params';

export interface HelpEntry {
  title: string;
  /** what it is */
  what: string;
  /** what turning it does to generation or to the graph */
  effect?: string;
  /** what the game itself uses */
  game?: string;
}

type ParamKey = Exclude<keyof PlaygroundParams, 'weights' | 'budgetMs'>;
type GadgetKey = `gadget.${GadgetName}`;
type ViewKey = 'presets' | 'solution' | 'secondOptimum' | 'labels';
type StatKey = 'stat.par' | 'stat.optima' | 'stat.stars' | 'stat.degree' | 'stat.crossings' | 'stat.euler'
  | 'stat.bipartite' | 'stat.triangles' | 'stat.components' | 'stat.attempts' | 'stat.repairs' | 'stat.visits'
  | 'stat.time' | 'stat.rejected';
export type HelpKey = ParamKey | 'weights' | GadgetKey | ViewKey | StatKey;

export const HELP: Record<HelpKey, HelpEntry> = {
  /* ---------- settings ---------- */
  seed: {
    title: 'Seed',
    what: 'The starting number for the generator\'s pseudo-random sequence. Every random choice (which gadget, where it attaches, which edge to close) is drawn from it.',
    effect: 'Same seed + same settings = same graph, as long as the time budget is off. Change only the seed to see a different graph grown under identical rules.',
    game: 'Each day\'s seed comes from the date, which is how every player gets the same seven sites.',
  },
  size: {
    title: 'Nodes',
    what: 'The target number of nodes (pads).',
    effect: 'The generator grows a smaller graph first (target − 1 nodes, or target − 3 at ★★★) because tie-break repairs add spur nodes back. A result is accepted if it lands between the target (target − 1 above 8) and target + 2; larger graphs also make the exact solver work much harder.',
    game: 'Sites 1–7 ramp through 4, 7, 10, 14, 18, 24 and 30 nodes.',
  },
  diff: {
    title: 'Difficulty',
    what: 'The difficulty you are asking for, 1 to 3 stars.',
    effect: 'It picks three things at once: the default gadget menu, whether the extra-edge pass runs (0.8 × nodes at ★★★, none below), and the star rating a level must reach when "Stars must match" is on.',
    game: 'Sites 1–2 are ★, 3–4 ★★, 5–7 ★★★.',
  },
  matchStars: {
    title: 'Stars must match',
    what: 'Require the measured solving technique (see Stars in the stats) to equal the difficulty.',
    effect: 'On: a graph with a unique optimum but the wrong star rating is rejected (counted under "stars") and only kept as a fallback. Off: any technique is accepted, which finds a level much faster.',
    game: 'Always on.',
  },
  unique: {
    title: 'Unique optimum',
    what: 'Require the graph to have exactly one minimum vertex cover: one best set of pads to hire.',
    effect: 'When the solver finds two optimal covers, the generator repairs the graph: it hangs a spur on a node where the two covers disagree (the leaf rule then forces that node), or closes an edge. Off: the first graph is accepted as-is, and the schematic shows where a second optimum differs.',
    game: 'Always on. It is what makes a level deducible rather than a guess.',
  },
  minDegree: {
    title: 'Min degree',
    what: 'The fewest paths any node may have. "any" (0 or 1) means no constraint.',
    effect: 'The gadgets naturally create dead ends, so after growing, a lift pass wires every low-degree node to an open neighbour within reach. At 2+ the tie-break can no longer add spurs (they would be dead ends), only edges, so unique optima get much harder to find; expect more fallbacks. A graph with no degree-1 nodes gives the player no leaf rule to start from.',
    game: 'No minimum: dead ends are the easy entry points of early sites.',
  },
  maxDegree: {
    title: 'Max degree',
    what: 'The most paths any node may have.',
    effect: 'Every edge the generator adds (gadget links, attachments, extra edges, repairs) is refused if either end is already at the cap. Raising it makes denser graphs with bigger covers and much more solver work. On the grid a node has at most 8 neighbours at reach 1.5, more at longer reach.',
    game: '3.',
  },
  reach: {
    title: 'Edge reach',
    what: 'The longest edge allowed, in grid steps: 1 = straight neighbours only, 1.5 = diagonals too, 2.3 = knight moves, 3.2 = longer.',
    effect: 'Gadgets always attach to a straight neighbour and keep their own shape, so reach mainly governs the extra edges, the min-degree lift and tie-break edges. At reach 1 the crown gadget (which needs diagonals) can never be placed. Longer reach plus crossings is the way to get tangled, non-planar-looking graphs.',
    game: '1.5.',
  },
  clearance: {
    title: 'Clearance',
    what: 'How close, in grid steps, an edge may pass to a node it doesn\'t connect.',
    effect: 'Stops edges running through or skimming a pad, which would read as a connection that isn\'t there. At 0, three nodes in a row can have a long edge pass straight through the middle one. Higher values reject more edges.',
    game: '0.4.',
  },
  crossings: {
    title: 'Allow crossings',
    what: 'Let edges cross each other.',
    effect: 'Off, every new edge is checked against every existing one, so the drawing is planar. On, that check is skipped. The graph may still be planar in the graph-theory sense (it could be redrawn without crossings); the stats\' Euler check only proves non-planarity when edges > 3 × nodes − 6. Crossings are drawn dashed in the schematic.',
    game: 'Off. On the board a crossing looks like two paths overlapping, not a junction.',
  },
  extraEdges: {
    title: 'Extra edges',
    what: 'After the gadgets are grown, extra rounds of "pick an open node, connect it to a random open node within reach". The number of rounds is this factor × the target node count; a round can fail if no edge is allowed.',
    effect: 'Closing edges turns trees and paths into cycles, which removes the dead ends and degree-2 chains the easy rules work on. That is the main source of ★★★ levels. Auto = 0.8 at ★★★, none below.',
    game: 'Auto.',
  },
  weights: {
    title: 'Custom gadget mix',
    what: 'The generator grows a graph by repeatedly attaching a small ready-made piece (a gadget) to a random node that still has room. The mix sets each gadget\'s relative chance of being picked.',
    effect: 'Off uses the difficulty\'s own menu: ★ spur×2, hub×2, path3; ★★ path3, path4, path5, spur, hub, ring4; ★★★ crown×2, ring6, ring4, path4, path5, hub, spur. Tap the ⓘ next to each gadget for what it contributes. A weight of 0 removes it; all zeros generate nothing.',
  },
  attempts: {
    title: 'Attempts',
    what: 'How many fresh graphs the generator may grow before giving up.',
    effect: 'Each attempt grows a new graph and tries to repair it into a valid level. If none passes every rule, the closest miss is returned and marked as a fallback.',
    game: '400 (usually cut short by the time budget).',
  },
  repairs: {
    title: 'Repairs / attempt',
    what: 'How many tie-break edits one graph may receive before it is abandoned.',
    effect: 'Each repair adds a spur node or an edge, so the graph grows; one that passes target + 2 nodes is rejected ("size"). More repairs rescue more graphs, at the cost of drifting further from the target size.',
    game: '18.',
  },
  solverCap: {
    title: 'Solver cap',
    what: 'The exact solver (branch and bound) counts every search step; past this many it gives up on the graph.',
    effect: 'Abandoned graphs count as "blowup". Large, dense or crossing graphs need a higher cap. Raising it lets those finish, at the cost of time.',
    game: '600,000.',
  },
  clock: {
    title: 'Time budget',
    what: 'A wall-clock limit (ms): once a fallback exists and the budget has run out, stop searching.',
    effect: 'On: a slower device may stop earlier and settle on a different level than a faster one, so the seed alone no longer decides the graph. Off: generation is limited by attempts only, so a seed is fully reproducible.',
    game: 'On: 400 ms for sites 1–4, 700 ms for 5–7. It is a known gap in "same puzzles for everyone".',
  },

  /* ---------- gadgets ---------- */
  'gadget.spur': {
    title: 'spur',
    what: 'One node hanging off an existing one: a dead end.',
    effect: 'A degree-1 node means its neighbour is forced into the cover (the leaf rule), so spurs make graphs easy. The tie-break repair uses the same trick.',
  },
  'gadget.hub': {
    title: 'hub',
    what: 'A centre with two dead ends hanging off it.',
    effect: 'Both leaves force the centre, so it is always in the cover. An easy, very readable deduction.',
  },
  'gadget.path3': {
    title: 'path3',
    what: 'A straight chain of 3 nodes.',
    effect: 'Chains are runs of degree-2 nodes. They need the folding rule (★★) unless a dead end starts them off.',
  },
  'gadget.path4': {
    title: 'path4',
    what: 'A chain of 4 nodes with one bend.',
    effect: 'Like path3 but longer: more degree-2 folding, and whether the chain\'s length is odd or even changes which end ends up covered.',
  },
  'gadget.path5': {
    title: 'path5',
    what: 'A chain of 5 nodes with one bend.',
    effect: 'The longest chain; it stretches graphs out and adds folding work.',
  },
  'gadget.crown': {
    title: 'crown',
    what: 'Three nodes that share the same two neighbours (a K₂,₃). It needs diagonal edges.',
    effect: 'Both shared neighbours are forced (the crown reduction), but neither the leaf rule nor folding can see it. It is the signature of ★★★.',
  },
  'gadget.ring4': {
    title: 'ring4',
    what: 'A square: a 4-cycle.',
    effect: 'On its own an even cycle has two equally good covers (alternate corners), so it adds ambiguity that its neighbours, or a repair, must break.',
  },
  'gadget.ring6': {
    title: 'ring6',
    what: 'A 6-cycle.',
    effect: 'Same two-way ambiguity as ring4, spread over more nodes, so it is harder to see what breaks the tie.',
  },

  /* ---------- view ---------- */
  presets: {
    title: 'Presets',
    what: 'Load the settings the game uses for site N (node count, difficulty, time budget). The seed is kept.',
    effect: 'The daily level itself also re-tries with salted seeds and requires site 1 to have a degree-3 node and par ≤ 2, so a preset reproduces the rules, not that exact level.',
  },
  solution: {
    title: 'Solution',
    what: 'Highlight the minimum vertex cover: the fewest nodes such that every edge touches at least one. Shortcut: s.',
    effect: 'In the schematic, cover nodes are gold and edges turn green. On the board, cats are placed on them.',
  },
  secondOptimum: {
    title: '2nd optimum',
    what: 'When the graph has more than one minimum cover (only possible with "Unique optimum" off), mark where a second one differs.',
    effect: 'Dashed pink ring: in the second cover but not the first. Dotted: in the first but not the second. That swap is exactly the ambiguity a tie-break repair would remove.',
  },
  labels: {
    title: 'Labels',
    what: 'What to write inside each node: its degree (number of edges), its index in the level data (handy against Copy JSON), or nothing.',
  },

  /* ---------- stats ---------- */
  'stat.par': {
    title: 'Par',
    what: 'The size of the minimum vertex cover: the fewest cats that touch every path. This is the score target.',
  },
  'stat.optima': {
    title: 'Optimal covers',
    what: 'How many different covers of size par exist. 1 means the solution is unique.',
  },
  'stat.stars': {
    title: 'Stars',
    what: 'Which deduction rules are enough to solve the graph, found by applying them until nothing is left.',
    effect: '★: the leaf rule alone (a dead end forces its neighbour). ★★: also degree-2 folding (a node with two neighbours: if they touch, take both; otherwise merge the three into one). ★★★: neither is enough, so it needs a crown reduction or real case analysis.',
  },
  'stat.degree': {
    title: 'Degree',
    what: 'The number of edges at a node. The histogram counts nodes by degree; mean degree = 2 × edges / nodes.',
  },
  'stat.crossings': {
    title: 'Crossings',
    what: 'Pairs of edges whose drawn lines cross (edges that share a node don\'t count). Always 0 unless crossings are allowed.',
  },
  'stat.euler': {
    title: 'Planar by Euler?',
    what: 'A planar graph with n ≥ 3 nodes has at most 3n − 6 edges. Exceeding that proves the graph can\'t be drawn without crossings.',
    effect: 'Staying under it proves nothing either way: a full planarity test would be needed for that.',
  },
  'stat.bipartite': {
    title: 'Bipartite',
    what: 'Whether the nodes can be split into two groups with every edge going between them (equivalently: no odd cycle).',
    effect: 'For bipartite graphs, König\'s theorem says the minimum cover equals the maximum matching, so they are easy for a computer, though not necessarily for a player.',
  },
  'stat.triangles': {
    title: 'Triangles',
    what: 'Number of 3-cycles. Any cover must take at least two of a triangle\'s three nodes, a handy local deduction.',
  },
  'stat.components': {
    title: 'Components',
    what: 'Number of separate pieces. The generator always grows from one node, so this is 1 unless something unusual happened.',
  },
  'stat.attempts': {
    title: 'Attempts',
    what: 'How many fresh graphs were grown before this result.',
  },
  'stat.repairs': {
    title: 'Repairs',
    what: 'How many tie-break edits (spurs or edges) were made across all attempts.',
  },
  'stat.visits': {
    title: 'Solver visits',
    what: 'Search steps the exact solver took on the returned graph: a rough measure of how hard it is for a computer.',
  },
  'stat.time': {
    title: 'Time',
    what: 'gen = time inside the generator. wall = from request to result, including starting the background worker.',
  },
  'stat.rejected': {
    title: 'Rejected',
    what: 'Why candidates were thrown away, counted across the whole run.',
    effect: 'degenerate: too few edges or an isolated node. blowup: solver hit its cap. unresolved: a tie that no repair could break. filter: an accept rule said no. minDegree / stars / size: unique, but a node stayed under the min degree, the solving technique differed, or the size was off. The last three are kept as fallbacks.',
  },
};
