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
3. The design pivoted to a **CAT COVER** theme (`project/CAT_COVER.dc.html`):
   same mechanic, reskinned as "place the fewest cats to ruin every room."
4. `app/` was updated to implement CAT COVER, replacing the BLACKOUT UI.
   **This is the current, live design intent.**

`README.md` and `chats/chat1.md` describe the *original* BLACKOUT brief, not
the current CAT COVER skin — read them for the underlying puzzle rules
(par/K, hint tiers, generation approach), but don't treat their neon/city
theme language as the current spec. `project/CAT_COVER.dc.html` is the
current design source of truth for visuals/copy; there is no corresponding
chat transcript for the CAT COVER pivot.

## Layout

- `project/` — Claude Design prototype files (`.dc.html`, `engine.js`,
  `support.js`). These are exported prototypes, not the app; don't edit them
  to fix bugs — port fixes into `app/` instead. `project/engine.js` and
  `app/src/engine.js` are (currently) identical copies of the same solver;
  if you change one for a real fix, check whether the other needs it too, or
  whether `project/` can just be left as a historical snapshot.
- `app/` — the actual React app (Vite + React 19, JS not TS). This is what
  ships and what you should be editing for any real feature/bug work.
  - `src/CatCoverGame.jsx` — the entire game (single class component): state,
    level queueing, input handling, audio (Web Audio chirps/crashes), share
    card, keyboard support.
  - `src/engine.js` — pure, framework-free: seeded RNG, gadget-based level
    generator (leaf chains, degree-2 paths, cycles, hubs, crowns), exact
    branch-and-bound solver, hint helpers (`hintLeaf`, `hintMatching`,
    `hintReveal`). No React imports — keep it that way if you touch it.
  - `src/assets/cats/` — the graph nodes themselves: cat stickers cut out of
    a hand-drawn sticker sheet, three poses per breed (`sleep`, `wakeA`,
    `wakeB`). Every sprite is baked onto the same 192x192 canvas at the same
    scale with the cat's feet on the same baseline (y = 182, exported as
    `CAT_BASELINE`), so a node can swap poses without the cat shifting.
    `index.js` is the only thing the game imports. If you add a breed, cut it
    to the same canvas convention — don't rescale sprites individually, or
    the cats stop looking like one cast.
  - `src/index.css` / `index.html` — global styles, fonts (Luckiest Guy +
    Nunito from Google Fonts), page title/meta. The `cc-*` keyframes live
    here; the cats use `cc-snooze` (breathing) when calm and
    `cc-pounce` + `cc-frame-a`/`cc-frame-b` (a two-frame flip-book) when
    they're out causing chaos.
  - No backend, no persistence layer (by design — see the original brief:
    "no backend, no localStorage"). Don't add either without checking with
    the user first; it's a deliberate constraint, not an oversight.

## Naming note

Code comments, variable names (`BLACKOUT engine`, `bo-*` CSS classes in the
old prototype), and this repo's own name (`blackout`) are leftovers from the
pre-pivot theme. Don't be misled by them — the shipped app is CAT COVER.
When adding new code, use CAT COVER-appropriate naming; you don't need to
rename existing leftovers unless asked.

## Working in `app/`

```
cd app
npm install
npm run dev       # Vite dev server
npm run build
npm run lint       # oxlint
```

- Lint is `oxlint` (`.oxlintrc.json`), not ESLint — don't add ESLint config.
- No test suite exists yet. If asked to add tests, ask which runner the user
  wants rather than assuming.
- The puzzle generator (`engine.js`) is deterministic per day via a seed
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
