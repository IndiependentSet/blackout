# Cosmetics art

Accessories drawn over the cats. They are purely cosmetic and unlocked by badges
(`domain/cosmetics.ts` is the catalogue). **No art is shipped yet**: until a file
exists the cat is drawn bare and the wardrobe shows "ART COMING".

## Contract

- File name: `<item>-<breed>-<pose>.png`
  - `<item>`: a cosmetic id (`hard-hat`, `party-hat`, `bow-tie`, `scarf`).
  - `<breed>`: a breed key from `src/assets/cats` (`whiskers`, `ninja`, `fluff`,
    `chaos`, `trouble`, `diva`).
  - `<pose>`: `wakeA` or `wakeB` — the two flip-book frames a hired cat plays.
- Canvas: **192x192**, transparent, same baseline as the cats (feet at y = 182,
  `CAT_BASELINE`). The file is drawn at the cat's own size and position, so the
  hat only has to be painted where that breed's head is in that frame.
- Both poses must exist for a breed, or that breed is drawn bare (a hat that
  shows in only one frame would flicker).
- Per item that is 6 breeds x 2 poses = 12 frames. Four items = 48 files.
- Don't rescale per file. Cut every accessory to the same canvas convention, as
  with the cats.

`index.ts` is the only thing the game imports; it globs this folder.
