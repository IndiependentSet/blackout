/*
 * Recorded sound effects.
 *
 * The synthesised chirps and crashes in CatCoverGame.jsx are built in the Web
 * Audio graph; these are actual recordings, trimmed and levelled by
 * ../../../tools/prep-sfx.py so a take starts on its first crack rather than
 * on the room tone in front of it.
 *
 * The crackles are the sound of a cat being deployed onto a pad — one is
 * picked at random per hire, so a row of deployments never sounds like a
 * loop. Recalling a cat is not a crackle; that keeps the chirp.
 *
 * The file name is the contract: `crackle-<n>.wav`. Drop another take in
 * `raw/`, re-run prep-sfx.py, and the game starts dealing it out.
 */
const urls = import.meta.glob('./crackle-*.wav', { eager: true, query: '?url', import: 'default' });

export const CRACKLES = Object.keys(urls).sort().map(path => urls[path]);
