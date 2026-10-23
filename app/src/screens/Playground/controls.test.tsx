import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Num } from './controls';

function Harness({ start, min, max }: { start: number; min: number; max?: number }) {
  const [v, setV] = useState(start);
  return <><Num v={v} min={min} max={max} label="box" on={setV} /><output>{v}</output></>;
}

const box = () => screen.getByLabelText('box') as HTMLInputElement;

describe('Num', () => {
  it('can be cleared without the value snapping back', () => {
    render(<Harness start={7} min={0} />);
    fireEvent.change(box(), { target: { value: '' } });
    expect(box().value).toBe('');
    expect(screen.getByRole('status').textContent).toBe('7');
  });

  it('replaces a leading zero with what is typed', () => {
    render(<Harness start={0} min={0} />);
    fireEvent.change(box(), { target: { value: '05' } });
    expect(box().value).toBe('5');
    expect(screen.getByRole('status').textContent).toBe('5');
  });

  it('waits for an in-range number, then clamps on blur', () => {
    render(<Harness start={10} min={5} max={20} />);
    fireEvent.change(box(), { target: { value: '1' } });
    expect(box().value).toBe('1');
    expect(screen.getByRole('status').textContent).toBe('10');
    fireEvent.change(box(), { target: { value: '12' } });
    expect(screen.getByRole('status').textContent).toBe('12');
    fireEvent.change(box(), { target: { value: '1' } });
    fireEvent.blur(box());
    expect(box().value).toBe('5');
    expect(screen.getByRole('status').textContent).toBe('5');
  });

  it('puts the old value back when left empty', () => {
    render(<Harness start={3} min={1} />);
    fireEvent.change(box(), { target: { value: '' } });
    fireEvent.blur(box());
    expect(box().value).toBe('3');
  });
});
