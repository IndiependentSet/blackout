/* What every playground setting and readout means, and what it does to the
   generator (domain/generation/). Shown by the ⓘ popups; keep it in step with
   the generator when either changes. */
import type { GadgetName } from '../../domain/generation';
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
type ViewKey = 'presets' | 'play' | 'solution' | 'otherOptima' | 'labels';
type VarietyKey = 'variety' | 'varietyGraphs' | 'varietyDrawings' | 'varietyRepeat' | 'varietyFound' | 'varietyTime'
  | 'varietyTop' | 'varietyCompare';
type StatKey = 'stat.par' | 'stat.optima' | 'stat.stars' | 'stat.greedy' | 'stat.bound' | 'stat.degree' | 'stat.crossings' | 'stat.euler'
  | 'stat.bipartite' | 'stat.triangles' | 'stat.components' | 'stat.attempts' | 'stat.repairs' | 'stat.visits'
  | 'stat.time' | 'stat.rejected';
/** the generation config page's own settings and readouts */
type ScheduleKey = 'retries' | 'fallback' | 'minNodes' | 'maxK' | 'hasDegree' | 'effectiveDay' | 'previewDay' | 'week' | 'history';
export type HelpKey = ParamKey | 'weights' | GadgetKey | ViewKey | VarietyKey | StatKey | ScheduleKey;

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
    effect: 'Gadgets: the generator grows a smaller graph first (target − 1 nodes, or target − 3 at ★★★) because tie-break repairs add spur nodes back. Free: exactly the target, since its repairs only add paths. A result is accepted if it lands between the target (target − 1 above 8) and target + 2; larger graphs also make the exact solver work much harder.',
    game: 'Sites 1–7 ramp through 4, 7, 10, 14, 18, 24 and 30 nodes.',
  },
  diff: {
    title: 'Difficulty',
    what: 'The difficulty you are asking for, 1 to 3 stars.',
    effect: 'With gadgets it picks three things at once: the default gadget menu, whether the extra-edge pass runs (0.8 × nodes at ★★★, none below), and the star rating a level must reach when "Stars must match" is on. With free it is only that star target: the shape comes from the free settings.',
    game: 'Sites 1–2 are ★, 3–4 ★★, 5–7 ★★★.',
  },
  matchStars: {
    title: 'Stars must match',
    what: 'Require the measured solving technique (see Stars in the stats) to equal the difficulty.',
    effect: 'On: a graph with a unique optimum but the wrong star rating is rejected (counted under "stars") and only kept as a fallback. Off: any technique is accepted, which finds a level much faster.',
    game: 'Always on.',
  },
  strategy: {
    title: 'Strategy',
    what: 'How the graph is built. gadgets: snapped together from a few fixed building blocks (spur, hub, paths, crown, rings), each planting a known deduction. free: no templates; junctions are placed one by one and wired from the settings (density, spread, edge length, shortest cycle).',
    effect: 'Gadgets hit a star rating reliably but repeat themselves (see Variety). Free graphs vary far more, but their difficulty is only measured afterwards, so expect more rejections; the hardness filters decide what is kept. Ties are broken differently too: gadgets hang a spur (a dead end), free adds a path (never a dead end).',
    game: 'gadgets, for every site.',
  },
  density: {
    title: 'Density',
    what: 'Free only: the target mean degree, i.e. paths per junction on average. The graph gets about nodes × density ÷ 2 paths, never fewer than it takes to connect them.',
    effect: 'Low (1–2): tree-like, many dead ends, easy leaf-rule starts. Around 2.5–3: loops everywhere, few free starts. High: dense and much more solver work. It can stall below target when max degree, reach or crossings leave no legal path.',
  },
  spread: {
    title: 'Spread',
    what: 'Free only: lattice area per junction. Junctions are placed inside a square about √(nodes × spread) cells a side.',
    effect: 'At 1 they pack every cell, so paths are short and the drawing is a tight grid. Higher spreads them out, leaving room for long paths and irregular shapes; too high and junctions may sit out of reach of each other, which only matters for the extra paths (the first path to each junction is always within reach).',
  },
  lengthBias: {
    title: 'Edge length',
    what: 'Free only: which path lengths are preferred, from short (−1) through any (0) to long (+1), always up to the reach.',
    effect: 'Each candidate path is weighted by its length to the power 3 × bias. Raise reach as well (2.3 or 3.2) for long paths to exist at all. Long paths cross more, so with crossings off they get refused more often.',
  },
  girth: {
    title: 'Shortest cycle',
    what: 'The shortest loop a new path may close: 3 allows triangles, 4 forbids them, 5 also forbids 4-cycles, and so on. Applies to both strategies.',
    effect: 'Triangles feed the triangle rule (part of ★★), so banning them pushes levels towards folding or real branching. With gadgets, raising it makes some gadgets impossible to place (ring4 needs 4, crown has 4-cycles).',
    game: '3 (any).',
  },
  maxOptima: {
    title: 'Max optimal covers',
    what: 'The most minimum covers a level may have. 1 = unique (one best set of pads), 0 = no limit, N = at most N.',
    effect: 'Above the limit the generator repairs the graph where two covers disagree: gadgets hang a spur (the leaf rule then forces that node), free adds a path. With a few optima the level stays fair (any of them scores par) but the last moves can become "either works". The schematic\'s other optima mark where each differs.',
    game: '1. Uniqueness is what makes a level deducible rather than a guess, and the INSIDER hint assumes it.',
  },
  greedyMustFail: {
    title: 'Greedy must fail',
    what: 'Reject a level if always taking the junction with the most open paths already reaches par.',
    effect: 'That greedy habit is what a player falls into first; a level it solves needs no looking ahead. On, every kept level punishes it by at least one cat (counted under "greedy" when rejected). Cheap to check.',
    game: 'Off.',
  },
  minBoundGap: {
    title: 'Min bound gap',
    what: 'Reject a level unless par is at least this many cats above the matching bound: the number of paths that share no junction, which is what the ESTIMATE consultant tells the player.',
    effect: 'A gap of 0 means the estimate is the answer: one cat per independent path and done. Each extra cat of gap is a place where the player has to see further than that. Rejections count under "bound".',
    game: 'Off.',
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
  play: {
    title: 'Play-test',
    what: 'Tap a node, in either view, to place a cat on it; tap again to take it away. A path is covered once a cat sits at either end. Clear every path with as few cats as you can.',
    effect: 'Par is the size of the minimum cover. "Perfect" means you cleared it with exactly par cats; more is "over par" (the game takes 5 points off per extra cat). Your cats carry over when you switch between Schematic and Board, and reset when a new graph is generated.',
  },
  solution: {
    title: 'Solution',
    what: 'Highlight the minimum vertex cover: the fewest nodes such that every edge touches at least one. Shortcut: s.',
    effect: 'In the schematic, cover nodes are gold, their edges green and everything else muted; on the board, cats are placed on them. While it is on, tapping nodes does nothing; your own cats come back when you turn it off.',
  },
  otherOptima: {
    title: 'Other optima',
    what: 'When the level has more than one minimum cover (only possible with "Max optimal covers" above 1), mark where another one differs from the solution. ◀ ▶ step through them.',
    effect: 'Dashed pink ring: in that cover but not the solution. Dotted: in the solution but not that cover. Each is equally good: any of them scores par. The solver counts every optimum but keeps only the first 20 it finds, so past that the caption says how many exist in all.',
  },
  labels: {
    title: 'Labels',
    what: 'What to write inside each node: its degree (number of edges), its index in the level data (handy against Copy JSON), or nothing.',
  },

  /* ---------- variety ---------- */
  variety: {
    title: 'Variety',
    what: 'Generates a level for each of N consecutive seeds, starting at the current one, under the current settings, and counts how many are genuinely different. Answers "how many different puzzles can these settings produce?".',
    effect: 'It runs in the background and can be stopped at any time. The time budget is always off during a sweep, so every seed it lists reproduces exactly when loaded. Exact counting would mean trying all ~4.3 billion seeds, so the totals are estimates from the sample.',
  },
  varietyGraphs: {
    title: 'Distinct graphs',
    what: 'How many different abstract graphs were found: the same connections count as one graph, whatever the node numbering, position or layout. This is exact graph isomorphism, via a canonical labelling.',
    effect: '"≈ total" is the Chao1 estimate of how many exist including ones not yet seen. It is based on how many graphs were seen only once or twice: lots of one-offs means lots still unseen. The estimate firms up as the sample grows.',
  },
  varietyDrawings: {
    title: 'Distinct drawings',
    what: 'How many different pictures were found: the same graph drawn in a different layout counts again, but moving, rotating or mirroring the same picture does not. This is closer to what a player sees, though the house around it differs too.',
  },
  varietyRepeat: {
    title: 'Repeat chance',
    what: 'The estimated chance that the next generated level is a graph already seen (the Good–Turing estimate: the share of the sample made of graphs seen more than once).',
    effect: 'Near 100% means the settings are exhausted: almost every new level repeats one you have had. For a daily game that is the number to watch.',
  },
  varietyFound: {
    title: 'Levels found',
    what: 'Seeds that produced a level. A seed gives none when every attempt was rejected; the playground then shows nothing for it. Fallbacks (closest misses) count as found; "met every rule" excludes them.',
    effect: 'The share that met every rule is the strategy\'s success rate under these settings.',
  },
  varietyTime: {
    title: 'Time per level',
    what: 'Average time the generator spent per seed in this sweep (time budget off, so a whole run of attempts each).',
    effect: 'The game builds seven of these on the player\'s device every day, so this is the cost of the settings.',
  },
  varietyCompare: {
    title: 'Compare runs',
    what: 'Every finished sweep is added here (the last 8, kept only while this page is open), labelled by strategy and the settings that differ from the defaults.',
    effect: 'Run gadgets, switch to free (or change anything), run again, and read the rows side by side: variety, success rate and cost. Load restores that run\'s settings.',
  },
  varietyTop: {
    title: 'Most common graphs',
    what: 'The abstract graphs that came up most often, with their share of the sample, size, par, stars and how many different drawings of them appeared.',
    effect: 'The seed button loads the first seed that produced it (time budget switched off, so it reproduces exactly).',
  },

  /* ---------- stats ---------- */
  'stat.par': {
    title: 'Par',
    what: 'The size of the minimum vertex cover: the fewest cats that touch every path. This is the score target.',
  },
  'stat.greedy': {
    title: 'Greedy cover',
    what: 'How many cats you need if you always take the junction with the most uncovered paths. "solves it" means that reaches par.',
    effect: 'A level greedy solves can be cleared without looking ahead. +N means the greedy habit costs N cats here. "Greedy must fail" keeps only the latter.',
  },
  'stat.bound': {
    title: 'Matching bound',
    what: 'Paths that share no junction, picked in order: each needs its own cat, so par is at least this. It is the number the ESTIMATE consultant gives.',
    effect: '"tight" means the estimate is the answer. The gap is how much more the player has to find than the consultant tells them.',
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
    effect: 'degenerate: too few edges or an isolated node. blowup: solver hit its cap. unresolved: a tie that no repair could break. filter: an accept rule said no. minDegree / stars / size / greedy / bound: few enough optima, but a node stayed under the min degree, the solving technique differed, the size was off, greedy solved it, or par sat too close to the matching bound. These five are kept as fallbacks.',
  },

  /* ---------- the generation config page ---------- */
  retries: {
    title: 'Retries',
    what: 'How many salted seeds each site tries, with its own rules, before giving up on them.',
    effect: 'Each retry is a full generator run, so more retries mean more chances to meet strict rules and constraints, and more time on a player\'s device when they fail.',
    game: '6.',
  },
  fallback: {
    title: 'Fallback',
    what: 'What a site settles for when every retry came back empty: these rules, at the site\'s own node count, with no constraints.',
    effect: 'Keep it easy to satisfy. If the fallback fails too, the site has no level and the game cannot start.',
    game: '★, 900 ms budget.',
  },
  minNodes: {
    title: 'At least N nodes',
    what: 'Reject a level with fewer junctions than this.',
    effect: 'The generator can come in under the target size; this makes the site retry instead.',
    game: 'Site 1: 4.',
  },
  maxK: {
    title: 'Par at most',
    what: 'Reject a level whose par (minimum number of cats) is above this.',
    game: 'Site 1: 2, so the first site stays a gentle start.',
  },
  hasDegree: {
    title: 'Has a junction of degree',
    what: 'Reject a level unless at least one junction has exactly this many paths.',
    game: 'Site 1: 3, so there is a visible "busiest junction" to start from.',
  },
  effectiveDay: {
    title: 'Effective from day',
    what: 'The first puzzle day this config makes. Every later day uses it too, until a config with a later day takes over.',
    effect: 'Tomorrow at the earliest: today\'s puzzles are already being played and scored, so they never change. Saving again for the same day replaces that config.',
  },
  previewDay: {
    title: 'Preview day',
    what: 'Generate the week this schedule would make on this day, exactly as a player\'s device would.',
    effect: 'The day picks the seed, so the preview is the real level for that day (as long as the time budget is off, or this machine is about as fast as a player\'s).',
  },
  week: {
    title: 'The week',
    what: 'Each site\'s level on the preview day: junctions, par, stars, the retry that produced it, and the time it took here.',
    effect: 'Players generate these on the main thread one after another, so a slow site is a frozen screen on a phone. "fallback" means no retry met the site\'s rules.',
  },
  history: {
    title: 'Saved configs',
    what: 'Every config saved for this mode. "in force" is today\'s; "scheduled" ones take over on their day and can still be cancelled; past ones are kept as a record.',
  },
};
