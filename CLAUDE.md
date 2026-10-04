# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this repo is

A **Claude Design handoff bundle** that has already been implemented once, then
re-themed once. The mechanic never changed: every level is an instance of
**minimum vertex cover** on a small planar graph, generated with a known-unique
optimal solution and solved exactly by branch-and-bound. Only the skin has
changed.

History (see `git log --oneline`):
1. `project/BLACKOUT.dc.html` + `chats/chat1.md` — original Claude Design
   mockup: a neon "city grid" theme (tap junctions to install transformers,
   light up cables).
2. First implementation of BLACKOUT shipped to `app/`.
3. The design pivoted to a **CAT COVER** theme (`project/CAT_COVER.dc.html`,
   `chats/chat2.md`): same mechanic, reskinned as "place the fewest cats to
   ruin every room." Cats sit visibly asleep on every node until tapped.
4. `app/` was updated to implement CAT COVER, replacing the BLACKOUT UI.
5. The design pivoted again to **CATASTROPHE INC.**
   (`project/CATASTROPHE_INC.dc.html`, `chats/chat3.md`): same mechanic
   again, reframed as a feline demolition contractor. The story/concept
   changed — nodes are now **empty deployment pads** (no cat shown) until
   you hire/deploy one; "houses" became 7 named **SITES**; the tap-budget
   language became a payroll/invoice conceit (RECALL CREW, PAYROLL SAYS NO,
   CONSULT SURVEY/ESTIMATE/INSIDER, WEEKLY INVOICE); a new "work order" intro
   screen (CLOCK IN) was added before play.
6. `app/` was updated to implement CATASTROPHE INC.'s concept and copy, but
   **kept the app's own cat/thing sprite art and camera/pan/zoom/minimap
   engine** rather than reverting to the prototype's inline-SVG-drawn cats —
   that art and engine were built after the CAT_COVER.dc.html prototype and
   are considered better than what any `.dc.html` file draws. **This is the
   current, live design intent.**

`README.md` and `chats/chat1.md` describe the *original* BLACKOUT brief, not
the current theme — read them for the underlying puzzle rules (par/K, hint
tiers, generation approach), but don't treat their neon/city theme language
as the current spec. `project/CATASTROPHE_INC.dc.html` is the current design
source of truth for story/copy; it is NOT the source of truth for cat/thing
visuals — `app/src/assets/` and the camera system in `app/src/game/camera/` are.

## Layout

- `project/` — Claude Design prototype files (`.dc.html`, `engine.js`,
  `support.js`). These are exported prototypes, not the app; don't edit them
  to fix bugs — port fixes into `app/` instead. `project/engine.js` and
  `app/src/domain/engine.ts` are (currently) the same solver (the app's is
  typed); 
  if you change one for a real fix, check whether the other needs it too, or
  whether `project/` can just be left as a historical snapshot.
- `app/` — the actual React app (Vite + React 19, **TypeScript strict**, CSS
  Modules). This is what ships and what you should be editing for any real
  feature/bug work. See *Engineering standards* below for the layer rules.
  - `src/domain/` — pure TypeScript, no React/DOM/Supabase (lint-enforced):
    `engine.ts` (seeded RNG, gadget-based level generator — leaf chains,
    degree-2 paths, cycles, hubs, crowns — exact branch-and-bound solver, and
    the hint helpers `hintLeaf`/`hintMatching`/`hintReveal`), `house.ts` (the
    building the puzzle sits in, below; seeded by the level's own
    coordinates, every number precomputed once per level), plus the small
    rules the UI used to carry inline: `cover.ts`, `scoring.ts` (the one
    mirror of the SQL score), `calendar.ts`, `sites.ts`, `navigation.ts`,
    `invoice.ts`, `profile.ts`, and the shared `types.ts`.
  - `src/services/` — `supabase/client.ts`, `result.ts` (`Result<T>`),
    `logger.ts`, one repository per aggregate in `repositories/`, and
    `auth/` (`AuthProvider` + `useAuth`: the app's single session source).
  - `src/game/` — the playable board. `state/` (pure reducer that turns taps
    into numbered events, selectors, hints, score-card copy), `camera/` (pure
    maths + `useCamera`), `layout/layout.ts` (lattice → world, memoized per
    level), `scene/` (`buildScene`/minimap/`cable`: the pure replacement for
    the old `renderVals`), `input/` (pointer hook, keymap), `audio/`
    (`AudioService`: Web Audio chirps/crashes/fanfare plus the recorded
    crackles in `src/assets/sfx/`), `hooks/` (levels queue, score card),
    `fx.ts` (one-shot Web Animations), `components/` (Board — which owns the
    camera — and its layers, HUD, score card, side rails), `GameScreen.tsx`
    and `useGameSession.ts` (what has to outlive a screen).
  - `src/screens/` — `WorkOrder/`, `StaffOffice/` (sign-in, ID card,
    leaderboard), `Crew/` (roster, squads, profiles), `HowToPlay/`, and the
    dev-only `Playground/` (below).
  - **Generator playground** (dev only): `npm run dev`, then open
    `/playground.html`. Its entry is `src/playground.tsx`. `vite.config.ts`
    adds it as a build input only on Vercel *preview* deployments
    (`VERCEL_ENV=preview`, i.e. every PR) or with `PLAYGROUND=1`, so it can be
    tried on a phone from a PR but never ships to production. It drives `generate()` — the generator with every
    former hard-coded rule exposed as `GenOptions` (max/min degree, edge reach,
    clearance, crossings, gadget mix, extra edges, uniqueness, search limits) —
    in a Web Worker, and shows the result as a schematic (cover, second
    optimum, crossings) or on the real `Board`, with `domain/graphStats.ts`
    and the generator's `GenReport` (why candidates were rejected) alongside.
    Settings live only in the URL hash. `makeLevel()` is `generate()` under
    `DEFAULT_GEN`, which must keep reproducing the determinism snapshots.
  - `src/app/` — `App.tsx` (screen routing, `AuthProvider`), the staff badge
    and the once-per-session orientation (`useOrientation`).
  - `src/ui/` (Button, Panel/TabHeader, Tag, Logo, Screen, StaffBadge, Stat,
    Avatar, Field, ListRow/RankRow, ScopeTabs, Message, GradeBadge) and
    `src/sprites/` (PadSprite, CatFlipbook, ThingSprite, PathWeb/PathLit and
    the two-tone path theme): shared presentation used by the board, the
    work order and the orientation alike — never re-draw a pad, cat or path
    somewhere else. `src/hooks/` holds generic hooks (`useResource`,
    `useWindowKey`, `useClipboard`, `useCulled`).
  - `src/styles/tokens.css` — the only home of raw colours, font stacks and
    the sticker border/shadow recipe. `styles/global.css` holds the `cc-*`
    keyframes.
  - `src/assets/rooms/` — the drawn rooms the house is filled with, plus the
    `raw/` originals they are trimmed from. Filename is the contract and
    `manifest.json` is generated; see its README.
  - `src/assets/cats/` — the graph nodes themselves: cat stickers cut out of
    a hand-drawn sticker sheet, three poses per breed (`sleep`, `wakeA`,
    `wakeB`). Every sprite is baked onto the same 192x192 canvas at the same
    scale with the cat's feet on the same baseline (y = 182, exported as
    `CAT_BASELINE`), so a node can swap poses without the cat shifting.
    `index.ts` is the only thing the game imports. If you add a breed, cut it
    to the same canvas convention — don't rescale sprites individually, or
    the cats stop looking like one cast. Since the CATASTROPHE INC. pivot, an
    empty node renders as a drawn "deployment pad" (dashed ring + paw
    stencil, no sprite) rather than the `sleep` pose — `sleep` frames still
    exist in the sticker sheet but are currently unused by the game.
  - `src/assets/things/` — the smashables that sit on the cables, cut from a
    destructible-items sticker sheet: four states per item (`idle`, `wobble`,
    `hit`, `broken`) on a shared 128x128 canvas with a common base line
    (`THING_BASELINE`). `index.js` picks them up by glob, so the file name
    `<name>-<pose>.png` is the contract; adding an item means four frames
    plus a line in `ITEMS`.
  - `src/assets/sfx/` — the recorded sound effects, as opposed to the chirps,
    crashes and fanfare the game synthesises in the Web Audio graph. Today
    that is the crackles a hired cat lands with (`crackle-<n>.wav`, globbed by
    `index.js`, one picked at random per hire); recalling a cat deliberately
    keeps the synthesised chirp, so hiring and recalling never sound alike.
    `app/tools/prep-sfx.py` trims the room tone off a raw take and levels it —
    untrimmed, a recording starts up to half a second after the tap that
    caused it. See the README there.
  - `src/styles/global.css` / `index.html` — global styles, fonts (Luckiest
    Guy + Nunito from Google Fonts), page title/meta. The `cc-*` keyframes
    live in `global.css`; an empty pad uses `cc-slotspin` (the turning dashed ring), a hired
    cat plays `cc-drop` once (the landing bounce) then loops
    `cc-pounce` + `cc-frame-a`/`cc-frame-b` (a two-frame flip-book) while
    it's out causing chaos, and the smashables use `cc-teeter` when
    untouched and `cc-tumble` + `cc-break-0..3` (a one-shot four-frame
    sequence that holds on the wreckage) when a cat gets to them. (The old
    `cc-snooze`/`cc-zzz` leftovers are gone.)
  - Supabase backs optional sign-in, the leaderboard, crews and squads
    (`src/services/`; SQL in `app/sql/`). The puzzle itself still needs no
    backend, and a signed-out player gets the whole game. Don't add other
    persistence (localStorage etc.) without checking with the user first.

## The board is a camera, not a fit

Levels used to be scaled down to fit a fixed viewBox, so spacing collapsed as
graphs grew (150 world units per lattice step in house 1, 40 in the worst house
7 — where a smashable ended up wider than the cable it sat on). Instead:

- **One fixed `SPACING` (130) for every house.** A cat is the same size in
  house 7 as in house 1. `layoutFor()` (`game/layout/layout.ts`) maps
  lattice → world at that scale and memoizes per level object.
- **The board is a camera over that world**, `{x, y, z}` driving the SVG's
  **viewBox**. Keep it in the viewBox: `useBoardPointer` maps client → world through
  `getScreenCTM().inverse()`, which an inner `<g transform>` would break.
- `CAM_H` (520) is fixed and the camera's *width* follows the board's real
  aspect (a `ResizeObserver` on the SVG keeps `state.aspect` current), so the
  frame never letterboxes and the expand toggle genuinely shows more world.
- **Two rects per level.** `content` is the puzzle and the building around it —
  it decides what Fit frames and whether a house overflows (and so whether the
  minimap appears). `world` is the ground you can pan into, a margin around the
  building on all four sides.
- Entering a house plays an **establishing shot**: fit for ~420ms, then eases
  to `Z_PLAY` (1). A site that all but fits (`Z_KEEP`) just stays framed whole
  instead. `reset()` deliberately does *not* move the camera.
- Sprites are drawn in **one depth-sorted pass** (cats and smashables together,
  by baseline y), and anything outside the frame grown 30% each way is culled —
  that's what keeps a 100-node house affordable.
- Because spacing is fixed, the old `sp`-derived sprite scales are gone;
  `CAT_S`/`THING_S` are plain constants. Tune the feel through the constant
  block at the top of the file, not by reintroducing per-level scaling.

None of this touched `domain/engine.ts` — seeded generation, the uniqueness check and
day-determinism are exactly as they were.

## The house is generated from the graph

The board used to be one endless plank floor with a wallpaper band at the back,
then a procedurally-drawn floorplan. It is now a real cutaway house: `domain/house.ts`
cuts the level into rooms and fills each one with a drawn room from
`src/assets/rooms/`.

- Nodes sit on **integer** lattice cells, so every wall line lands on a
  **half-integer** one. That is what makes it impossible for a wall to cross a
  pad or the cat standing on it — half a cell is 65 world units against a
  56-wide cat. Don't move rooms off that grid.
- A seeded BSP cuts the pads' bounding box — no padding; padding only ever buys
  rooms with nothing in them — into rooms **2 or 3 cells a side**: big enough to
  hold a cluster of pads, close enough in size that furniture drawn into them
  stays roughly one scale across the house. Splits prefer to fall where few
  paths straddle them, and where both halves come out a shape the art can fill.
- **Every room has to earn its place.** A cut is only allowed if both halves
  keep an object on them (`WALL_GAP` off the wall, so nothing is drawn half
  inside it); for a room too big to leave alone, a pad each will do. A room
  that ends up bigger than `MAX_ROOM` with its contents in one corner has its
  outer walls pulled in to what it holds — but only at a corner of the house,
  or the missing floor reads as a hole in the middle rather than an L-shaped
  plan. What the camera frames is the building that survives that trim.
- **Paths cross walls freely.** Nothing about the puzzle depends on the house.
- The art is fixed, so the variety has to come from the arrangement: which
  picture fills which room (chosen for shape first, then pushed away from its
  own kind next door, from taking more than its share, and from being used
  twice), plus a 50% horizontal mirror. Over 60 days that gives a different
  house almost every time; the pinch point is **tall rooms**, where the
  catalogue is thinnest.
- The room a path hangs in picks its smashable (`plan.edgeThing`), so the
  toilet roll stops turning up in the kitchen. Cosmetic only.
- `buildHouse()` runs **once per level**, inside `layoutFor()` (memoized in a
  `WeakMap`), and a frame only ever filters the result against the same
  `makeSeen()` cull the sprites use. Nothing in `house.ts` may be reached from
  the per-frame render path (`Board`).
- Determinism is the one hard rule: seeds come from `houseSeed(lv)` — the
  level's own contents, never the day or the site index, because `layoutFor()`
  runs during render and for levels other than the current one — and the only
  randomness is `domain/engine.ts`'s seeded RNG (no `Math.random()`, no random sort
  comparators).

### The room art

`src/assets/rooms/` holds the pictures, one complete room each, globbed by file
name with a generated `manifest.json` carrying each one's type and trimmed
shape; see the README there before adding any. Two things about it are easy to
get wrong:

- A room has to be cropped **exactly to its outer wall**. Backdrop left around
  the art shows up as a dark seam between neighbouring rooms;
  `app/tools/prep-rooms.py` does the trimming.
- Rooms are only ever **mirrored left to right**. The art is lit from above, so
  a vertical flip or a 90° rotation puts the highlights and shadows on the
  wrong side.

A room type with no art falls back to `plainRoom()` — floor pattern plus a wall
frame — so the game still runs with the folder empty.

### Keeping the puzzle readable over it

The art brackets the puzzle on both sides of the value scale — `music-1`'s dark
wood is as dark as the paths' casing, and lamp cores and window bays are
*brighter* than the old bone dash was. No single tone can win against both, so
every piece of the puzzle layer is drawn **two-tone**: a near-black core with a
light rim outside it (`PATH_INK` / `PATH_RIM` / `PATH_DASH` in `src/sprites/theme.ts`).
Whichever half loses against a given room, the other one carries the edge.

- Paths: a `#150C06` scrim, a cream rim, the dark casing, then dashes brighter
  than anything painted. The four layers are identical on every edge, so they
  are drawn as **one joined path each** (`vals.web`) rather than four per edge —
  fewer elements than before, and it keeps every unlit layer below every lit one
  so a path's magenta can't be overpainted by its neighbour's casing.
- Pads: gold ring framed in a near-black outer ring, over a dark disc.
- Smashables: a bracket mark (`MARK`) that fades once the fixture is wrecked.
  The room art is full of drawn lamps, books and plants, so a target needs a
  mark no painted object would ever have.
- **DIM** (button, or `d`) drops the house group to `HOUSE_DIM_LOW`. It sits over
  the dark `#cc-void` ground, so lowering the group's opacity reads as the lights
  going out — no filter, no extra elements. On by default only for
  `prefers-contrast: more`.

No SVG filters, masks or `backdrop-filter` anywhere on the board: they force a
raster pass per frame. Everything above is plain strokes.

## Naming note

Code comments, variable names (`BLACKOUT engine`, `bo-*` CSS classes in the
old prototype), the `cc-*` CSS keyframe prefix, the `CatCoverGame`
name in old commits, and this repo's own name (`blackout`) are all leftovers
from earlier pivots (BLACKOUT, then CAT COVER). Don't be misled by them —
the shipped app is now CATASTROPHE INC. When adding new code, use
CATASTROPHE INC.-appropriate naming (SITES, pads, hire/recall, budget); you
don't need to rename existing leftovers unless asked.

## Engineering standards (the default for ALL new work)

The codebase follows the layered structure above. New code follows these rules;
don't reintroduce the old patterns (god components, inline styles, copy-paste,
side effects inside render).

**Layers and dependency direction** — `domain` ← `game` / `services` ←
`screens` / `app`. `ui` and `sprites` depend only on `styles`, `assets` and
`domain/types`.

- `src/domain/` — pure TypeScript: engine, house, cover rules, scoring,
  calendar, sites, share text. No React, DOM, Supabase or `Math.random()`.
- `src/services/` — Supabase client, repositories (one file per aggregate:
  profiles, siteClears, leaderboards, friendships, squads), auth provider.
  Repositories return `Result<T>` and log through one shared logger. Components
  never call Supabase directly; they use repositories via hooks.
- `src/game/` — reducer + selectors, pure camera maths, scene building, input
  hooks, audio service, and the board components.
- `src/screens/`, `src/ui/`, `src/sprites/`, `src/styles/` — screens, shared
  primitives (Button, Card, TabHeader, Logo, GradeBadge), the cat/pad/thing
  sprite components, and design tokens.

**Rules**

- Function components + hooks only. One responsibility per component, aim for
  < 200 lines. No business rules in JSX; derive view data with pure functions
  (never write instance fields during render). Memoize expensive static layers.
- Multi-field state machines use a reducer. Side effects live in hooks/effects,
  are explicit, and are cleaned up (timers, rAF, subscriptions, in-flight
  requests — ignore stale responses).
- DRY: one source for every constant (tokens, `SITE_COUNT`, sprite geometry);
  scoring has exactly one implementation, mirroring the SQL. Before writing
  something, look for the existing helper/component; before copying, extract.
- Styling: CSS Modules + `styles/tokens.css`. Inline `style` only for genuinely
  dynamic values (positions, per-frame opacity, animation strings). No new hex
  literals or font stacks outside token files.
- TypeScript strict. No `any` without a comment saying why. Shared types live
  in `domain/types.ts`. New files are `.ts`/`.tsx`; touch a `.js` file and
  you're expected to convert it if it is small.
- Tests: Vitest (+ React Testing Library for components with logic). Every
  pure module gets unit tests. The determinism snapshots in
  `src/domain/determinism.test.ts` must pass unchanged — if one changes,
  the day's puzzles changed, which is a bug unless explicitly intended.
  The tests freeze `Date.now()` because `makeLevel()` has a wall-clock search
  budget: with a live clock, a slower device can settle on a different level
  than a faster one for the same day. That is a known, pre-existing gap in the
  "same puzzles for everyone" promise — don't paper over it in tests, and ask
  the user before changing generation (any fix changes the days' puzzles).
- The layer rules are enforced by `no-restricted-imports` overrides in
  `app/.oxlintrc.json` — fix the dependency, don't disable the rule.
- New board behaviour: put the rule in `game/state/gameReducer.ts` (pure,
  returns an event), react to the event in `GameScreen` (sound, saving, UI
  effects), and draw it from `buildScene`. Don't mutate instance fields or
  query the DOM from render. New server data: a repository returning
  `Result<T>`, consumed through `useResource`, never a bare `.then(setState)`.
- Keep this file in sync with the structure when you move things.

## Working in `app/`

```
cd app
npm install
npm run dev       # Vite dev server
npm run build
npm run lint       # oxlint
```

- Lint is `oxlint` (`.oxlintrc.json`), not ESLint — don't add ESLint config.
- `npm run check` = lint + `tsc --noEmit` + Vitest + build. It must be green
  before any change is considered done. Tests live beside the code
  (`*.test.ts[x]`) or in `src/__tests__/`.
- The puzzle generator (`domain/engine.ts`) is deterministic per day via a seed
  derived from `Date.UTC` epoch + day offset — the same puzzle set must be
  reproducible for all players on a given day. Be careful not to break that
  determinism (e.g. don't introduce `Math.random()` outside the seeded RNG).
- Levels must keep a **unique** optimal cover — this is what makes the
  puzzle feel deducible rather than guessed. If you touch the generator,
  preserve the uniqueness check rather than relaxing it for convenience.

## When designs change again

If another `.dc.html` file shows up in `project/` (a new theme pivot or
iteration), treat it the same way this file treats CAT_COVER vs BLACKOUT:
read it and any accompanying chat transcript in `chats/` before assuming
`app/` is still current, and check with the user if it's unclear which
design is meant to ship.
