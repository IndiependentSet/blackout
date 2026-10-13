import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BREEDS } from '../assets/cats';
import { THINGS } from '../assets/things';
import { CatFlipbook, PadSprite, ThingSprite } from '.';

const inSvg = (el: React.ReactElement) => render(<svg>{el}</svg>);

describe('PadSprite', () => {
  it('shows only the pad while empty', () => {
    const { container } = inSvg(<PadSprite breed={BREEDS[0]} hired={false} />);
    expect(container.querySelectorAll('image')).toHaveLength(0);
  });
  it('drops the cat flip-book in once hired', () => {
    const { container, getByText } = inSvg(<PadSprite breed={BREEDS[0]} hired />);
    expect(container.querySelectorAll('image')).toHaveLength(2);
    expect(getByText(BREEDS[0].name + ' — on site')).toBeInTheDocument();
  });
  it('exposes a bloom target only when asked', () => {
    expect(inSvg(<PadSprite breed={BREEDS[0]} hired={false} bloomId="bloom-3" />).container.querySelector('#bloom-3')).not.toBeNull();
    expect(inSvg(<PadSprite breed={BREEDS[0]} hired={false} />).container.querySelector('[id^="bloom"]')).toBeNull();
  });
});

describe('ThingSprite', () => {
  it('teeters while untouched and breaks once smashed', () => {
    const t = THINGS[0];
    const intact = inSvg(<ThingSprite thing={t} smashed={false} index={1} />).container;
    expect(intact.innerHTML).toContain('cc-teeter');
    const broken = inSvg(<ThingSprite thing={t} smashed index={1} />).container;
    expect(broken.innerHTML).toContain('cc-tumble');
    expect(broken.innerHTML).toContain('cc-break-3');
  });
  it('only draws the surveyor mark when marked', () => {
    const t = THINGS[0];
    expect(inSvg(<ThingSprite thing={t} smashed={false} index={0} marked={false} />).container.querySelectorAll('path[stroke-width="2.8"]')).toHaveLength(0);
    expect(inSvg(<ThingSprite thing={t} smashed={false} index={0} />).container.querySelectorAll('path[stroke-width="2.8"]')).toHaveLength(1);
  });
});

describe('CatFlipbook accessories', () => {
  const art = { wakeA: ['neck-a.png', 'head-a.png'], wakeB: ['neck-b.png', 'head-b.png'] };

  it('draws just the two cat frames without an accessory', () => {
    const { container } = inSvg(<CatFlipbook breed={BREEDS[0]} />);
    expect([...container.querySelectorAll('image')].map(i => i.getAttribute('href'))).toEqual([BREEDS[0].wakeA, BREEDS[0].wakeB]);
  });

  it('draws each accessory piece over the cat and flips it in step with its frame', () => {
    const { container } = inSvg(<CatFlipbook breed={BREEDS[0]} frameDelay={0.2} accessory={art} />);
    const imgs = [...container.querySelectorAll('image')];
    expect(imgs.map(i => i.getAttribute('href'))).toEqual([
      BREEDS[0].wakeA, 'neck-a.png', 'head-a.png', BREEDS[0].wakeB, 'neck-b.png', 'head-b.png',
    ]);
    const anim = (el: Element) => (el as SVGImageElement).style.animation;
    for (const i of [0, 1, 2]) expect(anim(imgs[i])).toContain('cc-frame-a');
    for (const i of [3, 4, 5]) expect(anim(imgs[i])).toContain('cc-frame-b');
    expect(anim(imgs[1])).toBe(anim(imgs[0]));
  });

  it('puts the accessory on the cat only once it is hired', () => {
    expect(inSvg(<PadSprite breed={BREEDS[0]} hired={false} accessory={art} />).container.querySelectorAll('image')).toHaveLength(0);
    expect(inSvg(<PadSprite breed={BREEDS[0]} hired accessory={art} />).container.querySelectorAll('image')).toHaveLength(6);
  });

  it('renders the same markup with no accessory as with an empty one', () => {
    const bare = inSvg(<CatFlipbook breed={BREEDS[0]} />).container.innerHTML;
    expect(inSvg(<CatFlipbook breed={BREEDS[0]} accessory={{ wakeA: [], wakeB: [] }} />).container.innerHTML).toBe(bare);
  });
});
