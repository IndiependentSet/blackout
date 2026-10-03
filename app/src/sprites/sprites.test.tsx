import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BREEDS } from '../assets/cats';
import { THINGS } from '../assets/things';
import { PadSprite, ThingSprite } from '.';

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
