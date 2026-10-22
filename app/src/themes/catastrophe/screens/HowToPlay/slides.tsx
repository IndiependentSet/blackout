import type { ReactNode } from 'react';
import { CrewDemo } from './demos/CrewDemo';
import { ConsultDemo, WeekDemo } from './demos/InfoDemos';
import { BudgetDemo, PathDemo, StarDemo } from './demos/LoopDemos';
import { TrainingDemo } from './demos/TrainingDemo';
import { TRAIN_K } from './training';
import styles from './HowToPlay.module.css';

export interface Slide { kicker: string; title: ReactNode; body: string; demo: ReactNode }

const pink = (t: string) => <span className={styles.pink}>{t}</span>;

/** The orientation, in order. */
export function slides(sites: readonly string[]): Slide[] {
  return [
    { kicker: 'WELCOME ABOARD', title: <>WE DEMOLISH HOUSES. {pink('WITH CATS.')}</>,
      body: 'You’re the new site manager at CATASTROPHE INC. Clients want their homes wrecked from the inside, and your crew is six deeply unprofessional cats.',
      demo: <CrewDemo /> },
    { kicker: 'LESSON 1 · PADS & PATHS', title: 'EVERY FIXTURE SITS ON A PATH.',
      body: 'Dashed paths join two deployment pads. Drop a cat on either end and whatever sits on that path is scrap.',
      demo: <PathDemo /> },
    { kicker: 'LESSON 2 · ECONOMIES OF SCALE', title: <>ONE CAT. {pink('MANY CASUALTIES.')}</>,
      body: 'A cat wrecks every path touching its pad. Busy pads are where the real damage happens.',
      demo: <StarDemo /> },
    { kicker: 'LESSON 3 · PAYROLL', title: 'HIRE THE FEWEST CATS.',
      body: 'Every site has a budget. Both of these crews flatten the room. Only one of them gets you paid.',
      demo: <BudgetDemo /> },
    { kicker: 'TRAINING SITE', title: <>YOUR TURN. <span className={styles.gold}>BUDGET: {TRAIN_K} CATS.</span></>,
      body: 'Smash all five fixtures with just two cats. There’s exactly one way to do it.',
      demo: <TrainingDemo /> },
    { kicker: 'STUCK?', title: 'CONSULT THE EXPERTS.',
      body: 'Every site has exactly one purr-fect crew, and it can always be worked out. If you can’t, three consultants are on call.',
      demo: <ConsultDemo /> },
    { kicker: 'THE DAILY INVOICE', title: <>{sites.length} SITES. {pink('ONE WORKING DAY.')}</>,
      body: 'Seven fresh sites every day, the same for every crew in the company, each one bigger than the last. Bring all seven in on budget and the invoice reads PURR-FECT.',
      demo: <WeekDemo sites={sites} /> },
  ];
}
