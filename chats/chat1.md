# Blackout puzzle game design

_Started 2026-08-21 19:38 UTC_

---

## User

Build BLACKOUT — a daily puzzle game for mobile web. Single-file React,
canvas or SVG, no backend, no localStorage.

CORE LOOP
A neon city grid: junctions (nodes) connected by dark power cables (edges).
Tap a junction to install a transformer — every cable touching it lights up.
Clear the whole grid using at most K transformers. K is always the true
optimum, so every level is winnable at exactly par, never below.
(This is minimum vertex cover; never use that phrase in the UI.)

RULES
- Tap to place, tap again to remove. Free undo, no move limit, no timer.
- Live counter: "4 / 6 transformers · 11 of 14 cables lit"
- Win the instant the last cable lights. Lose only by running out of taps
  under the budget, which is recoverable by removing one.
- Levels are planar with max degree 3 — no crossings, readable on a 390px
  wide screen.

LEVEL GENERATION (build this as a real generator, not hardcoded levels)
Compose each grid from gadgets with known optimal covers rather than random
graphs — random ones are either trivial or brute-force, both unfun.
1. Assemble from: leaf chains (degree-1 spurs), degree-2 paths, small cycles,
   one or two forced hubs, and one "crown" (independent set whose neighbors
   must all be taken).
2. Solve exactly with branch-and-bound to get K.
3. KEEP ONLY LEVELS WHERE THE OPTIMAL SOLUTION IS UNIQUE. This is what
   makes it feel like Sudoku instead of guessing.
4. Grade difficulty by which technique the level requires:
   Easy = leaf rule alone (if a junction has one cable, take its neighbor)
   Medium = leaf + degree-2 folding
   Hard = needs a crown reduction or a genuine branch
   Show this as ★ / ★★ / ★★★.

HINTS (three tiers, player chooses)
1. Pulse one leaf junction whose neighbor is forced.
2. Highlight a set of disjoint cables — visual proof you need at least that
   many transformers. Label it "You'll need 5 or more."
3. Reveal one correct transformer.

FEEL — this is most of the work
The tap is the product. One tap should send light racing outward down each
cable with easing, a soft bloom at the junction, and a low synth thunk that
rises in pitch with each transformer placed. Winning: the whole grid
overloads white for 200ms, then settles into steady hum. Cables are dim
indigo when dark, hot cyan when lit. Deep near-black background, subtle
grain. Junctions are small — the cables are the star. No drop shadows, no
rounded-corner card UI, no emoji. Think Tron by way of a Braun schematic.

SHIP WITH
- A 7-level ramp from 4-node tutorial to a 30-node ★★★ finale, generated
  on load with a fixed seed so it's the same for everyone that day.
- Par indicator: solving in K = "PERFECT", K+1 = "OVER".
- A share card, Wordle-style, that spoils nothing:
  BLACKOUT #128
  ⚡⚡⚡⚡⚡⬜⚡  6/7 perfect
- Full keyboard + touch support; nothing smaller than 44px tappable.

Start by getting the generator and exact solver right and print a few
sample levels with their K, then build the visuals on top.

## Assistant

_[tool: write_file]_

_[tool: run_script]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: run_script]_

_[tool: run_script]_

_[tool: run_script]_

_[tool: run_script]_

Generator validated (unique optima, ~130ms/level, 4→30 node ramp). Now the game.

_[tool: dc_write]_

_[tool: dc_js_str_replace]_

_[tool: show_html]_

_[tool: show_html]_

_[tool: run_script]_

Now adaptive canvas height so small grids don't float in dead space.

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: multi_screenshot]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: show_html]_

_[tool: dc_html_str_replace]_

_[tool: multi_screenshot]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

BLACKOUT is playable. Sample output from the generator (day #128 seed, one level per rung):

`4n K1 ★` · `8n K3 ★` · `9n K4 ★★` · `13n K6 ★★` · `16n K9 ★★★` · `23n K12 ★★★` · `29n K15 ★★`

Every level is grown from gadgets (spurs, forced hubs, odd paths, crowns, rings), solved exactly by branch-and-bound, and kept only when the optimum is **unique** — ties are broken by a targeted repair (spur onto a junction where two optima disagree) rather than random resampling, which is what got generation down to ~130ms per level. Difficulty is graded by the weakest technique that clears the board: leaf rule, leaf + degree-2 fold, or neither.

Two notes: the finale occasionally grades ★★ instead of ★★★ (crown-density levels are scarcer than 30 nodes allows every day), and taps are capped at par+1 so "OVER" stays meaningful — removing one always recovers. Tweaks panel exposes day offset, sound, cable color, and grain.

## User

Found issues — fixing…

## Assistant

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: multi_screenshot]_

Fixed at the root: the per-node 44px hit circles are gone, replaced by one canvas-wide transparent target whose handler picks the **nearest** junction within 26 units. Comfort radius is preserved (you can tap well off-center) but a point 45% of the way toward a neighbour now always resolves to the nearer node, so dense grids can't mis-install. Verified: a tap 8px off a junction lands on that junction, and the banner no longer wraps.

