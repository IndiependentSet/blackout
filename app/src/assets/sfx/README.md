# Sound effects

Recordings the game plays, as opposed to the chirps, crashes and fanfare it
synthesises in `CatCoverGame.jsx`.

## The contract

    crackle-<n>.wav       a cat landing on a pad

`index.js` globs the crackles by name and the game picks one at random every
time a cat is hired, so repeated deployments don't sound like a loop. Recalling
a cat deliberately doesn't use these — it keeps the synthesised chirp, so
putting a cat down and taking one back never sound alike.

## Adding a take

Drop the original in `raw/` and run:

    python3 app/tools/prep-sfx.py

That trims the silence off both ends and normalises the take to the same peak
as the others. Trimming is the part that matters: the raw recordings open with
up to half a second of room tone, which would land the sound well after the tap
that caused it. Prefix a raw file with `_` to keep it out of the game.

The prep script uses the standard library only — 16-bit PCM in, 16-bit PCM out,
nothing re-encoded.
