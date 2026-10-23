import { useMemo } from 'react';
import { checkFigure, type FigureCheck } from '../../domain/generation';
import type { SkyFigure } from '../../domain/types';

/** What a drawing comes to, worked out again only when it changes (40 stars at most: the solver is quick). */
export const useFigureCheck = (figure: SkyFigure): FigureCheck => useMemo(() => checkFigure(figure), [figure]);
