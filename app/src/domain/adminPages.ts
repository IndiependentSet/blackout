/* The admin pages, in the order the nav and the profile list them. Pure: the
   admin frame and the staff office both read it, so the list lives once. */
export const ADMIN_PAGES = [
  { id: 'pools', href: '/pools.html', label: 'Level pools', hint: 'curve, generate, play-test and publish a mode’s levels' },
  { id: 'generation', href: '/generation.html', label: 'Generation config', hint: 'the daily week’s schedule, saved from a future day' },
  { id: 'playground', href: '/playground.html', label: 'Playground', hint: 'the generator with every rule exposed' },
] as const;

export type AdminPageId = (typeof ADMIN_PAGES)[number]['id'];
