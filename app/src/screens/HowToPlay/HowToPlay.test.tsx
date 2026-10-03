import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SITES } from '../../domain/sites';
import HowToPlay from './HowToPlay';

const open = () => {
  const onClose = vi.fn(), onStart = vi.fn();
  render(<HowToPlay sites={SITES} onClose={onClose} onStart={onStart} />);
  return { onClose, onStart };
};

describe('the orientation slideshow', () => {
  it('starts on the welcome slide', () => {
    open();
    expect(screen.getByRole('dialog', { name: /How CATASTROPHE INC. works/ })).toBeInTheDocument();
    expect(screen.getByText('ORIENTATION · 1/7')).toBeInTheDocument();
    expect(screen.getByText('WELCOME ABOARD')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'previous slide' })).toBeDisabled();
  });

  it('steps through with the buttons and the arrow keys', async () => {
    open();
    await userEvent.click(screen.getByRole('button', { name: 'NEXT →' }));
    expect(screen.getByText('LESSON 1 · PADS & PATHS')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByText('LESSON 2 · ECONOMIES OF SCALE')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByText('LESSON 1 · PADS & PATHS')).toBeInTheDocument();
  });

  it('jumps with the dots', async () => {
    open();
    await userEvent.click(screen.getByRole('button', { name: 'slide 5' }));
    expect(screen.getByText('TRAINING SITE')).toBeInTheDocument();
  });

  it('skips with the button or Escape', async () => {
    const { onClose } = open();
    await userEvent.click(screen.getByRole('button', { name: 'skip the orientation' }));
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('finishes into the game from the last slide', async () => {
    const { onStart } = open();
    await userEvent.click(screen.getByRole('button', { name: 'slide 7' }));
    await userEvent.click(screen.getByRole('button', { name: 'CLOCK IN' }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('lets you play the training site to a purr-fect finish', async () => {
    open();
    await userEvent.click(screen.getByRole('button', { name: 'slide 5' }));
    expect(screen.getByRole('status')).toHaveTextContent('TAP A PAD TO HIRE');
    const board = screen.getByRole('img', { name: /training site/ });
    const pads = board.querySelectorAll('g[style*="cursor: pointer"]');
    expect(pads).toHaveLength(6);
    await userEvent.click(pads[2]);   // the hub
    await userEvent.click(pads[4]);   // the middle of the tail
    expect(screen.getByRole('status')).toHaveTextContent('HIRED! YOU’RE A NATURAL.');
    expect(screen.getByText('PURR-FECT!')).toBeInTheDocument();
  });
});
