# Cats demolition game redesign

_Started 2026-09-05 09:33 UTC_

---

## User

Continuing from "Redesigning dots and arcs visually".

## Assistant

We pivoted from BLACKOUT (a Sudoku-like cable puzzle) to CAT COVER — a daily vertex-cover game where nodes are mischievous cats and edges are household objects they knock over. You pick the minimum K cats to topple all breakables on the board.

Core mechanic: tap a cat to select it (it wakes up, wiggles, glows magenta), which tips over every object touching it with dust and crash sounds. Win when all objects are broken. The solver and generator stayed the same (branch-and-bound validation, 7-level daily ramp, unique optimal solutions).

We committed to a playful, cozy art direction: dark plum room, wooden floor, five cat breeds (Chaos, Ninja, Princess Fluff, Mr. Whiskers, Trouble) drawn in-engine with idle and selected states, household objects (plant, vase, mug, fishbowl, lamp) that animate on tap. The layout is responsive — three-column desktop (intro rail | board | rules) collapsing to single-stack mobile.

You just asked for longer, more visible arcs. I enlarged the canvas (560×610, 150px spacing), thickened and dashed the object paths, and scaled cats down so arcs stretch further. The board is now noticeably bigger; density control keeps crowded houses readable.

Next: named cat personalities per level, a fail card when too few are selected, and cat-face score pips in the intro rail. Hints system (three tiers) and share card are still pending.

Files: CAT COVER.dc.html, engine.js, support.js.

## User

I would like to change the game design and story a bit. Instead of showing every node of the graph with a cat, the nodes show as empty slot where you have to put a cat. The story behind can be something funny on the line of: you are a house demolishing kind of company that uses cats to destroy the house internally. You have to optimize the number of cats used to destroy all objects. Think about something along these lines and propose updated design and also introductory page

## Assistant

_[tool: read_file]_

_[tool: view_image]_

Reframing as **CATASTROPHE INC.** — a feline demolition contractor. Nodes become empty deployment pads; you hire and place cats to wreck every fixture, under budget.

_[tool: dc_write]_

_[tool: ready_for_verification]_

**CATASTROPHE INC.** — feline structural demolition, est. 2019.

What changed:
- **Nodes are now empty deployment pads** — dark chalk-ringed circles with a paw stencil, slowly rotating dashes. Tap one and a cat drops in (hard hat, hi-vis stripes, bouncing tail); tap the cat to recall it.
- **Story reframe**: you're a contractor whose only equipment is cats. Fixtures sit on the paths between pads; a cat wrecks every path touching its pad. Cats bill per head, so the par is now a **budget** — over-hiring gets "PAYROLL SAYS NO" and "accounts will call."
- **Intro page**: company letterhead, a clipboard WORK ORDER #day with the three-step brief, a diagram showing empty pad → arrow → cat on pad → smashed mug, liability small print, and a CLOCK IN button (Enter also works). Reachable again mid-game via RE-READ WORK ORDER.
- Copy throughout: HOUSES → SITES (7 named ones), TIDY UP → RECALL CREW, hints → CONSULT: SURVEY / ESTIMATE / INSIDER, share card → WEEKLY INVOICE.

Puzzle engine untouched. Original CAT COVER.dc.html is preserved. Next candidates: a per-site fail state when you run out of budget with fixtures standing, and cat names on the deployed crew.

