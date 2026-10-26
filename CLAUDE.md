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
   are considered better than what any `.dc.html` file draws.
7. The game was rebranded as **Stargazer** (Claude Design: *Rebrand Proposals*
   and *Stargazer.dc.html*, not checked in; the handoff lived outside this
   repo). Same mechanic: the board is a patch of night sky, a node is a star, a
   lit star lights every line touching it, par is the solver's minimum. Seven
   skies a night; the seventh night's figure can be named and kept in an atlas.
   Modes are renamed, not changed: Daily → **Tonight**, Campaign → **Voyage**
   (one world per chapter), Survival → **Meteor Rush**, 1vs1 → **Star Duel**,
   Staff office → **Observatory** (Me), How to play + Work order → **First
   night**, the three consultants → the **Telescope** (Spot = INSIDER, Count =
   ESTIMATE, Sweep only highlights dark lines). **Stargazer is the current,
   live design intent and the default.** CATASTROPHE INC. is kept, whole and
   working, as a hidden alternative (an easter egg): tap the "Stargazer" title
   on Tonight seven times, or open `?skin=catastrophe`; its pages carry a
   "Back to Stargazer" pill. Design details with nothing behind them yet (sky
   themes/telescopes to unlock, the 88 real constellations on Sundays, a Rush
   time bonus) were deliberately left out: the rules and data are the game's own.

`README.md` and `chats/chat1.md` describe the *original* BLACKOUT brief, not
the current theme — read them for the underlying puzzle rules (par/K, hint
tiers, generation approach), but don't treat their neon/city theme language
as the current spec. For the hidden CATASTROPHE INC. look,
`project/CATASTROPHE_INC.dc.html` is the source of truth for story/copy; it is
NOT the source of truth for cat/thing visuals — `app/src/assets/` and the
camera system in `app/src/themes/catastrophe/game/camera/` are.

## Layout

- `project/` — Claude Design prototype files (`.dc.html`, `engine.js`,
  `support.js`). These are exported prototypes, not the app; don't edit them
  to fix bugs — port fixes into `app/` instead. `project/engine.js` and
  `app/src/domain/generation/` (`solver.ts`, `generate.ts` and friends) are
  (currently) the same generator and solver, the app's typed and split up;
  if you change one for a real fix, check whether the other needs it too, or
  whether `project/` can just be left as a historical snapshot.
- `app/` — the actual React app (Vite + React 19, **TypeScript strict**, CSS
  Modules). This is what ships and what you should be editing for any real
  feature/bug work. See *Engineering standards* below for the layer rules.
  - `src/domain/` — pure TypeScript, no React/DOM/Supabase (lint-enforced):
    `generation/` (below), `rng.ts` (the seeded RNG everything random draws
    from), `geometry.ts`, `hints.ts` (`hintLeaf`/`hintMatching`/`hintReveal`),
    `house.ts` (the
    building the puzzle sits in, below; seeded by the level's own
    coordinates, every number precomputed once per level), plus the small
    rules the UI used to carry inline: `cover.ts`, `scoring.ts` (the one
    mirror of the SQL score), `calendar.ts`, `sites.ts`, `navigation.ts`,
    `invoice.ts`, `profile.ts`, `gameModes.ts` (the modes generation can be
    configured for: only `daily` today), `generationConfig.ts` (which saved
    config is in force on a day, and the schedule it resolves to — falling
    back to `DEFAULT_SCHEDULE` when none is saved or it doesn't parse),
    `stats.ts` (`parseStats`: a player's own numbers from `player_stats()`; `percent`, `sparkPoints`),
    `ranking.ts` (the shape of a leaderboard — `BoardKind`, `Board`, `windowOf`, `placeText` —; the ordering itself is SQL's),
    `graphStats.ts` and `graphIdentity.ts` (when
    two levels are the same: `drawingKey` up to moving/rotating/mirroring,
    `shapeKey` up to node order — an exact canonical labelling), and the
    shared `types.ts`.
  - `src/services/` — `supabase/client.ts`, `result.ts` (`Result<T>`),
    `logger.ts`, one repository per aggregate in `repositories/`, and
    `auth/` (`AuthProvider` + `useAuth`: the app's single session source;
    `useIsAdmin`), and `generation/` (worker clients: `generateAsync` for
    one level on demand, `previewDayAsync` for a schedule's whole day, both
    over the shared `workerCall`).
  - `src/game/` — everything about play that both themes share, and no
    drawing: `state/` (pure reducer that turns taps into numbered events,
    selectors, hints, score-card copy), `input/keymap.ts`, `audio/`
    (`AudioService`: Web Audio chirps/crashes/fanfare plus the recorded
    crackles in `src/assets/sfx/` for CATASTROPHE INC.; Stargazer's own in `skySounds.ts` — `twinkle(progress)` a glassy bell
    whose pitch follows how much of the figure glows (`SkyPlay` passes `play/sky.ts` `skyProgress`, the share of lines lit;
    `progressNote` maps 0..1 onto two octaves of G major pentatonic, G4 to G6, so any size of sky climbs the same range,
    never wraps, and the last line lit lands on the top G), `fade(from, to)` the note sliding down to where the figure
    now stands when one is dimmed, `constellation()` for a figure complete (the scale runs up, then blooms into a soft
    chord with glitter — Stargazer's in place of the fanfare), `fizzle()`
    when the telescope is out of power, and the slew — all through one small echo, `spaceBus`; `synth.ts` is the
    toolkit they share), `hooks/` (`useDailySchedule` — today's
    saved generation config —, the levels queue that generates the week from
    it, score card, streak, `useNights` — each night's charted/at-par count
    from `site_clears`, for the moon calendars —, `useSkyNames`,
    `usePlayerStats`), the sessions (`useGameSession`, `useCampaignSession`,
    `useSurvivalSession`, `useMatchSession`), `useAppState.ts` (what has to
    outlive every screen and both themes), `useOrientation.ts`, and the logic
    the old screens used to carry: `match/` (lobby, matchmaking, ladder, one
    live match), `crew/` (friends, squads, player search), `account/`
    (magic link, handle editor).
  - **`src/themes/`** — the two looks. Each theme is a whole front end over
    `game/`, and lint forbids either from importing the other (or `app/`), so
    one can be dropped without touching the other.
    - `themes/stargazer/` — **the game.** `StargazerApp.tsx` (page routing),
      `tokens.css` (the theme's only raw colours/fonts, scoped to `.sg`),
      `copy.ts` (planet names, name ideas, share text, week/month calendars),
      `kit/` (Page and its skies — `Page` takes a `header` slot, `DeskPage` fills it with the shared desktop header —, Starfield, Button, TabBar, Moon, MiniStar,
      Planet, Figure — a still sky for previews, results and the atlas —,
      icons, `Leaderboard`/`Pills`/`PlaceLink`/`Sparkline` — a board drawn, its switches, the one-line "#12 of 340 tonight · Board ›"; `ListCard`/`ListRow` — one card of tappable rows split by hairlines, with a
      detail, a mint badge or an action label in place of the chevron —; `ProgressStars` — tonight's skies as a bar —;
      `DeskHeader`/`DeskContext`/`DeskPage` — the one desktop header every page shares: brand, Tonight · Atlas · Voyage · Rush ·
      Duel, streak pill, avatar to Me; `StargazerApp` provides its props through `DeskContext`, a phone-column page wears it with
      `DeskPage active=…`, the wide pages (Tonight, Me, Stats) render `DeskHeader` themselves), `play/` (`SkyPlay` — the one board screen every mode uses, phone
      column or desktop three-column —, `SkyBoard`, the telescope, `sky.ts`, and `warp.ts` — where each
      star is drawn: the lattice taken off the grid with a seeded tilt,
      stretch, slant, slow drift, per-star nudge and longer/shorter tails, plus
      a size per star; seeded by the figure itself (`skySeed`), so a sky, its
      preview and its atlas page match for every player; stars that would cross
      a line, crowd another star, sit on a line not theirs or fold two lines
      together are calmed one by one, then put back on their cells. Drawing
      only: the puzzle is untouched, and arrow keys move by the drawn positions;
      **the board fits a big sky to the phone** (`sky.ts`, given the board's size from `hooks/useBoxSize` via `SkyPlay`):
      `skyPoints` turns a sky a quarter turn when that draws it ≥ 15% bigger (board only — `Figure`, previews and the
      atlas pass no view and draw as before), the board keeps a tight margin (its svg lets the glow spill), and the stars'
      scale is raised so a dim star's core is ≥ 4.5px on screen, capped so halos never meet; a sky of `BIG_SKY` (20)
      stars or more tightens the phone column (`.compact`, the same CSS variables the short-phone media query sets);
      `SkyStage` — where the board sits, and the **telescope slew** between skies: whenever `SkyPlay`'s slot
      (`siteOffset + idx`) changes, in any mode, the view closes to an eyepiece with a reticle (the rest of the page
      dark around it), the sky just charted slides away while faint stars streak past and the `ScopeArt` telescope in
      the corner swings, the next sky drifts in out of focus and is racked sharp, then the eyepiece opens. `slew.ts`
      is the pure timeline (`slewFrame(T)`, `slewHeading`, seeded `fieldStars`), `useSlew` starts it in a layout
      effect and runs the clock; ~1.85 s, twice as fast in Meteor Rush (`pace="brisk"`, its clock is running), a tap
      skips it and never reaches the new sky, none for reduced motion or the first sky on a screen. Its sound is
      `audio.slew(slewBeats(pace))` (synthesised: eyepiece click, motor whir and whoosh, focus ticks, a bell when sharp;
      the returned stop cuts it on a skip or unmount). Drawing and sound only)
      and `screens/` (Tonight, FirstNight, Sky — daily play and Night
      charted —, Atlas, Voyage, Rush, Duel, Observatory, Stats, Board — the leaderboard pages, below). It never imports
      `src/ui/` (that kit is CATASTROPHE INC.'s).
      **On a phone every page fits the screen with no page scrolling** (checked
      at 390×844 and 375×667): the `Page` column is exactly screen height, the
      board or a drawing takes the leftover space through `kit/Layout`'s `Fit`,
      a list that can grow without limit (voyage path, atlas, friends, boards)
      scrolls inside its own `Scroll` panel, and `@media (max-height: 760px)`
      tightens spacing. A page with more than a screen of sections splits into
      sub-pages instead (Me's friends, leaderboard and Edit profile).
      **One radius scale** (`tokens.css`): `--sg-r-card` (24px) for every card and panel, `--sg-r-inner` (16px) for wells and
      tiles inside a card, 999px for pills and buttons; `--sg-divider` for hairlines. Don't add other card radii.
      **Me, Stats and Tonight** (the simplified layouts): Me is a profile card (`Edit` opens the Edit profile sub-page: handle +
      picture + Sign out), the month calendar (`MonthCard`, Monday first, `monthOf().lead` blank cells; on a phone `fill`
      makes it the part that takes the leftover height, its moons sized to it by a container query) and a `ListCard` of
      Friends / Leaderboard / All my stats (/ Admin, a sub-page listing the admin pages, for admins). On a phone "How to
      play" sits in the title bar; the desktop keeps the streak/week wells, the admin buttons and the footer. Stats shows one mode at a time (`Pills stretch` on a phone, mode cards on desktop); what each
      mode says is the pure `screens/Stats/statsView.ts`. Tonight's card is "Sky N of 7" over a `ProgressStars` bar, with one
      "More ways to play" `ListCard` (each `ModeCard` carries its `detail`, `badge` and desktop `action`).
    - `themes/catastrophe/` — the hidden CATASTROPHE INC. look, unchanged:
      `CatastropheApp.tsx`, `game/` (`GameScreen`, `components/` — Board,
      which owns the camera, its layers, HUD, score card, side rails —,
      `camera/`, `layout/layout.ts` (lattice → world, memoized per level),
      `scene/` (`buildScene`/minimap/`cable`), `fx.ts`, `copy.ts`,
      `input/useBoardPointer.ts`), `sprites/`, `screens/` (Hub, WorkOrder,
      HowToPlay, Campaign, Survival, Match, StaffOffice, Crew), the staff
      badge and the "Back to Stargazer" pill.
  - **Voyage flight** (`themes/stargazer/screens/Voyage/`): charting the last level of a world (not Neptune's) plays a ~9 s
    full-screen flight to the next world instead of dropping back to the voyage. Design reference:
    `handoff/VoyageTransit.jsx` + `handoff/PROMPT-voyage.md` (ported, not redesigned). `VoyagePlay`'s `onWorldDone` →
    `StargazerApp` sets `route 'voyage'`, `openChapter` (seeds `VoyageScreen`'s `initialChapter`, keyed so it resets) and
    `transit`; `VoyageTransit` (`{from, to, onDone, startAt = 1.2, clears?}`) overlays the real screen, which already shows the
    world just charted. Every frame is a pure function of T: `timeline.ts` (`CUES`, `TOTAL`, `skip`: a tap between Liftoff and
    Approach jumps to Arrival), `frame.ts` (`frameAt`), `kit/motion.ts` (shared with the slew: easings, `animate`, `alpha`/`mix` over theme CSS variables
    — no hex), `Hero`, `Motif` (per-world surroundings), `Route`, seeded particles in `flightParticles.ts`. The screen under and
    inside the flight is drawn from the same parts (`VoyageView`: `Stop`, `WorldsRow`, `ChapterCard`, `NextWorld`;
    `FlightScreen` assembles them), so the two match. Purely visual: it never touches clears or persistence. Reduced motion shows
    the arrival frame for 300 ms fade + a short hold; Escape leaves.
  - `themes/transit/` — the wormhole animation between the seventh tap on the Stargazer title and CATASTROPHE INC.
    (`WormholeTransit`, ported from the handoff in `Wormhole Easter Egg Animation/`, which stays as the design
    reference). Every frame is a pure function of the clock's `T` (`timeline.ts`: `CUES`, `tick`, `choose`, `skip`;
    `useTransitClock` drives it off rAF); `Cockpit` has real buttons (the console holds at `HOLD_AT` until one is
    pressed, or slips after 2 s), a tap elsewhere skips to the hire, Escape leaves, reduced motion shows only the last
    frame. Mounted by `app/App.tsx` over Stargazer; `?skin=catastrophe` and "Back to Stargazer" stay instant. It reads
    both themes' tokens (`.sg` scope + `:root`) and adds only `tokens.css`; neither theme imports it.
  - `src/screens/` — the admin pages only: `Playground/`, `GenerationConfig/`
    (Tonight), `LevelPools/` (Voyage, Meteor Rush, Star Duel), `Recipes/`
    (below). The nav (`domain/adminPages.ts`, `app/admin/AdminNav`) has two
    groups: *Where levels go* — Tonight (`/generation.html`) and a page per pool
    mode (`/pools.html?mode=campaign|survival|match`, `poolModeFromSearch`) — and
    *How they're made* — Recipes and Playground. Every page that edits a rule
    (a sky, a tier, the fallback, the playground's settings) lays out the same
    way: the open rule on the left (its `RecipeBar`, then the full `ParamsPanel`,
    so every generator option is in reach everywhere), the preview in the
    middle, save/publish on the right; a dirty draft asks before the page is left
    (`hooks/useUnsavedGuard`). On Tonight and the pool pages a `ScopeSwitch` at
    the top of the panel says what an edit reaches — the open sky/tier, or all
    of them (`screens/Playground/scope.ts`: "all" copies only the settings the
    edit changed, so each rule keeps its own size, stars, budget and hardness).
    The panel also lists settings that cancel each other out
    (`Playground/warnings.ts`: a density above what max degree or edge reach
    allows, a max degree the reach caps, a min degree nothing can meet). They wear Stargazer's look: `app/admin/AdminPage`
    puts them on Stargazer's night (`.sg` tokens, starfield, the nav groups as
    pill tab bars), they build from `themes/stargazer/kit` (its `Button` has an
    `xs` size for their dense panels, `Note`) and Stargazer's tokens only, the
    playground's play-test view is Stargazer's `SkyBoard`, and their copy uses
    Stargazer's words (skies, lit stars, Tonight/Voyage/Meteor Rush/Star Duel).
    Lint forbids them `ui/` and `themes/catastrophe/`.
  - **`src/domain/generation/`** — level generation as its own module, with
    **one public API, `index.ts`**: nothing outside the folder imports its
    files (lint-enforced by `no-restricted-imports`). Inside: `options.ts`
    (`DEFAULT_GEN`, `OPTION_LIMITS`, `resolveOptions`), `builder.ts` (the
    mutable graph and the rules every path must pass: degree, reach,
    clearance, crossings, shortest cycle), and two **strategies** chosen by
    `GenOptions.strategy`: `gadgets` (the game's: `gadgets.ts` — leaf chains,
    degree-2 paths, cycles, hubs, crowns, each difficulty's menu — grown by
    `growth.ts`, ties broken with a spur) and `free` (`free.ts`: no templates,
    junctions placed in a box sized by `spread` and wired towards a target
    `density` with a `lengthBias`, ties broken by adding a path, never a
    leaf). `hardness.ts` (`greedyCover`, `matchingBound`) backs the optional
    `greedyMustFail`/`minBoundGap` filters, and `maxOptima` (1 = unique) sets
    how many optimal covers a level may have. `solver.ts` (exact branch-and-bound `solve` — the
    uniqueness check — and the star rating `difficulty`), `generate.ts`
    (`generate(request)`: seed, size, difficulty, options, constraints in;
    level, its other optimal covers (the first `KEPT_OPTIMA`) and a `GenReport` out), `schedule.ts` (the game's
    week as data: `DEFAULT_SCHEDULE`, one `SiteRule` per site, retries and a
    fallback; `levelForSite`/`levelsForDay` run it) and `parse.ts`
    (`parseSchedule`/`parseOptions`/`parseFigure`: untrusted JSON → a schedule or a list of
    errors) and `manual.ts` — **hand-drawn skies**, the generator's other way in: a `SkyFigure` (stars on integer
    lattice cells, lines between them) becomes a level through `checkFigure` (`solve` + `difficulty`: par, answer,
    how many answers, stars; blocking `figureErrors` — 2..40 stars, no shared cells, at least one line — and
    `figureWarnings` for what a generated sky would not have: crossings, long lines, lines over a star, busy stars,
    loose stars, separate pieces); `playable` means exactly one answer, which every place that uses a drawing
    requires. No seed and no RNG, so drawings can never move a generated level. Every request and schedule is plain JSON, so it can be stored,
    edited or posted to a worker. Every new option defaults to what the game
    already did (gadgets, any cycle, unique, no hardness filters), so
    `DEFAULT_GEN` makes the same RNG draws as before. The seed mixing in `levelForSite` is the
    "same puzzles for everyone" contract, not a setting. `DEFAULT_SCHEDULE`
    must keep reproducing the determinism snapshots. To run it off the main
    thread, use `services/generation/generationClient.ts` (`generateAsync`:
    one worker per request, abortable, answers a `Result`).
  - **Generator playground** (admin only): `/playground.html`, entry
    `src/playground.tsx`, built into every deployment as its own chunk (the
    game never downloads it) and wrapped in `app/admin/AdminPage` (sign-in +
    `AdminGate` + `AdminNav`). It drives `generate()` (through `generateAsync`) — the generator with every
    former hard-coded rule exposed as `GenOptions` (max/min degree, edge reach,
    clearance, crossings, shortest cycle, strategy — gadget mix and extra
    edges, or free density/spread/edge length — max optimal covers, the
    greedy and matching-bound hardness filters, search limits) —
    and shows the result as a schematic (cover, the other optimal covers
    one at a time, crossings) or as the game's sky (`SkyBoard`) — tap nodes in either view to
    play-test it against par (the lit stars are shared by both) — with `domain/graphStats.ts`
    and the generator's `GenReport` (why candidates were rejected) alongside.
    Its **Variety** panel sweeps N consecutive seeds in a second worker and
    counts distinct graphs and drawings (with Chao1 estimates of the total,
    a repeat chance, the share that met every rule, time per level and the
    most common graphs, each loadable by seed); finished sweeps collect in a
    **Compare runs** table (in memory only) so strategies and settings can be
    read side by side.
    Settings live only in the URL hash; its control ranges and site presets
    come from `OPTION_LIMITS` and `DEFAULT_SCHEDULE`. A **Generate | Draw by hand** switch swaps the settings
    for the sky editor (`DrawStage`; the drawing rides in the hash as `sky=`, `drawHash.ts`), play-testable as
    the game's sky, and can start from the last generated sky.
  - **Sky editor** (`screens/SkyEditor/`): the one hand-drawing UI every admin page uses. `editorState.ts` is the
    pure part (tools draw/move/erase, the line being drawn, undo, `hitTest`, `gridBounds`); `SkyEditor` is
    controlled (`figure` in, `onChange` out; remount with `key` for a fresh undo history), `FigureStatus` shows
    par/stars/answers and the errors and warnings, `useFigureCheck` memoizes `checkFigure`.
  - **Recipes** (admin only): `/recipes.html`, entry `src/recipes.tsx`,
    `screens/Recipes/`. A recipe (`domain/generation/recipe.ts`) is the *shape*
    of a sky — `SHAPE_KEYS`: strategy, degree, geometry, the gadget mix or the
    free-graph knobs — saved under a name; size, stars, hardness filters,
    constraints and the search budget are not in it, because a curve ramps them
    level by level. Applying one **copies** its shape in (`withShape`; on a run
    of skies or tiers through the `shape` editor actions, on one rule through the
    `shape` params action) and nothing links back, so a saved schedule or a
    published pool never changes when a recipe does. Which recipe a rule
    "uses" is worked out by comparison (`recipeFor`), so an edited rule reads as
    custom — no field was added to schedules or curves. Stored in
    `generation_recipes` (`app/sql/2026-10-27-generation-recipes.sql`, guarded by
    `sql/ci/checks/generation-recipes.sql`): readable by signed-in players,
    written only by the admin-checked `save_generation_recipe` /
    `delete_generation_recipe`; the game never reads it. Read through
    `repositories/recipes.ts` (a stored shape that no longer parses is dropped
    and logged) and `screens/Recipes/useRecipes`. The page edits a shape with
    `ParamsPanel use="recipe"` (shape sections only; seed, size and difficulty
    just pick the preview) beside a play-testable sky.
  - **Generation config** (admin only, the nav's *Tonight*): `/generation.html`, entry
    `src/generation.tsx`, `screens/GenerationConfig/`. Edits a whole
    `GenerationSchedule` for a game mode — retries, one tab per site (its
    `RecipeBar`, which can apply a recipe to a run of skies, then the
    playground's `ParamsPanel` through `siteToParams`/`paramsToSite`, plus the
    site's constraints) and the fallback — previews the week it makes on any
    day in a worker (per-site time, which retry or the fallback settled it,
    play-testable schematic), and saves it **from a future day on** (tomorrow
    at the earliest). The newest saved config is loaded on open; older ones
    can be loaded back, scheduled ones cancelled.
  - **Level pools** (admin only): campaign, survival and 1vs1 don't generate
    while someone plays. An admin edits a `LevelCurve` (`domain/generation/curve.ts`:
    seed, retries, a list of tiers — count, size, stars, options, constraints —
    and a fallback; `DEFAULT_CURVES` per mode, `parseCurve`, `curveRuleErrors`; a tier may instead be
    **hand-drawn**: `manual` holds one `SkyFigure` per level, `count` follows it, `generateSlot` plays the
    drawing at the slot's `index` in its tier, `curveRuleErrors` needs each one playable, and `orderByHardness`
    leaves hand-drawn slots where the admin put them; the tier panel's Generate | Draw by hand switch starts the
    drawings from the tier's last build)
    on `/pools.html?mode=…` (`screens/LevelPools/`: one page per mode; the left
    column is the open tier — or the fallback — with its count, `RecipeBar` and
    the full `ParamsPanel` + constraints, so every generator option is editable per
    tier; the middle starts with `TierStrip`, a bar per tier, as wide as its
    levels and as tall as its size, coloured by stars, with the recipe bands
    under it, arrow keys walk it), generates the pool slot by slot in
    a worker (`services/generation/poolClient.ts`, each level re-checked with
    `solve` for a unique cover; **no sky twice in a pool**: each slot is passed the
    `poolKey`s — `graphIdentity`'s `shapeKey` — of the slots before it and
    `generateSlot` passes over a retry that repeats one, flagging `duplicate` only
    when nothing new turns up, which `publishBlockers` refuses and the publish tools
    warn about), play-tests it and publishes it with
    `publish_level_pool`. `app/sql/2026-10-20-level-pools.sql` (guarded by
    `sql/ci/checks/level-pools.sql`): `level_pools` (one row per published
    version, highest is live) and `pool_levels`; RLS on, readable by all,
    writable only by that function. The **server picks the level**:
    `campaign_level(n)` (a player who cleared `n` keeps the version they cleared
    it on, `campaign_clears.pool_version`), `survival_level(seed, step)` (tier =
    step, capped at the last; the run walks each tier **without replacement** in an
    order shuffled by its seed — `app/sql/2026-10-30-survival-no-repeat.sql`, check
    `sql/ci/checks/survival-no-repeat.sql` — so the last tier's size is how deep a run
    goes before a sky comes back; a run stores its seed and pool, and `submit_survival_site`
    re-derives the level), `create_match(opponent, tier)` (random from the match
    pool, stored in `matches.level`). The client reads them through
    `services/levels/poolLevelSource.ts` (`levelSource`); `mockLevelSource` stays
    for tests only (`src/test/setup.ts` swaps it in). A mode with nothing
    published says so (`usePoolPublished`, `UNPUBLISHED_COPY`). Campaign: 100
    levels (tiers add up to `CAMPAIGN_LEVELS`), **one tier per level**: `campaignRamp()` (`curve.ts`) climbs from 5 to
    `MAX_LEVEL_NODES` (40) junctions, stars 1/2/3 (3 only from 25 junctions: a smaller graph rarely needs the hardest
    technique), `greedyMustFail`, a rising `minBoundGap` and a par floor (`minK`). The generator aims, it does not
    promise, so a finished campaign pool goes through `orderByHardness` (the pool page does it when a build finishes,
    `tools/local.ts` when it seeds) which hands the levels back to the slots easiest first by the measured
    `levelHardness` — no level is easier than the one before it (adjacent levels can still tie on every measure).
    `campaign_clears` itself is still a client upsert of the player's own row.
    **A voyage stays on the pool it started on** (`app/sql/2026-10-29-campaign-pool-follows-player.sql`, check
    `sql/ci/checks/campaign-pool-follows-player.sql`): `campaign_pool_version(uid)` is the version of the player's
    furthest clear (newest pool if none); `campaign_level` serves uncleared levels from it and a first clear is
    stamped with it, so republishing the campaign only reaches players who have not started. Old versions are never pruned.
    **Seeding without an admin** (`app/sql/2026-10-28-seed-level-pools.sql`, check `sql/ci/checks/seed-level-pools.sql`):
    `.github/workflows/publish-pools.yml` is `workflow_dispatch` only (never scheduled) and runs `app/tools/publish-pools.ts`,
    which publishes the default campaign and survival pools as version 1 through `publish_seed_pool_system` (service role,
    those two modes, refuses when the mode already has a pool). Run it once when Voyage says no skies are published.
  - **The daily week is published, not generated by each player** (`app/sql/2026-10-21-daily-levels.sql`,
    guarded by `sql/ci/checks/daily-levels.sql`): `daily_levels (day, idx, level)`, readable by all, insertable only by
    the service role, a trigger refusing an invalid level or one over 40 junctions, never rewritten.
    `.github/workflows/publish-daily.yml` runs `app/tools/publish-daily.ts` at 00:00 GMT (and 00:15 as a safety net, and
    on demand with a day): it resolves the schedule in force for that day, generates the seven levels with at least 20
    retries each, re-checks the unique cover with `solve` and inserts them (a day that already has rows is left
    alone). Needs the `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` secrets on the `production` environment.
    **A hand-drawn sky can be pinned to one site of one future night** (`app/sql/2026-10-31-daily-manual-levels.sql`,
    check `sql/ci/checks/daily-manual-levels.sql`): `daily_manual_levels (day, idx, level, figure)`, unreadable by
    players (future puzzles must not leak), written by the admin-checked `save_`/`delete_daily_manual_level` (tomorrow
    on, never a published day), listed by `list_daily_manual_levels`; the job reads it as `service_role`, works the
    level out again from the drawing alone and plays it in place of that site. The Tonight page's *Hand-drawn days*
    view edits them (`ManualDays`, `usePinnedSkies`, `repositories/dailyManualLevels.ts`). The on-device fallback
    week below can't read them, which is fine: its clears are not recorded. The
    client reads the week through `repositories/dailyLevels.ts` and `useDailyLevels`; only when it isn't there does
    `useGameSession` build it on the device from `useDailySchedule` — and those clears are **not recorded**
    (`onSchedule` false), because the device's week may differ from the one published afterwards.
    `DEFAULT_SCHEDULE` is a seven-step ramp, 5 to 40 junctions. Every level the game plays is capped at
    `MAX_LEVEL_NODES` (`gameConstraints` is applied to every site, tier and fallback; `gameRuleErrors` and
    `curveRuleErrors` refuse a bigger size). A retry only counts when it met every rule (`!report.fallback`); the first
    near miss is kept only if no retry did. The determinism snapshots were regenerated for this ramp on purpose.
  - **1vs1 is two things** (`app/sql/2026-10-22-ranked-matches.sql`, guarded by `sql/ci/checks/ranked-matches.sql`):
    a *challenge* to a friend or squad mate (`create_match`, unranked) and a *ranked* match from the opponent search.
    `find_match(tier)` pairs the closest rating in `match_queue` (same tier, not the same opponent within 10 minutes) and
    starts the match at once on a level from the match pool; the first player in gets `null` and asks again every 3 s
    (`useMatchmaking`: that call is also what keeps them queued, a row not seen for 20 s is dropped), and gives up after a
    minute. A ranked match moves an Elo rating (`match_ratings`, start 1000, K 32, floor 100) through a trigger on
    `matches` when it becomes `done`, so a win, a forfeit and the clock running out are all covered; a void match and any
    unranked match move nothing; `match_players.rating_before/after` feed the result sheet. `leaderboard_ranked` is the
    ladder. `domain/rating.ts` mirrors `elo_next` (a test pins the numbers); the SQL is the authority. The lobby
    (`MatchLobby`) shows `FindOpponent`, `MatchLadder` (rating + ladder), then the friends.
    **The match pool is republished every night** (`app/sql/2026-10-23-nightly-match-pool.sql`, check
    `sql/ci/checks/nightly-match-pool.sql`; `.github/workflows/publish-match-pool.yml` at 00:30 GMT running
    `app/tools/publish-match-pool.ts`): `DEFAULT_CURVES.match` (20 + 20 levels) seeded with the day number, every level
    re-checked with `solve`, published through `publish_match_pool_system` — service role only, match mode only, keeps the
    newest seven pools (a running match keeps its level in `matches.level`). `publish_level_pool` is now admin check +
    `publish_pool_unchecked`. Same secrets as `publish-daily`. The jobs run as `service_role`, which bypasses RLS but not GRANTs: a table they read needs `grant select … to service_role` in its migration (the CI stub grants everything by default, so CI cannot catch a missing one). Both publish workflows also run after a successful `migrate` (`workflow_run`), so a deploy never leaves the daily week or the match pool empty; both are idempotent. Until a pool exists the server answers `no match levels published` and the lobby says so (`isUnpublished` → `UNPUBLISHED_COPY`).
  - **Leaderboards** (`app/sql/2026-10-30-leaderboards.sql`, guarded by `sql/ci/checks/leaderboards.sql`): every Stargazer
    board — `night` (one night's points), `week` (the seven nights ending at a day, by `day_number`), `alltime` (every night ever; added in `2026-11-02-alltime-board.sql`), `voyage` (campaign
    stars), `rush` (best run), `duel` (ranked rating, from 5 ranked duels) — is one read, `board_rows(board, day, ids, limit)`:
    the server measures, orders and ranks (the file's header lists each board's tie-breaks; equal rows share a place), and
    adds the caller's own row when it is below the cut; `limit 0` reads only the caller's place. `security definer` over
    private tables; the ladder needs a signed-in player. The old views (`leaderboard_weekly`, `_alltime`, `_survival`,
    `_ranked`) stay for CATASTROPHE INC. Read through `repositories/leaderboards.ts` `getBoard`, `game/hooks/useBoard.ts`
    (`useBoard`: fellow stargazers when the player has any, else everyone, with a switch; `useMyPlace`), drawn by
    `kit/Leaderboard`, placed by `screens/Board/` (`BoardPanel` = read + draw, used by Rush's lobby and dawn page;
    `BoardView` = switch between boards, used inside the Observatory; `BoardScreen` = a whole page, route `board` in
    `StargazerApp`). **A board never appears in play**: `SkyPlay` takes no board data; a board is opened from a one-line
    `PlaceLink` on Tonight, Night charted, Voyage and the duel lobby, from Rush's lobby and dawn page, from the duel
    result's "Ladder" line, and from the Observatory. Changing an ordering rule means the SQL and the copy in
    `themes/stargazer/copy.ts` `BOARDS` together.
  - **The duel ladder** (`app/sql/2026-11-01-duel-ladder.sql`, guarded by `sql/ci/checks/duel-ladder.sql`; it remakes `board_rows`
    and `board_scored`, so read that file's header, not the 10-30 one, for what they return now). The `duel` and `season`
    boards are the ladder's and share a page (`BoardScreen` with kinds `['duel','season']`, a switch "Ladder / This month"): they
    list the top `LADDER_TOP` and `LADDER_AROUND` rows either side of the reader (`p_around`; `withGaps` marks the rows left
    out), each rival's row says who leads their head-to-head (`won_vs`/`lost_vs`, any finished duel; `versusText`) and which
    way the rating has moved over the last five ranked duels (`trend`, duel board only), and a fellow stargazer's row offers
    "Challenge" (`useChallenge` → `create_match`, unranked; the ranked opponent search stays in the lobby, one button away:
    "Find a ranked duel"). `ladder_progress()` (`useLadderProgress`) says "3 of 5 ranked duels to appear" before a newcomer is
    listed (`LADDER_MIN_GAMES` all-time, `SEASON_MIN_GAMES` in a month). **A season is a calendar month (UTC) of rating
    gained** — the sum of what each ranked duel moved (`match_players.rating_after - rating_before`), everyone from zero —
    not a second Elo: `match_ratings` and its trigger are untouched, so the all-time rating and its peak (Stats) carry on.
    `season_start(day)` (SQL) and `seasonOf(day)` (`domain/calendar.ts`) name the same month; `player_stats` gains
    `season_gain`/`season_games`.
  - **Stats** (`app/sql/2026-10-31-player-stats.sql`, guarded by `sql/ci/checks/player-stats.sql`): `player_stats()` answers
    the signed-in player's own numbers in one call — nights (played, full moons, skies, at par, points, best night), the
    streak, the voyage, Meteor Rush, and the duels (rating, peak, record, last five results, the rating after each of the last
    30 ranked duels). Own numbers only (it reads `auth.uid()`, takes no argument); a signed-out caller is refused. Read through
    `repositories/stats.ts`, `game/hooks/useStats.ts` and `domain/stats.ts` `parseStats` (a missing field reads as zero), drawn by
    `themes/stargazer/screens/Stats/StatsScreen` (route `stats`, opened from the Observatory's "Stats" link; each section ends
    with the player's place on that mode's board, a `PlaceLink` into the board page). Outside play only.
  - **Named constellations** (`app/sql/2026-10-25-sky-names.sql`, guarded by
    `sql/ci/checks/sky-names.sql`): `sky_names (user_id, day_number, name,
    figure)`, one row per player per night, upserted to rename. Row level
    security: a player reads and writes only their own rows. `figure` is the
    night's last sky without its answer (`domain/nights.ts` `figureOf`),
    copied in so the atlas never re-reads old weeks; cosmetic, nothing scores
    from it. Read through `repositories/skyNames.ts` and `useSkyNames`.
  - **Profile picture** (`app/sql/2026-10-26-profile-avatar.sql`, guarded by `sql/ci/checks/profile-avatar.sql`):
    `profiles.avatar` is null (the handle's initial), `icon:<id>` (one of `AVATAR_ICONS` in `domain/avatar.ts`, drawn
    by Stargazer's `kit/AvatarArt.tsx` from theme tokens) or a 128px jpeg data URL (`services/image/avatarPhoto.ts`
    crops and shrinks a picked file; the column check caps its length). Public like the handle (`PUBLIC_COLS`).
    The signed-in player's own is in `useAuth().avatar`/`setAvatar`; Stargazer's `Avatar` takes `avatar`, and the
    Observatory's "Your picture" sub-page (`AvatarPicker`, `useAvatarEditor`) changes it.
  - **Admins and saved generation** (`app/sql/2026-10-07-admin-generation-config.sql`,
    guarded by `app/sql/ci/checks/admin-generation-config.sql`):
    `public.admins` (rows added by hand in the SQL editor — data, not a
    migration — and unreadable from the client), `is_admin()`, and `generation_configs` (`mode`,
    `effective_from_day`, `schedule` jsonb). Everyone may read the configs;
    only `save_generation_config`/`delete_generation_config` (security
    definer, admin-checked, refusing today or earlier) can write them. The
    admin gate in the app only decides what's shown — Postgres is the check.
    The game reads the config in force for today (`useDailySchedule`, 5 s
    timeout) before generating anything; a missing table reads as "nothing
    saved", since a deploy can go live just before its migration lands. If that read fails or the stored
    schedule doesn't parse, the game plays `DEFAULT_SCHEDULE` and **doesn't
    record clears** (`skipSave`: they may not be everyone's puzzles); with no
    config saved, `DEFAULT_SCHEDULE` *is* the schedule and clears count.
  - **Installable app (PWA)**: `index.html` links `public/manifest.webmanifest` (standalone, Stargazer's night colours)
    and the iOS `apple-*` tags; `viewport-fit=cover`, so `kit/kit.module.css`'s `.column` pads by
    `env(safe-area-inset-*)` (0 in a browser tab). Icons: `public/icon.svg` (the Big Dipper, inside the central 80%, so it is also
    the maskable icon) rendered to `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` — re-render them if it
    changes. `public/sw.js` is the service worker, registered in production only by
    `services/pwa/registerServiceWorker.ts` as `/sw.js?v=<main bundle name>`, so every deploy gets a fresh worker and
    cache (the old one is deleted). It keeps same-origin files as they load (pages network first, `/assets/` cache
    first), never touches Supabase or Google Fonts, and the page hands it what loaded before it took over plus
    `scheduleWorkerUrl`, so the game opens and plays the on-device week offline after one visit (those clears are not
    recorded, as with any on-device week).
  - `src/app/` — `App.tsx` (the providers, the shared `useAppState()`, and
    which theme draws it) and `useTheme.ts` (Stargazer unless the URL says
    `?skin=catastrophe`; kept in the URL, not storage); `admin/` is the
    frame every admin page renders in.
  - `src/ui/` (Button, Panel/TabHeader, Tag, Logo, Screen, StaffBadge, Stat,
    Avatar, Field, ListRow/RankRow, ScopeTabs, Message, GradeBadge — the
    CATASTROPHE INC. kit) and
    `src/themes/catastrophe/sprites/` (PadSprite, CatFlipbook, ThingSprite, PathWeb/PathLit and
    the two-tone path theme): shared presentation used by the board, the
    work order and the orientation alike — never re-draw a pad, cat or path
    somewhere else. `src/hooks/` holds generic hooks (`useResource`,
    `useWindowKey`, `useClipboard`, `useCulled`).
  - `src/styles/tokens.css` — the only home of raw colours, font stacks and
    the sticker border/shadow recipe (CATASTROPHE INC.);
    Stargazer's (and the admin pages') are in `src/themes/stargazer/tokens.css`. `styles/global.css` holds the `cc-*`
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
    (`src/services/`; SQL in `app/sql/`, applied to production automatically
    on merge to `main` by `app/tools/migrate.sh` — see `app/sql/README.md`),
    and stores the admin-saved generation configs. The puzzle itself still
    needs no backend — without it, the default schedule plays — and a
    signed-out player gets the whole game. Don't add other
    persistence (localStorage etc.) without checking with the user first.

## The board is a camera, not a fit

*(This and the next section are the CATASTROPHE INC. board, in `themes/catastrophe/`.
Stargazer's `SkyBoard` is a plain SVG fitted to the sky — a small graph needs no
camera — with its star size growing for big skies, capped, and the sky turned and its stars kept readable to fit
the board, in `play/sky.ts`, and
its stars placed off the lattice by `play/warp.ts`.)*

Levels used to be scaled down to fit a fixed viewBox, so spacing collapsed as
graphs grew (150 world units per lattice step in house 1, 40 in the worst house
7 — where a smashable ended up wider than the cable it sat on). Instead:

- **One fixed `SPACING` (130) for every house.** A cat is the same size in
  house 7 as in house 1. `layoutFor()` (`themes/catastrophe/game/layout/layout.ts`) maps
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

None of this touched the generator (now `domain/generation/`) — seeded generation, the uniqueness check and
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
  randomness is `domain/rng.ts`'s seeded RNG (no `Math.random()`, no random sort
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
light rim outside it (`PATH_INK` / `PATH_RIM` / `PATH_DASH` in `src/themes/catastrophe/sprites/theme.ts`).
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
the shipped app is now Stargazer. Shared code (`domain/`, `game/`,
`services/`) still speaks CATASTROPHE INC. (sites, pads, hire/recall, cats);
that is fine — rename only if asked. In `themes/stargazer/` use Stargazer's
words: skies, stars (lit/dim), lines (lit/dark), par, nights, the atlas,
the telescope; in `themes/catastrophe/` keep the cat words.

## Engineering standards (the default for ALL new work)

The codebase follows the layered structure above. New code follows these rules;
don't reintroduce the old patterns (god components, inline styles, copy-paste,
side effects inside render).

**Layers and dependency direction** — `domain` ← `game` / `services` ←
`themes/*` / `screens` (admin) ← `app`. `ui` and `themes/catastrophe/sprites`
depend only on `styles`, `assets` and `domain/types`. A theme never imports
the other theme or `app/`; Stargazer never imports `ui/`.

- `src/domain/` — pure TypeScript: level generation, house, cover rules, scoring,
  calendar, sites, share text. No React, DOM, Supabase or `Math.random()`.
- `src/services/` — Supabase client, repositories (one file per aggregate:
  profiles, siteClears, leaderboards, friendships, squads, admin,
  generationConfigs), auth provider, the generation worker clients.
  Repositories return `Result<T>` and log through one shared logger. Components
  never call Supabase directly; they use repositories via hooks.
- `src/game/` — reducer + selectors, sessions, input keymap, audio service,
  and the hooks both themes read their data through. No drawing.
- `src/themes/<theme>/` — a theme's pages, its board and its tokens.
- `src/screens/` (admin), `src/ui/`, `src/styles/` — the admin pages, the
  CATASTROPHE INC. primitives (Button, Card, TabHeader, Logo, GradeBadge), and
  design tokens.

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
  The tests freeze `Date.now()` because the generator has a wall-clock search
  budget: with a live clock, a slower device can settle on a different level
  than a faster one for the same day. That is a known, pre-existing gap in the
  "same puzzles for everyone" promise — don't paper over it in tests, and ask
  the user before changing generation (any fix changes the days' puzzles).
- The layer rules are enforced by `no-restricted-imports` overrides in
  `app/.oxlintrc.json` — fix the dependency, don't disable the rule.
- Schema changes: a new `app/sql/YYYY-MM-DD-name.sql`, never an edit to one
  that has merged (the runner checksums applied files and refuses). CI replays
  every migration onto a Supabase stand-in (`app/sql/ci/supabase-stub.sql`)
  and runs `app/sql/ci/checks/`; merging applies it to production. No
  `begin`/`commit` inside a migration — each already runs in a transaction.
- New board behaviour: put the rule in `game/state/gameReducer.ts` (pure,
  returns an event), react to the event in each theme's board screen
  (`SkyPlay` for Stargazer, `GameScreen` for CATASTROPHE INC.: sound, saving,
  UI effects), and draw it there (`SkyBoard`; `buildScene` for the house). Don't mutate instance fields or
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

- `npm run db:up` runs a local Supabase for this project (Docker + `psql`;
  `app/supabase/config.toml`, `app/tools/db-local.sh`; see `app/sql/README.md`):
  the schema still comes from `app/sql/`, not from the Supabase CLI's own
  migrations. `db:admin -- <username>` makes a player an admin.
- Lint is `oxlint` (`.oxlintrc.json`), not ESLint — don't add ESLint config.
- `npm run check` = lint + `tsc --noEmit` + Vitest + build. It must be green
  before any change is considered done. Tests live beside the code
  (`*.test.ts[x]`) or in `src/__tests__/`.
- The puzzle generator (`domain/generation/`) is deterministic per day via a seed
  derived from `Date.UTC` epoch + day offset — the same puzzle set must be
  reproducible for all players on a given day. Be careful not to break that
  determinism (e.g. don't introduce `Math.random()` outside the seeded RNG).
- Levels must keep a **unique** optimal cover — this is what makes the
  puzzle feel deducible rather than guessed. If you touch the generator,
  preserve the uniqueness check rather than relaxing it for convenience.
  (`maxOptima` can relax it, but only the playground does — the generation
  config page and `resolveSchedule` refuse it via `gameRuleErrors`; the game stays at
  1, and the INSIDER hint assumes one solution. Changing that is the user's
  call.)

## When designs change again

If another `.dc.html` file shows up in `project/` (a new theme pivot or
iteration), treat it the same way this file treats CAT_COVER vs BLACKOUT:
read it and any accompanying chat transcript in `chats/` before assuming
`app/` is still current, and check with the user if it's unclear which
design is meant to ship.
